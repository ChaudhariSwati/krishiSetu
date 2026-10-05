require('dotenv').config();
const express = require('express'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), cors = require('cors');
const app = express(); app.use(cors({ origin: process.env.CLIENT_URL || '*' })); app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'dev-secret', S = mongoose.Schema, ref = (m) => ({ type: S.Types.ObjectId, ref: m });

// ---- Database models ----
const User = mongoose.model('User', new S({ name: String, phone: { type: String, unique: true }, password: String, role: { type: String, enum: ['farmer', 'buyer'] }, village: String }));
const Listing = mongoose.model('Listing', new S({ farmer: ref('User'), crop: String, quantity: Number, pricePerKg: Number, location: String, status: { type: String, default: 'available' } }, { timestamps: true }));
const Order = mongoose.model('Order', new S({ listing: ref('Listing'), farmer: ref('User'), buyer: ref('User'), quantity: Number, note: String, status: { type: String, default: 'pending' } }, { timestamps: true }));

// ---- Helpers ----
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, phone: u.phone, role: u.role, village: u.village });
const auth = (role) => (req, res, next) => {
  try { const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    if (role && p.role !== role) return res.status(403).json({ error: 'Not allowed for your role' }); req.user = p; next();
  } catch { res.status(401).json({ error: 'Please login again' }); }
};
const wrap = (f) => (req, res) => f(req, res).catch((e) => res.status(400).json({ error: e.code === 11000 ? 'Phone already registered' : e.message }));
// phone numbers are shared only after the farmer accepts a request
const hide = (o) => { o = o.toObject(); if (o.status !== 'accepted') { delete o.farmer?.phone; delete o.buyer?.phone; } return o; };

// ---- Auth ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, phone, password, role, village } = req.body;
  if (!name || !phone || !password || !['farmer', 'buyer'].includes(role)) throw new Error('Fill all required fields');
  const u = await User.create({ name, phone, village, role, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(u), user: pub(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ phone: req.body.phone });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) throw new Error('Invalid phone or password');
  res.json({ token: sign(u), user: pub(u) });
}));

// ---- Produce listings ----
app.get('/api/listings', wrap(async (req, res) => res.json(await Listing.find({ status: 'available' }).populate('farmer', 'name village').sort('-createdAt'))));
app.get('/api/listings/mine', auth('farmer'), wrap(async (req, res) => res.json(await Listing.find({ farmer: req.user.id }).sort('-createdAt'))));
app.post('/api/listings', auth('farmer'), wrap(async (req, res) => {
  const { crop, quantity, pricePerKg, location } = req.body;
  if (!crop || !(quantity > 0) || !(pricePerKg > 0)) throw new Error('Crop, quantity and price are required');
  res.json(await Listing.create({ crop, quantity, pricePerKg, location, farmer: req.user.id }));
}));
app.delete('/api/listings/:id', auth('farmer'), wrap(async (req, res) => { await Listing.deleteOne({ _id: req.params.id, farmer: req.user.id }); res.json({ ok: true }); }));

// ---- Farmer-buyer interaction: buyer requests, farmer accepts / rejects ----
app.post('/api/orders', auth('buyer'), wrap(async (req, res) => {
  const l = await Listing.findById(req.body.listingId); const q = Number(req.body.quantity);
  if (!l || l.status !== 'available') throw new Error('Listing not available');
  if (!(q > 0) || q > l.quantity) throw new Error('Quantity must be between 1 and ' + l.quantity);
  res.json(await Order.create({ listing: l._id, farmer: l.farmer, buyer: req.user.id, quantity: q, note: req.body.note }));
}));
app.get('/api/orders', auth(), wrap(async (req, res) => {
  const f = req.user.role === 'farmer' ? { farmer: req.user.id } : { buyer: req.user.id };
  const list = await Order.find(f).populate('listing', 'crop pricePerKg').populate('farmer', 'name phone village').populate('buyer', 'name phone').sort('-createdAt');
  res.json(list.map(hide));
}));
app.patch('/api/orders/:id', auth('farmer'), wrap(async (req, res) => {
  if (!['accepted', 'rejected'].includes(req.body.status)) throw new Error('Invalid status');
  const o = await Order.findOneAndUpdate({ _id: req.params.id, farmer: req.user.id, status: 'pending' }, { status: req.body.status }, { new: true });
  if (!o) throw new Error('Request not found or already handled');
  if (o.status === 'accepted') await Listing.updateOne({ _id: o.listing }, { $inc: { quantity: -o.quantity } });
  res.json(o);
}));

app.get('/', (req, res) => res.send('KrishiSetu API running'));
mongoose.connect(process.env.MONGO_URI).then(() => app.listen(process.env.PORT || 5000, () => console.log('API + DB connected'))).catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });

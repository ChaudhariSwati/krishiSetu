// Demo data: run AFTER the server is running ->  npm run seed
const API = process.env.API || 'http://localhost:5000';
const call = async (path, body, token) => { const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: JSON.stringify(body) }); return r.json(); };
const account = async (u) => { let d = await call('/api/auth/register', u); if (d.error) d = await call('/api/auth/login', u); return d; };
(async () => {
  const farmers = [{ name: 'Ramesh Patil', phone: '9000000001', password: 'demo123', role: 'farmer', village: 'Nagpur' }, { name: 'Sunita Deshmukh', phone: '9000000002', password: 'demo123', role: 'farmer', village: 'Wardha' }];
  const crops = [[['Tomato', 500, 22, 'Nagpur'], ['Onion', 800, 18, 'Nagpur']], [['Orange', 300, 40, 'Wardha'], ['Wheat', 1000, 26, 'Wardha']]];
  for (let i = 0; i < farmers.length; i++) { const f = await account(farmers[i]); for (const [crop, quantity, pricePerKg, location] of crops[i]) await call('/api/listings', { crop, quantity, pricePerKg, location }, f.token); }
  await account({ name: 'Anil Traders', phone: '9000000003', password: 'demo123', role: 'buyer', village: 'Pune' });
  console.log('Seeded. Farmer login: 9000000001 / demo123   Buyer login: 9000000003 / demo123');
})();

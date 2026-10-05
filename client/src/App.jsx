import { useState, useEffect, useCallback } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
async function api(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Something went wrong'); return d;
}
function useApi(path, token) {
  const [d, setD] = useState([]), [err, setErr] = useState('');
  const load = useCallback(() => {
    setErr('');
    return api(path, { token }).then(setD).catch((e) => { setErr(e.message); });
  }, [path, token]);
  useEffect(() => { load(); }, [load]); return [d, load, err];
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'), [f, setF] = useState({ role: 'farmer' }), [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => { try { setErr(''); onAuth(await api('/api/auth/' + mode, { method: 'POST', body: f })); } catch (e) { setErr(e.message); } };
  return (<div className="card auth"><h2>🌾 KrishiSetu</h2><p>{mode === 'login' ? 'Login to continue' : 'Create your account'}</p>
    {mode === 'register' && <><input placeholder="Full name" onChange={set('name')} /><input placeholder="Village / City" onChange={set('village')} />
      <select value={f.role} onChange={set('role')}><option value="farmer">I am a Farmer</option><option value="buyer">I am a Buyer</option></select></>}
    <input placeholder="Phone number" onChange={set('phone')} /><input type="password" placeholder="Password" onChange={set('password')} />
    {err && <p className="err">{err}</p>}<button className="btn" onClick={submit}>{mode === 'login' ? 'Login' : 'Register'}</button>
    <p><a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'New here? Register' : 'Have an account? Login'}</a></p></div>);
}

function Market({ token, farmer }) {
  const [list, reload, err] = useApi('/api/listings', token), [q, setQ] = useState(''), [qty, setQty] = useState({}), [msg, setMsg] = useState('');
  const request = async (l) => { try { await api('/api/orders', { method: 'POST', token, body: { listingId: l._id, quantity: qty[l._id] || 1 } }); setMsg('✅ Request sent to ' + l.farmer.name + '. Track it in My Requests.'); } catch (e) { setMsg('❌ ' + e.message); } };
  return (<div><div className="row"><h2>Marketplace</h2><button className="btn" onClick={reload}>Refresh</button></div><input placeholder="Search crop..." value={q} onChange={(e) => setQ(e.target.value)} />{msg && <p>{msg}</p>}{err && <p className="err">Unable to load marketplace: {err} <button className="btn" onClick={reload}>Retry</button></p>}
    <div className="grid">{list.filter((l) => l.crop.toLowerCase().includes(q.toLowerCase())).map((l) => (
      <div className="card" key={l._id}><h3>{l.crop}</h3><p>₹{l.pricePerKg}/kg · {l.quantity} kg available</p><p>👨‍🌾 {l.farmer?.name} · 📍 {l.location || l.farmer?.village}</p>
        {!farmer && <div className="row"><input type="number" min="1" max={l.quantity} placeholder="Qty (kg)" style={{ width: 110 }} onChange={(e) => setQty({ ...qty, [l._id]: e.target.value })} /><button className="btn" onClick={() => request(l)}>Request to buy</button></div>}</div>))}
    </div>{!list.length && <p>No produce listed yet.</p>}</div>);
}

function Orders({ token, farmer, onBrowse }) {
  const [orders, load, err] = useApi('/api/orders', token), [actionErr, setActionErr] = useState('');
  const act = async (id, status) => { try { setActionErr(''); await api('/api/orders/' + id, { method: 'PATCH', token, body: { status } }); await load(); } catch (e) { setActionErr(e.message); } };
  return (<div><div className="row"><h2>{farmer ? 'Buyer requests' : 'My requests'}</h2><button className="btn" onClick={load}>Refresh</button>{!farmer && <button className="btn" onClick={onBrowse}>+ Create new request</button>}</div>{!farmer && <p>To create a request, browse available produce and click <b>Request to buy</b>.</p>}{err && <p className="err">Unable to load requests: {err} <button className="btn" onClick={load}>Retry</button></p>}{actionErr && <p className="err">{actionErr}</p>}{!orders.length && !err && <p>No requests yet.</p>}
    {orders.map((o) => (<div className="card" key={o._id}><b>{o.listing?.crop}</b> · {o.quantity} kg · ₹{o.listing?.pricePerKg}/kg <span className={'tag ' + o.status}>{o.status}</span>
      <p>{farmer ? '🛒 Buyer: ' + o.buyer?.name : '👨‍🌾 Farmer: ' + o.farmer?.name}{o.status === 'accepted' && ' · 📞 ' + (farmer ? o.buyer?.phone : o.farmer?.phone)}</p>
      {farmer && o.status === 'pending' && <div className="row"><button className="btn" onClick={() => act(o._id, 'accepted')}>Accept</button><button className="btn red" onClick={() => act(o._id, 'rejected')}>Reject</button></div>}</div>))}</div>);
}

function Dashboard({ token }) {
  const [mine, reload, listingsErr] = useApi('/api/listings/mine', token), [orders, reloadOrders, ordersErr] = useApi('/api/orders', token), [f, setF] = useState({}), [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async () => { try { setErr(''); await api('/api/listings', { method: 'POST', token, body: { ...f, quantity: +f.quantity, pricePerKg: +f.pricePerKg } }); setF({}); reload(); } catch (e) { setErr(e.message); } };
  const del = async (id) => { await api('/api/listings/' + id, { method: 'DELETE', token }); reload(); };
  return (<div><div className="row"><h2>Farmer Dashboard</h2><button className="btn" onClick={() => { reload(); reloadOrders(); }}>Refresh</button></div>{(listingsErr || ordersErr) && <p className="err">Unable to refresh dashboard data. <button className="btn" onClick={() => { reload(); reloadOrders(); }}>Retry</button></p>}
    <div className="stats"><div><b>{mine.length}</b>Active listings</div><div><b>{orders.filter((o) => o.status === 'pending').length}</b>Pending requests</div><div><b>{orders.filter((o) => o.status === 'accepted').length}</b>Accepted deals</div></div>
    <div className="card"><h3>List your produce</h3><div className="row"><input placeholder="Crop (e.g. Tomato)" value={f.crop || ''} onChange={set('crop')} /><input type="number" placeholder="Quantity (kg)" value={f.quantity || ''} onChange={set('quantity')} /><input type="number" placeholder="Price per kg (₹)" value={f.pricePerKg || ''} onChange={set('pricePerKg')} /><input placeholder="Location" value={f.location || ''} onChange={set('location')} /></div>
      {err && <p className="err">{err}</p>}<button className="btn" onClick={add}>+ Add listing</button></div>
    <h3>My listings</h3><div className="grid">{mine.map((l) => (<div className="card" key={l._id}><b>{l.crop}</b><p>{l.quantity} kg · ₹{l.pricePerKg}/kg</p><button className="btn red" onClick={() => del(l._id)}>Delete</button></div>))}</div>
    <Orders token={token} farmer /></div>);
}

export default function App() {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('ks') || 'null')), [tab, setTab] = useState('start');
  const login = (a) => { localStorage.setItem('ks', JSON.stringify(a)); setAuth(a); setTab('start'); };
  const logout = () => { localStorage.removeItem('ks'); setAuth(null); };
  if (!auth) return <Auth onAuth={login} />;
  const { user, token } = auth, farmer = user.role === 'farmer', cur = tab === 'start' ? (farmer ? 'dash' : 'market') : tab;
  const tabs = farmer ? [['dash', 'Dashboard'], ['market', 'Marketplace']] : [['market', 'Marketplace'], ['orders', 'My Requests']];
  return (<div><nav><b>🌾 KrishiSetu</b>{tabs.map(([k, n]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}<span>{user.name} ({user.role})</span><button onClick={logout}>Logout</button></nav>
    <main>{cur === 'dash' && <Dashboard token={token} />}{cur === 'market' && <Market token={token} farmer={farmer} />}{cur === 'orders' && <Orders token={token} farmer={false} onBrowse={() => setTab('market')} />}</main></div>);
}

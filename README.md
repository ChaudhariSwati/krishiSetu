# KrishiSetu – basic prototype (React + Node/Express + MongoDB)
Features: farmer/buyer registration & login, farmer dashboard, produce listing, marketplace, buyer view, buyer request -> farmer accept/reject (phone numbers revealed after acceptance).

## Run locally
1. Create a free MongoDB Atlas cluster, copy the connection string.
2. `cd server && cp .env.example .env` (paste MONGO_URI, set JWT_SECRET) -> `npm install && npm start`
3. `cd client && cp .env.example .env && npm install && npm run dev` -> open http://localhost:5173

## Deploy
- API: deploy `server/` on Render (Web Service, start command `npm start`, add env vars MONGO_URI, JWT_SECRET, CLIENT_URL=<your vercel url>). In Atlas > Network Access, allow 0.0.0.0/0.
- Client: deploy `client/` on Vercel (root directory `client`, framework Vite) with env var VITE_API_URL=<your Render API url>.

## Fastest demo (no deployment needed)
1. Start the server, then in another terminal: `cd server && npm run seed`
2. Record your screen on http://localhost:5173
   - Login as Farmer 9000000001 / demo123 -> dashboard -> add a listing
   - Login as Buyer 9000000003 / demo123 -> marketplace -> Request to buy
   - Back to Farmer -> Accept (phone numbers appear)

## Future scope (planned, not in prototype)
AI demand forecasting, route-optimized logistics, SMS/IVR for basic phones, multilingual UI, UPI payments, mandi price integration, e-NAM integration.

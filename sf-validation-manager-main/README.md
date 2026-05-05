# SF Validation Manager
### CloudVandana — Associate Software Engineer Assignment #1

---

## HOW TO RUN (Node v22 compatible — uses Vite)

### STEP 1 — Open in VS Code
Extract ZIP → VS Code → File → Open Folder → select `sf-validation-manager`

### STEP 2 — Open Terminal in VS Code
Press Ctrl + backtick (key below Escape)

### STEP 3 — Install packages
```
npm install
cd server
npm install
cd ..
```

### STEP 4 — Create .env file
```
copy server\.env.example server\.env
```
Open `server\.env` and fill in:
```
SF_CLIENT_ID=your_consumer_key
SF_CLIENT_SECRET=your_consumer_secret
SF_CALLBACK_URL=http://localhost:5000/auth/callback
SESSION_SECRET=anyrandomstring123
PORT=5000
```

### STEP 5 — Run (TWO terminals)

Click + to open Terminal 1:
```
cd server
node index.js
```

Click + to open Terminal 2:
```
npm run dev
```

Open browser → http://localhost:3000

---

## Salesforce Setup

1. Sign up → https://developer.salesforce.com/signup
2. Create 5 validation rules on Account object (Setup → Object Manager → Account → Validation Rules)
3. Create Connected App (Setup → App Manager → New Connected App)
   - Enable OAuth Settings
   - Callback URL: http://localhost:5000/auth/callback
   - Scopes: api + refresh_token
   - Copy Consumer Key → SF_CLIENT_ID
   - Copy Consumer Secret → SF_CLIENT_SECRET

---

## Troubleshooting
- `localhost refused` → backend or frontend not started yet
- `invalid_client` → wrong Consumer Key/Secret in .env
- `redirect_uri_mismatch` → callback URL must match exactly
- Connected App not working → wait 10 minutes after creating it

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// ─── PKCE Helpers ─────────────────────────────────────────────────────────────
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
//app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || "changeme_supersecret",
  resave: false,
  saveUninitialized: false,
 // cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
 cookie: {
  secure: true,
  httpOnly: true,
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000
}
}));

// ─── OAuth 2.0 + PKCE Routes ──────────────────────────────────────────────────

// Step 1: Redirect user to Salesforce login with PKCE
app.get("/auth/login", (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  req.session.codeVerifier = codeVerifier;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SF_CLIENT_ID,
    redirect_uri: process.env.SF_CALLBACK_URL,
    scope: "api refresh_token",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  const sfLoginUrl = `https://login.salesforce.com/services/oauth2/authorize?${params}`;
  res.redirect(sfLoginUrl);
});

// Step 2: Exchange auth code for tokens
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "No auth code received" });

  try {
    const tokenParams = {
      grant_type: "authorization_code",
      client_id: process.env.SF_CLIENT_ID,
      redirect_uri: process.env.SF_CALLBACK_URL,
      code,
    };

    // Add PKCE verifier if available
    if (req.session.codeVerifier) {
      tokenParams.code_verifier = req.session.codeVerifier;
    }

    // Add client secret if available
    if (process.env.SF_CLIENT_SECRET) {
      tokenParams.client_secret = process.env.SF_CLIENT_SECRET;
    }

    const tokenRes = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      new URLSearchParams(tokenParams),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, instance_url, refresh_token } = tokenRes.data;
    req.session.access_token = access_token;
    req.session.instance_url = instance_url;
    req.session.refresh_token = refresh_token;
    delete req.session.codeVerifier;

   // res.redirect("http://localhost:3000?login=success");
   res.redirect(process.env.FRONTEND_URL + "?login=success");
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
  //  res.redirect("http://localhost:3000?login=error");
  res.redirect(process.env.FRONTEND_URL + "?login=success");
  }
});

// Check auth status
app.get("/auth/status", (req, res) => {
  if (req.session.access_token) {
    res.json({ authenticated: true, instance_url: req.session.instance_url });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ─── Salesforce API Helper ────────────────────────────────────────────────────
function sfRequest(req) {
  return axios.create({
    baseURL: req.session.instance_url,
    headers: {
      Authorization: `Bearer ${req.session.access_token}`,
      "Content-Type": "application/json",
    },
  });
}

function requireAuth(req, res, next) {
  if (!req.session.access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// ─── Validation Rules Routes ──────────────────────────────────────────────────

// GET all validation rules for Account object using Tooling API
app.get("/api/validation-rules", requireAuth, async (req, res) => {
  try {
    const sf = sfRequest(req);
    const query = encodeURIComponent(
      `SELECT Id, ValidationName, Active, Description, ErrorMessage, ErrorDisplayField, EntityDefinition.QualifiedApiName 
       FROM ValidationRule 
       WHERE EntityDefinition.QualifiedApiName = 'Account'`
    );
    const response = await sf.get(`/services/data/v59.0/tooling/query?q=${query}`);
    const rules = response.data.records.map((r) => ({
      id: r.Id,
      name: r.ValidationName,
      active: r.Active,
      description: r.Description || "",
      errorMessage: r.ErrorMessage || "",
      errorDisplayField: r.ErrorDisplayField || "",
      object: r.EntityDefinition?.QualifiedApiName || "Account",
    }));
    res.json({ rules });
  } catch (err) {
    console.error("Fetch validation rules error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch validation rules", details: err.response?.data });
  }
});

// PATCH a single validation rule
app.patch("/api/validation-rules/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  try {
    const sf = sfRequest(req);
    await sf.patch(`/services/data/v59.0/tooling/sobjects/ValidationRule/${id}`, { Active: active });
    res.json({ success: true, id, active });
  } catch (err) {
    console.error("Update rule error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to update rule", details: err.response?.data });
  }
});

// PATCH multiple validation rules
app.patch("/api/validation-rules", requireAuth, async (req, res) => {
  const { rules } = req.body;
  try {
    const sf = sfRequest(req);
    const results = await Promise.allSettled(
      rules.map(({ id, active }) =>
        sf.patch(`/services/data/v59.0/tooling/sobjects/ValidationRule/${id}`, { Active: active })
      )
    );
    const summary = results.map((r, i) => ({
      id: rules[i].id,
      success: r.status === "fulfilled",
      error: r.reason?.response?.data || null,
    }));
    res.json({ results: summary });
  } catch (err) {
    console.error("Bulk update error:", err.response?.data || err.message);
    res.status(500).json({ error: "Bulk update failed" });
  }
});

// POST deploy
app.post("/api/deploy", requireAuth, async (req, res) => {
  const { rules } = req.body;
  try {
    const sf = sfRequest(req);
    const results = await Promise.allSettled(
      rules.map(({ id, active }) =>
        sf.patch(`/services/data/v59.0/tooling/sobjects/ValidationRule/${id}`, { Active: active })
      )
    );
    const deployed = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    res.json({ success: true, deployed, failed, total: rules.length, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Deploy error:", err.response?.data || err.message);
    res.status(500).json({ error: "Deploy failed" });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 SF Validation Manager Server running on http://localhost:${PORT}\n`);
});

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({ baseURL: "/", withCredentials: true });

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconCloud = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconDeploy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Validation Rule Card ─────────────────────────────────────────────────────
function RuleCard({ rule, onToggle, pending }) {
  return (
    <div className={`rule-card ${rule.active ? "rule-active" : "rule-inactive"} ${pending ? "rule-pending" : ""}`}>
      <div className="rule-header">
        <div className="rule-name-row">
          <IconShield />
          <span className="rule-name">{rule.name}</span>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={rule.active}
            onChange={() => onToggle(rule.id, !rule.active)}
            disabled={pending}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      <div className="rule-status">
        <span className={`status-badge ${rule.active ? "badge-active" : "badge-inactive"}`}>
          {rule.active ? <><IconCheck /> Active</> : "Inactive"}
        </span>
        {pending && <span className="badge-pending">Saving…</span>}
      </div>
      {rule.description && <p className="rule-desc">{rule.description}</p>}
      {rule.errorMessage && (
        <div className="rule-error-msg">
          <span className="error-label">Error:</span> {rule.errorMessage}
        </div>
      )}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  return (
    <div className="login-screen">
      <div className="login-glow"></div>
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-ring">
            <IconCloud />
          </div>
        </div>
        <h1 className="login-title">SF Validation Manager</h1>
        <p className="login-sub">
          Connect to your Salesforce org and manage Account validation rules with ease.
        </p>
        <button className="btn-login" onClick={onLogin}>
          <IconCloud />
          Connect to Salesforce
        </button>
        <p className="login-note">Uses OAuth 2.0 — your credentials stay with Salesforce</p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState({ checked: false, authenticated: false, instance_url: null });
  const [rules, setRules] = useState([]);
  const [originalRules, setOriginalRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // Check auth on mount / after redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "success") {
      window.history.replaceState({}, "", "/");
      addToast("Connected to Salesforce!", "success");
    } else if (params.get("login") === "error") {
      window.history.replaceState({}, "", "/");
      addToast("Login failed. Check your Connected App settings.", "error");
    }
    checkAuth();
  }, []); // eslint-disable-line

  const checkAuth = async () => {
    try {
      const { data } = await api.get("/auth/status");
      setAuth({ checked: true, ...data });
    } catch {
      setAuth({ checked: true, authenticated: false });
    }
  };

  const handleLogin = () => {
    window.location.href = "/auth/login";
  };

  const handleLogout = async () => {
    await api.post("/auth/logout");
    setAuth({ checked: true, authenticated: false });
    setRules([]);
    setOriginalRules([]);
    setDeployResult(null);
    addToast("Logged out successfully.", "info");
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/validation-rules");
      setRules(data.rules);
      setOriginalRules(JSON.parse(JSON.stringify(data.rules)));
      setDeployResult(null);
      addToast(`Fetched ${data.rules.length} validation rules.`, "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to fetch rules.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (id, newActive) => {
    // Optimistic update
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: newActive } : r)));
    setPendingIds((s) => new Set([...s, id]));
    try {
      await api.patch(`/api/validation-rules/${id}`, { active: newActive });
      addToast(`Rule ${newActive ? "activated" : "deactivated"}.`, "success");
    } catch {
      // Revert
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !newActive } : r)));
      addToast("Failed to update rule.", "error");
    } finally {
      setPendingIds((s) => { const ns = new Set(s); ns.delete(id); return ns; });
    }
  };

  const toggleAll = async (activate) => {
    const updated = rules.map((r) => ({ ...r, active: activate }));
    setRules(updated);
    try {
      await api.patch("/api/validation-rules", {
        rules: updated.map(({ id, active }) => ({ id, active })),
      });
      addToast(`All rules ${activate ? "activated" : "deactivated"}.`, "success");
    } catch {
      setRules(rules); // revert
      addToast("Bulk update failed.", "error");
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const { data } = await api.post("/api/deploy", {
        rules: rules.map(({ id, active }) => ({ id, active })),
      });
      setDeployResult(data);
      setOriginalRules(JSON.parse(JSON.stringify(rules)));
      addToast(`Deployed ${data.deployed}/${data.total} rules successfully.`, "success");
    } catch {
      addToast("Deploy failed.", "error");
    } finally {
      setDeploying(false);
    }
  };

  const hasPendingChanges = JSON.stringify(rules.map(r => ({ id: r.id, active: r.active }))) !==
    JSON.stringify(originalRules.map(r => ({ id: r.id, active: r.active })));

  // ─── Render ────────────────────────────────────────────────────────────────
  if (!auth.checked) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  if (!auth.authenticated) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toast toasts={toasts} />
      </>
    );
  }

  const activeCount = rules.filter((r) => r.active).length;

  return (
    <div className="app">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo"><IconCloud /></div>
          <div>
            <h1 className="header-title">SF Validation Manager</h1>
            <span className="header-org">{auth.instance_url}</span>
          </div>
        </div>
        <button className="btn-ghost btn-sm" onClick={handleLogout}>
          <IconLogout /> Logout
        </button>
      </header>

      {/* Controls */}
      <div className="controls-bar">
        <button className="btn-primary" onClick={fetchRules} disabled={loading}>
          <IconRefresh /> {loading ? "Fetching…" : "Get Validation Rules"}
        </button>

        {rules.length > 0 && (
          <>
            <button className="btn-outline btn-sm" onClick={() => toggleAll(true)}>
              Enable All
            </button>
            <button className="btn-outline btn-sm" onClick={() => toggleAll(false)}>
              Disable All
            </button>
            <button
              className={`btn-deploy ${hasPendingChanges ? "btn-deploy-active" : ""}`}
              onClick={handleDeploy}
              disabled={deploying || !hasPendingChanges}
            >
              <IconDeploy />
              {deploying ? "Deploying…" : "Deploy to Salesforce"}
            </button>
          </>
        )}
      </div>

      {/* Stats Bar */}
      {rules.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-num">{rules.length}</span>
            <span className="stat-label">Total Rules</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num stat-active">{activeCount}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num stat-inactive">{rules.length - activeCount}</span>
            <span className="stat-label">Inactive</span>
          </div>
          {deployResult && (
            <>
              <div className="stat-divider" />
              <div className="stat-item stat-deploy-result">
                <span className="stat-num">{deployResult.deployed}/{deployResult.total}</span>
                <span className="stat-label">Last Deploy</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Rules Grid */}
      <main className="rules-grid">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Fetching from Salesforce…</p>
          </div>
        )}
        {!loading && rules.length === 0 && (
          <div className="empty-state">
            <IconShield />
            <p>Click <strong>Get Validation Rules</strong> to load Account validation rules from your org.</p>
          </div>
        )}
        {!loading && rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onToggle={toggleRule}
            pending={pendingIds.has(rule.id)}
          />
        ))}
      </main>
    </div>
  );
}

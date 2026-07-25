import React, { useState, useEffect } from "react";
import { Key, Plus, Trash2, Shield, Copy, Check, Terminal } from "lucide-react";

export default function ApiKeysTab({ token, apiBase }) {
  const [keys, setKeys] = useState([]);
  const [keyName, setKeyName] = useState("");
  const [newSecretKey, setNewSecretKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchKeys();
  }, [token]);

  async function fetchKeys() {
    try {
      const res = await fetch(`${apiBase}/api/keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setKeys(data.keys);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateKey(e) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/api/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: keyName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate key");

      setNewSecretKey(data);
      setKeyName("");
      fetchKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeKey(id) {
    if (!window.confirm("Are you sure you want to revoke this API key? Applications using it will lose access immediately.")) return;

    try {
      const res = await fetch(`${apiBase}/api/keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchKeys();
    } catch (err) {
      console.error(err);
    }
  }

  function copySecret() {
    if (!newSecretKey) return;
    navigator.clipboard.writeText(newSecretKey.secret_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
        <Shield size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
        <h3>Sign in to manage Developer API Keys</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Generate secret keys to shorten links programmatically via HTTP requests.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Key size={20} color="var(--accent-primary)" /> Developer API Keys
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Manage Bearer secret tokens for REST API integration</p>
        </div>
      </div>

      {error && <div style={{ color: "var(--accent-danger)", fontSize: "0.9rem", marginBottom: "16px" }}>{error}</div>}

      {/* Secret Key Modal Warning */}
      {newSecretKey && (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--accent-success)", padding: "20px", borderRadius: "12px", marginBottom: "24px" }}>
          <h4 style={{ color: "var(--accent-success)", marginBottom: "8px" }}>Secret API Key Generated!</h4>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
            {newSecretKey.warning}
          </p>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <code style={{ background: "#000", padding: "10px 14px", borderRadius: "6px", fontSize: "0.95rem", color: "#10b981", flex: 1, fontFamily: "monospace" }}>
              {newSecretKey.secret_key}
            </code>
            <button className="btn-primary" onClick={copySecret}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Secret Key</>}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <form onSubmit={handleCreateKey} style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
        <input
          className="form-input"
          placeholder="Key Name (e.g. Production Mobile App)"
          required
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
        />
        <button type="submit" className="btn-primary" style={{ whiteSpace: "nowrap" }} disabled={loading}>
          <Plus size={16} /> Generate Secret Key
        </button>
      </form>

      {/* Active Keys Table */}
      <h4 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "12px" }}>Active API Keys</h4>
      <table className="custom-table" style={{ marginBottom: "32px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Prefix</th>
            <th>Last Used</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textTransform: "none", color: "var(--text-muted)", textAlign: "center" }}>
                No active API keys found.
              </td>
            </tr>
          ) : (
            keys.map((k) => (
              <tr key={k.id}>
                <td><strong>{k.name}</strong></td>
                <td><code>{k.key_prefix}...</code></td>
                <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</td>
                <td>{new Date(k.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-danger" onClick={() => handleRevokeKey(k.id)}>
                    <Trash2 size={14} /> Revoke
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Code Snippet Documentation */}
      <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
        <h4 style={{ fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Terminal size={16} /> Quick API Usage Example (cURL)
        </h4>
        <pre style={{ background: "#090d16", padding: "14px", borderRadius: "8px", color: "#60a5fa", fontSize: "0.85rem", overflowX: "auto" }}>
{`curl -X POST "${apiBase}/api/v1/links" \\
  -H "Authorization: Bearer sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/promo", "alias": "my-promo"}'`}
        </pre>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import EditLinkModal from "./components/EditLinkModal";
import AnalyticsTab from "./components/AnalyticsTab";
import QrCodeTab from "./components/QrCodeTab";
import BulkCsvTab from "./components/BulkCsvTab";
import { Link2, BarChart2, QrCode, FileText, Copy, Check, Edit2, ExternalLink, Plus } from "lucide-react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:5000"
      : "");

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  // Link shorten form state
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Dashboard Data
  const [links, setLinks] = useState([]);
  const [summary, setSummary] = useState({ total_links: 0, total_clicks: 0, total_qr_scans: 0 });

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
    loadDashboard();
  }, [token]);

  async function fetchUserProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        localStorage.removeItem("token");
        setToken("");
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }

  async function loadDashboard() {
    try {
      const summaryRes = await fetch(`${API_BASE}/api/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      if (token) {
        const linksRes = await fetch(`${API_BASE}/api/my-links`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (linksRes.ok) {
          const linksData = await linksRes.json();
          setLinks(linksData.links);
          return;
        }
      }

      const publicLinksRes = await fetch(`${API_BASE}/api/links`);
      if (publicLinksRes.ok) {
        const data = await publicLinksRes.json();
        setLinks(data.links);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleShorten(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setCreatedResult(null);

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/shorten`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url: url.trim(),
          alias: alias.trim() || undefined,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          is_private: isPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create short link");

      setCreatedResult(data);
      setUrl("");
      setAlias("");
      setExpiresAt("");
      setIsPrivate(false);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLinkEdit(linkId, updateData) {
    const res = await fetch(`${API_BASE}/api/links/${linkId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update link");
    loadDashboard();
  }

  async function handleDeleteLink(linkId) {
    const res = await fetch(`${API_BASE}/api/links/${linkId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete link");
    loadDashboard();
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    loadDashboard();
  }

  function copyToClipboard(shortUrl, code) {
    navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  }

  return (
    <main className="app-shell">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
          <Link2 size={16} /> Link Dashboard
        </button>
        <button className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>
          <BarChart2 size={16} /> Click Analytics
        </button>
        <button className={`tab-btn ${activeTab === "qr" ? "active" : ""}`} onClick={() => setActiveTab("qr")}>
          <QrCode size={16} /> Custom QR Studio
        </button>
        <button className={`tab-btn ${activeTab === "bulk" ? "active" : ""}`} onClick={() => setActiveTab("bulk")}>
          <FileText size={16} /> Bulk CSV Import
        </button>
      </nav>

      {/* Summary KPI Strip */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Link2 size={24} /></div>
          <div>
            <div className="stat-value">{summary.total_links}</div>
            <div className="stat-label">Total Short Links</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <div className="stat-value">{summary.total_clicks}</div>
            <div className="stat-label">Total Link Clicks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.1)" }}>
            <QrCode size={24} />
          </div>
          <div>
            <div className="stat-value">{summary.total_qr_scans || 0}</div>
            <div className="stat-label">Dedicated QR Scans</div>
          </div>
        </div>
      </section>

      {/* TAB CONTENT: Link Dashboard */}
      {activeTab === "dashboard" && (
        <>
          {/* Create Short Link Form */}
          <div className="glass-panel">
            <h2 className="panel-title" style={{ marginBottom: "16px" }}>Shorten a New Destination URL</h2>
            {error && <div style={{ color: "var(--accent-danger)", fontSize: "0.9rem", marginBottom: "16px" }}>{error}</div>}

            <form onSubmit={handleShorten}>
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr auto", gap: "16px", alignItems: "end" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Destination Long URL</label>
                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://example.com/long/campaign/url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Custom Alias (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="my-brand-link"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ height: "46px" }}>
                  <Plus size={16} /> {loading ? "Shortening..." : "Shorten URL"}
                </button>
              </div>

              {/* Advanced Link Options */}
              <div style={{ display: "flex", gap: "24px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>Expires At:</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    style={{ padding: "6px 10px", width: "auto", fontSize: "0.85rem" }}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  /> Private Link
                </label>
              </div>
            </form>

            {/* Created Result Banner */}
            {createdResult && (
              <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid var(--accent-primary)", padding: "16px", borderRadius: "10px", marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Your Short Link is Ready:</div>
                  <a href={createdResult.short_url} target="_blank" rel="noreferrer" style={{ fontSize: "1.1rem", fontWeight: "700", color: "#60a5fa", textDecoration: "none" }}>
                    {createdResult.short_url}
                  </a>
                </div>
                <button className="btn-primary" onClick={() => copyToClipboard(createdResult.short_url, createdResult.short_code)}>
                  {copiedCode === createdResult.short_code ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
                </button>
              </div>
            )}
          </div>

          {/* Links Management Table */}
          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">{user ? "Your Managed Short Links" : "Recent Short Links"}</h2>
              <button className="btn-secondary" onClick={loadDashboard}>Refresh List</button>
            </div>

            <table className="custom-table">
              <thead>
                <tr>
                  <th>Short Code</th>
                  <th>Destination URL</th>
                  <th>Clicks</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                      No links found. Create your first link above!
                    </td>
                  </tr>
                ) : (
                  links.map((link) => (
                    <tr key={link.short_code}>
                      <td>
                        <strong style={{ color: "#3b82f6" }}>/{link.short_code}</strong>
                      </td>
                      <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <a href={link.original_url} target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)" }}>
                          {link.original_url}
                        </a>
                      </td>
                      <td>
                        <strong>{link.clicks}</strong> clicks
                      </td>
                      <td>
                        <span className={`status-badge ${link.is_active !== false ? "active" : "disabled"}`}>
                          {link.is_active !== false ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : "Never"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                            onClick={() => copyToClipboard(link.short_url, link.short_code)}
                          >
                            {copiedCode === link.short_code ? <Check size={14} /> : <Copy size={14} />}
                          </button>

                          {token && (
                            <button
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                              onClick={() => setEditingLink(link)}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          <a
                            href={link.short_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem", color: "var(--text-primary)" }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB CONTENT: Analytics */}
      {activeTab === "analytics" && <AnalyticsTab links={links} token={token} apiBase={API_BASE} />}

      {/* TAB CONTENT: QR Code Studio */}
      {activeTab === "qr" && <QrCodeTab links={links} apiBase={API_BASE} />}

      {/* TAB CONTENT: Bulk CSV */}
      {activeTab === "bulk" && <BulkCsvTab token={token} apiBase={API_BASE} onLinksCreated={loadDashboard} />}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u, t) => {
          setUser(u);
          setToken(t);
        }}
        apiBase={API_BASE}
      />

      <EditLinkModal
        link={editingLink}
        isOpen={Boolean(editingLink)}
        onClose={() => setEditingLink(null)}
        onSave={handleSaveLinkEdit}
        onDelete={handleDeleteLink}
      />
    </main>
  );
}

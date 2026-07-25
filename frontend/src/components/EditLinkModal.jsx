import React, { useState } from "react";
import { X, Save, Trash2, Pause, Play, Calendar, Globe, AlertTriangle } from "lucide-react";

export default function EditLinkModal({ link, isOpen, onClose, onSave, onDelete }) {
  if (!isOpen || !link) return null;

  const [originalUrl, setOriginalUrl] = useState(link.original_url || "");
  const [isActive, setIsActive] = useState(link.is_active !== false);
  const [isPrivate, setIsPrivate] = useState(Boolean(link.is_private));
  const [expiresAt, setExpiresAt] = useState(link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onSave(link.id, {
        original_url: originalUrl,
        is_active: isActive,
        is_private: isPrivate,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update link");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete short link '${link.short_code}'?`)) return;
    setLoading(true);
    try {
      await onDelete(link.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: "550px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 className="panel-title">Manage Short Link (/{link.short_code})</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {error && <div style={{ color: "var(--accent-danger)", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Destination URL</label>
            <input
              className="form-input"
              type="url"
              required
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div className="form-group">
              <label>Status</label>
              <button
                type="button"
                className={isActive ? "btn-secondary" : "btn-danger"}
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? <><Play size={14} color="#10b981" /> Active</> : <><Pause size={14} /> Paused / Disabled</>}
              </button>
            </div>

            <div className="form-group">
              <label>Privacy Setting</label>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setIsPrivate(!isPrivate)}
              >
                <Globe size={14} /> {isPrivate ? "Private Link" : "Public Link"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Expiration Date (Optional)</label>
            <input
              className="form-input"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={loading}>
              <Trash2 size={14} /> Delete Link
            </button>

            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                <Save size={14} /> {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

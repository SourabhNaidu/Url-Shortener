import React, { useState, useEffect } from "react";
import { Shield, Clock, Activity } from "lucide-react";

export default function AuditLogsTab({ token, apiBase }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchAuditLogs();
  }, [token]);

  async function fetchAuditLogs() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setLogs(data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
        <Shield size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
        <h3>Sign in to view Security Audit Trail</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Track user modifications, link updates, security events, and API key actions.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} color="var(--accent-primary)" /> Security Audit Logs
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Immutable log of account security actions and link mutations</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>Loading security logs...</div>
      ) : (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Target Type</th>
              <th>Target Identifier</th>
              <th>Metadata Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <code style={{ color: "#3b82f6", fontWeight: "600" }}>{log.action}</code>
                  </td>
                  <td>{log.target_type || "-"}</td>
                  <td>{log.target_id || "-"}</td>
                  <td>
                    <pre style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                      {JSON.stringify(log.details)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { BarChart2, Globe, Monitor, ArrowUpRight, Shield } from "lucide-react";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function AnalyticsTab({ links, token, apiBase }) {
  const [selectedShortCode, setSelectedShortCode] = useState(links[0]?.short_code || "");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (links.length > 0 && !selectedShortCode) {
      setSelectedShortCode(links[0].short_code);
    }
  }, [links]);

  useEffect(() => {
    if (!selectedShortCode || !token) return;
    fetchAnalytics(selectedShortCode);
  }, [selectedShortCode, token]);

  async function fetchAnalytics(code) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/stats/${code}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytics");
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart2 size={20} color="var(--accent-primary)" /> Advanced Link Analytics
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Real-time traffic breakdown and audience insights</p>
        </div>

        {links.length > 0 && (
          <select
            className="form-input"
            style={{ width: "auto", minWidth: "220px" }}
            value={selectedShortCode}
            onChange={(e) => setSelectedShortCode(e.target.value)}
          >
            {links.map((l) => (
              <option key={l.short_code} value={l.short_code}>
                /{l.short_code} ({l.clicks} clicks)
              </option>
            ))}
          </select>
        )}
      </div>

      {!token && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          <Shield size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
          <h3>Sign in to unlock detailed click analytics</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>Track daily traffic, device distributions, referrers, and country breakdowns.</p>
        </div>
      )}

      {token && links.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          <p>No links found. Shorten a link first to view click analytics.</p>
        </div>
      )}

      {token && loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading real-time analytics chart data...
        </div>
      )}

      {token && error && (
        <div style={{ padding: "20px", color: "var(--accent-danger)", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {token && !loading && analytics && (
        <div className="charts-grid" style={{ marginTop: "24px" }}>
          {/* Daily Clicks Line Chart */}
          <div className="chart-container" style={{ gridColumn: "1 / -1" }}>
            <h4 style={{ marginBottom: "16px", fontSize: "0.95rem", color: "var(--text-secondary)" }}>Clicks Over Time (Last 30 Days)</h4>
            {analytics.daily_clicks.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No click activity recorded in the last 30 days yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.daily_clicks}>
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111827", borderColor: "var(--border-color)", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Device Breakdown Pie Chart */}
          <div className="chart-container">
            <h4 style={{ marginBottom: "16px", fontSize: "0.95rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Monitor size={16} /> Device Type Breakdown
            </h4>
            {analytics.device_breakdown.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No device data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={analytics.device_breakdown} dataKey="count" nameKey="device_type" cx="50%" cy="50%" outerRadius={70} label>
                    {analytics.device_breakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", borderColor: "var(--border-color)", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Referrers Bar Chart */}
          <div className="chart-container">
            <h4 style={{ marginBottom: "16px", fontSize: "0.95rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <ArrowUpRight size={16} /> Top Traffic Referrers
            </h4>
            {analytics.top_referrers.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No referrer data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.top_referrers}>
                  <XAxis dataKey="referrer" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111827", borderColor: "var(--border-color)", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Country Breakdown Table */}
          <div className="chart-container" style={{ gridColumn: "1 / -1" }}>
            <h4 style={{ marginBottom: "16px", fontSize: "0.95rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Globe size={16} /> Geographic Country Distribution
            </h4>
            {analytics.country_breakdown.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No geographic data logged yet.</p>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.country_breakdown.map((c, i) => (
                    <tr key={i}>
                      <td>{c.country}</td>
                      <td><strong>{c.count}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

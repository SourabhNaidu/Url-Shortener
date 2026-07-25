import React, { useState, useEffect } from "react";
import { Users, Plus, Shield, UserPlus, Check } from "lucide-react";

export default function TeamsTab({ token, apiBase }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchTeams();
  }, [token]);

  async function fetchTeams() {
    try {
      const res = await fetch(`${apiBase}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams);
        if (data.teams.length > 0 && !selectedTeam) {
          fetchTeamDetails(data.teams[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTeamDetails(id) {
    try {
      const res = await fetch(`${apiBase}/api/teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedTeam(data.team);
        setTeamDetails(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/api/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create workspace");

      setTeamName("");
      fetchTeams();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteMember(e) {
    e.preventDefault();
    if (!selectedTeam || !inviteEmail.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/api/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite member");

      setInviteEmail("");
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
        <Shield size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
        <h3>Sign in to manage Teams & Workspaces</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Collaborate with team members, assign admin roles, and share link dashboards.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={20} color="var(--accent-primary)" /> Teams & Collaborative Workspaces
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Create shared workspaces and invite team members</p>
        </div>
      </div>

      {error && <div style={{ color: "var(--accent-danger)", fontSize: "0.9rem", marginBottom: "16px" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
        {/* Left Side: Create & List Workspaces */}
        <div>
          <h4 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "12px" }}>Your Workspaces</h4>
          
          <form onSubmit={handleCreateTeam} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              className="form-input"
              placeholder="New Team Name"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ padding: "8px 12px" }} disabled={loading}>
              <Plus size={16} />
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {teams.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No team workspaces created yet.</p>
            ) : (
              teams.map((t) => (
                <div
                  key={t.id}
                  onClick={() => fetchTeamDetails(t.id)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: selectedTeam?.id === t.id ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedTeam?.id === t.id ? "var(--accent-primary)" : "var(--border-color)"}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{t.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {t.member_count} Members • Role: <strong style={{ textTransform: "capitalize" }}>{t.role}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Team Members & Invite Form */}
        <div>
          {selectedTeam && teamDetails ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4>Workspace: {selectedTeam.name}</h4>
                <span className="status-badge active">{teamDetails.members.length} Members</span>
              </div>

              {/* Invite Member Form */}
              {["owner", "admin"].includes(teamDetails.my_role) && (
                <form onSubmit={handleInviteMember} style={{ background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                  <h5 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>Invite User to Workspace</h5>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="teammate@company.com"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      className="form-input"
                      style={{ width: "120px" }}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="btn-primary" style={{ whiteSpace: "nowrap" }} disabled={loading}>
                      <UserPlus size={14} /> Invite
                    </button>
                  </div>
                </form>
              )}

              {/* Members Table */}
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {teamDetails.members.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.name || "User"}</strong></td>
                      <td>{m.email}</td>
                      <td>
                        <span className="status-badge active" style={{ textTransform: "capitalize" }}>
                          {m.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Select a workspace on the left to view members.</p>
          )}
        </div>
      </div>
    </div>
  );
}

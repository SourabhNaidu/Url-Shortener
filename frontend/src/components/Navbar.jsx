import React from "react";
import { Link2, User, LogOut, Shield, Key, Users, QrCode, FileText, BarChart2, Globe } from "lucide-react";

export default function Navbar({ user, onOpenAuth, onLogout, activeTab, setActiveTab }) {
  return (
    <header className="topbar">
      <div className="brand-section">
        <div className="brand-icon">US</div>
        <div className="brand-title">
          <h1>Enterprise URL Engine</h1>
          <p className="brand-subtitle">Scalable Link Management & Analytics</p>
        </div>
      </div>

      <div className="user-nav">
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Signed in as <strong>{user.name || user.email}</strong>
            </span>
            <button className="btn-secondary" onClick={onLogout} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenAuth}>
            <User size={16} /> Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}

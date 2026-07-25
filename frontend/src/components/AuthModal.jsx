import React, { useState } from "react";
import { X, Lock, Mail, User, Eye, EyeOff } from "lucide-react";

export default function AuthModal({ isOpen, onClose, onAuthSuccess, apiBase }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSignUp ? `${apiBase}/api/auth/signup` : `${apiBase}/api/auth/login`;
    const payload = isSignUp ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("token", data.token);
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 className="panel-title">{isSignUp ? "Create Account" : "Sign In"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {error && <div style={{ color: "var(--accent-danger)", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                style={{ paddingRight: "44px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); setShowPassword(false); }}
            style={{ background: "none", border: "none", color: "var(--accent-primary)", fontWeight: "600", cursor: "pointer" }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

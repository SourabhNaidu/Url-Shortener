const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("./logger");
const { logAuditEvent } = require("./middleware/audit");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email, name: decoded.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      req.user = { id: decoded.userId, email: decoded.email, name: decoded.name };
    } catch {
      // Proceed as anonymous
    }
  }

  next();
}

function registerAuthRoutes(app, pool) {
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    try {
      const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
        email.toLowerCase().trim(),
      ]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "An account with that email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await pool.query(
        "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
        [email.toLowerCase().trim(), passwordHash, name || null]
      );
      const user = result.rows[0];

      const token = signToken(user);
      await logAuditEvent(user.id, "user_signup", "user", user.id);

      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      logger.error("Signup error", err);
      res.status(500).json({ error: "Something went wrong during registration" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const result = await pool.query(
        "SELECT id, email, password_hash, name FROM users WHERE email = $1",
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = result.rows[0];
      const passwordMatches = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatches) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = signToken(user);
      await logAuditEvent(user.id, "user_login", "user", user.id);

      res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      logger.error("Login error", err);
      res.status(500).json({ error: "Something went wrong during login" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const result = await pool.query("SELECT id, email, name, created_at FROM users WHERE id = $1", [req.user.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ user: result.rows[0] });
    } catch (err) {
      logger.error("Fetch me error", err);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
}

module.exports = { registerAuthRoutes, requireAuth, optionalAuth };

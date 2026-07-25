const pool = require("../db");
const logger = require("../logger");
const { logAuditEvent } = require("../middleware/audit");

function registerTeamRoutes(app) {
  const { requireAuth } = require("../auth");

  // Create Team / Workspace
  app.post("/api/teams", requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Team name must be at least 2 characters" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert Team
      const teamResult = await client.query(
        "INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at",
        [name.trim(), req.user.id]
      );
      const team = teamResult.rows[0];

      // Add Owner to team_members table
      await client.query(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')",
        [team.id, req.user.id]
      );

      await client.query("COMMIT");
      await logAuditEvent(req.user.id, "create_team", "team", team.id, { name: team.name });

      res.status(201).json({ team });
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("Failed to create team", err);
      res.status(500).json({ error: "Failed to create team workspace" });
    } finally {
      client.release();
    }
  });

  // Get User's Teams / Workspaces
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT t.id, t.name, t.owner_id, tm.role, t.created_at,
                (SELECT COUNT(*)::int FROM team_members WHERE team_id = t.id) AS member_count
         FROM teams t
         JOIN team_members tm ON t.id = tm.team_id
         WHERE tm.user_id = $1
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );
      res.status(200).json({ teams: result.rows });
    } catch (err) {
      logger.error("Failed to list teams", err);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Get Team details & members
  app.get("/api/teams/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      // Check membership
      const memberCheck = await pool.query(
        "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: "You are not a member of this workspace" });
      }

      const teamResult = await pool.query("SELECT id, name, owner_id, created_at FROM teams WHERE id = $1", [id]);
      const membersResult = await pool.query(
        `SELECT tm.id, tm.user_id, u.email, u.name, tm.role, tm.created_at AS joined_at
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         ORDER BY tm.created_at ASC`,
        [id]
      );

      res.status(200).json({
        team: teamResult.rows[0],
        my_role: memberCheck.rows[0].role,
        members: membersResult.rows,
      });
    } catch (err) {
      logger.error("Failed to get team details", err);
      res.status(500).json({ error: "Failed to fetch workspace details" });
    }
  });

  // Invite / Add Member to Team by Email
  app.post("/api/teams/:id/members", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { email, role = "member" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "User email is required" });
    }

    try {
      // Check caller permissions (must be owner or admin)
      const callerRole = await pool.query(
        "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (callerRole.rows.length === 0 || !["owner", "admin"].includes(callerRole.rows[0].role)) {
        return res.status(403).json({ error: "Only team owners or admins can invite new members" });
      }

      // Find user by email
      const targetUser = await pool.query("SELECT id, email, name FROM users WHERE email = $1", [email.toLowerCase().trim()]);
      if (targetUser.rows.length === 0) {
        return res.status(404).json({ error: "No registered user found with that email address" });
      }

      const userIdToAdd = targetUser.rows[0].id;

      // Add to team
      await pool.query(
        `INSERT INTO team_members (team_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [id, userIdToAdd, role]
      );

      await logAuditEvent(req.user.id, "add_team_member", "team", id, { added_user_id: userIdToAdd, role });

      res.status(200).json({ message: "Member added to workspace successfully" });
    } catch (err) {
      logger.error("Failed to add member to team", err);
      res.status(500).json({ error: "Failed to add member" });
    }
  });
}

module.exports = { registerTeamRoutes };

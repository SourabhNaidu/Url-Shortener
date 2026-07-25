const { z } = require("zod");

// 1. Auth Schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// 2. Shorten URL Schema
const shortenSchema = z.object({
  url: z.string().url("Must be a valid HTTP or HTTPS URL"),
  alias: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,32}$/, "Custom alias must be 3-32 alphanumeric characters or hyphens/underscores")
    .optional()
    .or(z.literal("")),
  expires_at: z.string().datetime().nullable().optional(),
  is_private: z.boolean().optional(),
  domain: z.string().optional(),
  team_id: z.number().int().optional(),
});

// 3. Edit Link Schema
const updateLinkSchema = z.object({
  original_url: z.string().url("Must be a valid HTTP or HTTPS URL").optional(),
  is_active: z.boolean().optional(),
  is_private: z.boolean().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

// 4. API Key Schema
const createApiKeySchema = z.object({
  name: z.string().min(2, "Key name must be at least 2 characters").max(50),
});

// 5. Team Schema
const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100),
});

const addTeamMemberSchema = z.object({
  email: z.string().email("Valid user email required"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

/**
 * Middleware factory for Zod validation
 * @param {z.ZodSchema} schema 
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return res.status(400).json({ error: errorMessages, details: result.error.format() });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  validateBody,
  registerSchema,
  loginSchema,
  shortenSchema,
  updateLinkSchema,
  createApiKeySchema,
  createTeamSchema,
  addTeamMemberSchema,
};

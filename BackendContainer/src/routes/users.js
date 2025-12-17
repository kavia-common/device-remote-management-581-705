const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPermissions, checkRole } = require('../middleware/rbac');

// All user routes require authentication
router.use(authenticate);

// GET /api/users - List users (admin only)
router.get('/', checkRole(['admin']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const query = `
      SELECT u.id, u.email, u.full_name, u.tenant_id, u.is_active,
             u.created_at, u.last_login,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `;
    
    const result = await client.query(query);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', checkPermissions(['users:read']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const query = `
      SELECT u.id, u.email, u.full_name, u.tenant_id, u.is_active,
             u.created_at, u.last_login, u.preferences,
             r.name as role_name, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    
    const result = await client.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', checkPermissions(['users:write']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    const { full_name, is_active, preferences, role_id } = req.body;
    
    // Only admins can change roles and active status
    if ((role_id || is_active !== undefined) && req.user.role_name !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const query = `
      UPDATE users SET
        full_name = COALESCE($1, full_name),
        is_active = COALESCE($2, is_active),
        preferences = COALESCE($3, preferences),
        role_id = COALESCE($4, role_id),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, full_name, tenant_id, is_active, preferences
    `;
    
    const result = await client.query(query, [
      full_name,
      is_active,
      preferences ? JSON.stringify(preferences) : null,
      role_id,
      req.params.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

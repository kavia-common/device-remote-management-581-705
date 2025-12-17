const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPermissions } = require('../middleware/rbac');

// All device routes require authentication
router.use(authenticate);

// GET /api/devices - List all devices for current user's tenant
router.get('/', checkPermissions(['devices:read']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const { limit = 50, offset = 0, status, device_type } = req.query;
    
    let query = `
      SELECT d.*, 
             COUNT(*) OVER() as total_count,
             json_agg(
               json_build_object(
                 'protocol_type', dp.protocol_type,
                 'is_enabled', dp.is_enabled
               )
             ) FILTER (WHERE dp.id IS NOT NULL) as protocols
      FROM devices d
      LEFT JOIN device_protocols dp ON d.id = dp.device_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND d.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (device_type) {
      query += ` AND d.device_type = $${paramCount++}`;
      params.push(device_type);
    }
    
    query += ` GROUP BY d.id ORDER BY d.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    
    res.json({
      devices: result.rows,
      total: result.rows[0]?.total_count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id - Get single device
router.get('/:id', checkPermissions(['devices:read']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const query = `
      SELECT d.*,
             json_agg(
               json_build_object(
                 'protocol_type', dp.protocol_type,
                 'is_enabled', dp.is_enabled,
                 'config', dp.config
               )
             ) FILTER (WHERE dp.id IS NOT NULL) as protocols
      FROM devices d
      LEFT JOIN device_protocols dp ON d.id = dp.device_id
      WHERE d.id = $1
      GROUP BY d.id
    `;
    
    const result = await client.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/devices - Create new device
router.post('/', checkPermissions(['devices:write']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const {
      name, device_type, manufacturer, model, serial_number,
      firmware_version, ip_address, mac_address, metadata
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    const query = `
      INSERT INTO devices (
        name, tenant_id, owner_id, device_type, manufacturer, model,
        serial_number, firmware_version, ip_address, mac_address, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      name,
      req.user.tenant_id,
      req.user.id,
      device_type,
      manufacturer,
      model,
      serial_number,
      firmware_version,
      ip_address,
      mac_address,
      JSON.stringify(metadata || {})
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/devices/:id - Update device
router.put('/:id', checkPermissions(['devices:write']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const {
      name, device_type, manufacturer, model, serial_number,
      firmware_version, ip_address, mac_address, status, metadata
    } = req.body;
    
    const query = `
      UPDATE devices SET
        name = COALESCE($1, name),
        device_type = COALESCE($2, device_type),
        manufacturer = COALESCE($3, manufacturer),
        model = COALESCE($4, model),
        serial_number = COALESCE($5, serial_number),
        firmware_version = COALESCE($6, firmware_version),
        ip_address = COALESCE($7, ip_address),
        mac_address = COALESCE($8, mac_address),
        status = COALESCE($9, status),
        metadata = COALESCE($10, metadata),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;
    
    const result = await client.query(query, [
      name,
      device_type,
      manufacturer,
      model,
      serial_number,
      firmware_version,
      ip_address,
      mac_address,
      status,
      metadata ? JSON.stringify(metadata) : null,
      req.params.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/devices/:id - Delete device
router.delete('/:id', checkPermissions(['devices:delete']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const result = await client.query('DELETE FROM devices WHERE id = $1 RETURNING id', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ message: 'Device deleted successfully', id: req.params.id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

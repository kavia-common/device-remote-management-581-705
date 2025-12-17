const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPermissions } = require('../middleware/rbac');

// All protocol routes require authentication
router.use(authenticate);

// GET /api/protocols/:deviceId - Get all protocol configurations for a device
router.get('/:deviceId', checkPermissions(['protocols:read']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const query = `
      SELECT * FROM device_protocols
      WHERE device_id = $1
    `;
    
    const result = await client.query(query, [req.params.deviceId]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/protocols/:deviceId/:protocolType - Configure protocol for device
router.post('/:deviceId/:protocolType', checkPermissions(['protocols:write']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    const { deviceId, protocolType } = req.params;
    const { is_enabled, config } = req.body;
    
    // Validate protocol type
    const validProtocols = ['snmp', 'webpa', 'tr69', 'tr369'];
    if (!validProtocols.includes(protocolType)) {
      return res.status(400).json({ error: 'Invalid protocol type' });
    }
    
    const query = `
      INSERT INTO device_protocols (device_id, protocol_type, is_enabled, config)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (device_id, protocol_type) 
      DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        config = EXCLUDED.config,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await client.query(query, [
      deviceId,
      protocolType,
      is_enabled !== undefined ? is_enabled : true,
      JSON.stringify(config || {})
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/protocols/:deviceId/:protocolType - Remove protocol configuration
router.delete('/:deviceId/:protocolType', checkPermissions(['protocols:write']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    const { deviceId, protocolType } = req.params;
    
    const result = await client.query(
      'DELETE FROM device_protocols WHERE device_id = $1 AND protocol_type = $2 RETURNING id',
      [deviceId, protocolType]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol configuration not found' });
    }
    
    res.json({ message: 'Protocol configuration removed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

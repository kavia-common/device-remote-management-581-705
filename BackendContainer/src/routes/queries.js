const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPermissions } = require('../middleware/rbac');
const ProtocolService = require('../services/protocolService');

// All query routes require authentication
router.use(authenticate);

// POST /api/queries/execute - Execute a query on a device
router.post('/execute', checkPermissions(['query:execute']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    const { device_id, protocol_type, query_type, query_parameters } = req.body;
    
    if (!device_id || !protocol_type || !query_type) {
      return res.status(400).json({ error: 'device_id, protocol_type, and query_type are required' });
    }
    
    // Create query history entry with pending status
    const insertQuery = `
      INSERT INTO query_history (
        user_id, device_id, protocol_type, query_type, 
        query_parameters, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      req.user.id,
      device_id,
      protocol_type,
      query_type,
      JSON.stringify(query_parameters || {})
    ]);
    
    const queryRecord = result.rows[0];
    
    // Execute query asynchronously
    const pool = req.app.get('db');
    const protocolService = new ProtocolService(pool);
    
    protocolService.executeQuery(queryRecord.id, device_id, protocol_type, query_type, query_parameters)
      .catch(err => {
        console.error('Query execution failed:', err);
      });
    
    res.status(202).json({
      message: 'Query submitted for execution',
      query_id: queryRecord.id,
      status: 'pending'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/queries/:id - Get query result
router.get('/:id', checkPermissions(['query:read']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    
    const query = `
      SELECT qh.*, d.name as device_name
      FROM query_history qh
      JOIN devices d ON qh.device_id = d.id
      WHERE qh.id = $1
    `;
    
    const result = await client.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Query not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/queries - List query history
router.get('/', checkPermissions(['query:read']), async (req, res, next) => {
  try {
    const client = req.dbClient || req.app.get('db');
    const { limit = 50, offset = 0, device_id, status } = req.query;
    
    let query = `
      SELECT qh.*, d.name as device_name,
             COUNT(*) OVER() as total_count
      FROM query_history qh
      JOIN devices d ON qh.device_id = d.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (device_id) {
      query += ` AND qh.device_id = $${paramCount++}`;
      params.push(device_id);
    }
    
    if (status) {
      query += ` AND qh.status = $${paramCount++}`;
      params.push(status);
    }
    
    query += ` ORDER BY qh.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    
    res.json({
      queries: result.rows,
      total: result.rows[0]?.total_count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

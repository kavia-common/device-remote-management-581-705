// PUBLIC_INTERFACE
/**
 * Middleware to set PostgreSQL RLS context variables for multi-tenant isolation
 * Sets app.current_user_id and app.current_tenant_id session variables
 */
const setRLSContext = async (req, res, next) => {
  // Skip for public routes
  if (!req.user) {
    return next();
  }

  const pool = req.app.get('db');
  
  try {
    // Set RLS context for this connection
    const client = await pool.connect();
    
    try {
      await client.query(`SET app.current_user_id = '${req.user.id}'`);
      await client.query(`SET app.current_tenant_id = '${req.user.tenant_id}'`);
      
      // Attach client to request for use in routes
      req.dbClient = client;
      
      // Ensure client is released after response
      res.on('finish', () => {
        client.release();
      });
      
      next();
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error setting RLS context:', error);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { setRLSContext };

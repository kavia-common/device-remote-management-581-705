const { v4: uuidv4 } = require('uuid');

// PUBLIC_INTERFACE
/**
 * Middleware to log all API actions to audit_logs table
 * Captures user actions, resource changes, and request metadata
 */
const auditLogger = async (req, res, next) => {
  // Skip audit logging for health checks and GET requests on list endpoints
  if (req.path === '/health' || (req.method === 'GET' && !req.params.id)) {
    return next();
  }

  // Capture original send function
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const pool = req.app.get('db');
      
      const action = `${req.method} ${req.path}`;
      const resourceType = extractResourceType(req.path);
      const resourceId = req.params.id || extractResourceId(data);
      
      const auditData = {
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        action: action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeBody(req.body),
          status: res.statusCode
        },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      };

      const query = `
        INSERT INTO audit_logs (user_id, tenant_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      pool.query(query, [
        auditData.user_id,
        auditData.tenant_id,
        auditData.action,
        auditData.resource_type,
        auditData.resource_id,
        JSON.stringify(auditData.details),
        auditData.ip_address,
        auditData.user_agent
      ]).catch(err => {
        console.error('Audit logging failed:', err);
      });
    }

    originalSend.call(this, data);
  };

  next();
};

/**
 * Extract resource type from request path
 * @private
 */
function extractResourceType(path) {
  const matches = path.match(/\/api\/([^\/]+)/);
  return matches ? matches[1] : 'unknown';
}

/**
 * Extract resource ID from response data
 * @private
 */
function extractResourceId(data) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed?.id || null;
  } catch {
    return null;
  }
}

/**
 * Sanitize request body to remove sensitive data
 * @private
 */
function sanitizeBody(body) {
  if (!body) return {};
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'refresh_token', 'auth_password', 'priv_password'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

module.exports = { auditLogger };

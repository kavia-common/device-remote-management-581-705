// PUBLIC_INTERFACE
/**
 * Middleware to check if user has required permissions
 * @param {string[]} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware
 */
const checkPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has admin wildcard
    if (userPermissions.includes('system:*')) {
      return next();
    }

    // Check if user has required permissions
    const hasPermission = requiredPermissions.some(required => {
      // Check exact match
      if (userPermissions.includes(required)) {
        return true;
      }

      // Check wildcard match (e.g., "devices:*" matches "devices:read")
      const [resource, action] = required.split(':');
      return userPermissions.includes(`${resource}:*`);
    });

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredPermissions 
      });
    }

    next();
  };
};

// PUBLIC_INTERFACE
/**
 * Middleware to check if user has specific role
 * @param {string[]} allowedRoles - Array of allowed role names
 * @returns {Function} Express middleware
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_name) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ 
        error: 'Access denied',
        required_role: allowedRoles 
      });
    }

    next();
  };
};

module.exports = { checkPermissions, checkRole };

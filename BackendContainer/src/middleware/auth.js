const AuthService = require('../services/authService');

// PUBLIC_INTERFACE
/**
 * Middleware to authenticate requests using JWT
 * Extracts token from Authorization header and verifies it
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const pool = req.app.get('db');
    const authService = new AuthService(pool);

    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };

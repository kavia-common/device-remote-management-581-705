const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class AuthService {
  constructor(pool) {
    this.pool = pool;
  }

  // PUBLIC_INTERFACE
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user (without password)
   */
  async register(userData) {
    const { email, password, full_name, tenant_id, role_id } = userData;

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password_hash, full_name, tenant_id, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, email, full_name, tenant_id, role_id, is_active, created_at
    `;

    const result = await this.pool.query(query, [
      email,
      password_hash,
      full_name,
      tenant_id,
      role_id
    ]);

    return result.rows[0];
  }

  // PUBLIC_INTERFACE
  /**
   * Authenticate user and create session
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} Authentication tokens and user data
   */
  async login(email, password, ipAddress, userAgent) {
    // Find user
    const userQuery = `
      SELECT u.*, r.name as role_name, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
    `;

    const userResult = await this.pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Calculate expiration times
    const accessTokenExpires = new Date(Date.now() + this.parseTimeToMs(JWT_EXPIRES_IN));
    const refreshTokenExpires = new Date(Date.now() + this.parseTimeToMs(JWT_REFRESH_EXPIRES_IN));

    // Create session
    const sessionQuery = `
      INSERT INTO sessions (user_id, token, refresh_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    await this.pool.query(sessionQuery, [
      user.id,
      accessToken,
      refreshToken,
      refreshTokenExpires,
      ipAddress,
      userAgent
    ]);

    // Update last login
    await this.pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  // PUBLIC_INTERFACE
  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

      // Find session
      const sessionQuery = `
        SELECT s.*, u.email, u.tenant_id, u.role_id, r.name as role_name, r.permissions
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE s.refresh_token = $1 AND s.expires_at > NOW()
      `;

      const result = await this.pool.query(sessionQuery, [refreshToken]);

      if (result.rows.length === 0) {
        throw new Error('Invalid refresh token');
      }

      const session = result.rows[0];

      // Generate new access token
      const accessToken = this.generateAccessToken({
        id: session.user_id,
        email: session.email,
        tenant_id: session.tenant_id,
        role_id: session.role_id,
        role_name: session.role_name,
        permissions: session.permissions
      });

      // Update session with new token
      await this.pool.query('UPDATE sessions SET token = $1 WHERE id = $2', [
        accessToken,
        session.id
      ]);

      return {
        accessToken,
        expiresIn: JWT_EXPIRES_IN
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Logout user and invalidate session
   * @param {string} token - Access token
   */
  async logout(token) {
    await this.pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  }

  // PUBLIC_INTERFACE
  /**
   * Verify access token and return user data
   * @param {string} token - Access token
   * @returns {Object} User data from token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate JWT access token
   * @private
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role_id: user.role_id,
        role_name: user.role_name,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate JWT refresh token
   * @private
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
  }

  /**
   * Parse time string to milliseconds
   * @private
   */
  parseTimeToMs(timeStr) {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return 900000; // default 15 minutes
    return parseInt(match[1]) * units[match[2]];
  }
}

module.exports = AuthService;

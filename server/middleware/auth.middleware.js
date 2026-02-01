const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');

    // Check if session exists and is valid
    const sessionResult = await db.query(
      `SELECT user_id FROM user_sessions 
       WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [decoded.userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Session expired or invalid' 
      });
    }

    // Get user details
    const userResult = await db.query(
      `SELECT id, username, email, full_name, role, is_active 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found or inactive' 
      });
    }

    // Attach user to request
    req.user = userResult.rows[0];

    // Update last activity
    await db.query(
      'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE user_id = $1',
      [decoded.userId]
    );

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

/**
 * Authorization middleware - checks user role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

/**
 * Audit log middleware
 * Logs user actions for security and compliance
 */
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store audit info in request for later logging
    req.auditInfo = {
      action,
      resource,
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress
    };

    // Override res.json to log after response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Log to database asynchronously (don't block response)
      if (req.user && data.success !== false) {
        setImmediate(async () => {
          try {
            await db.query(
              `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                req.user.id,
                action,
                resource,
                data.data?.id || null,
                JSON.stringify({ body: req.body, params: req.params }),
                req.auditInfo.ip
              ]
            );
          } catch (error) {
            console.error('Audit log error:', error);
          }
        });
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      
      const userResult = await db.query(
        `SELECT id, username, email, full_name, role, is_active 
         FROM users WHERE id = $1 AND is_active = true`,
        [decoded.userId]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    }
  } catch (error) {
    // Ignore errors in optional auth
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  auditLog,
  optionalAuth
};

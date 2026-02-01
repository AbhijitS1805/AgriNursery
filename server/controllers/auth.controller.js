const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthController {
  /**
   * User login
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username and password are required' 
        });
      }

      // Get user with password hash
      const result = await db.query(
        `SELECT id, username, email, password_hash, full_name, role, is_active 
         FROM users WHERE username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({ 
          success: false, 
          error: 'Account is inactive' 
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '24h' }
      );

      // Store session
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.query(
        `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          tokenHash,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'],
          expiresAt
        ]
      );

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        success: true,
        data: {
          user,
          token,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Login failed' 
      });
    }
  }

  /**
   * User logout
   */
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.substring(7);
      
      if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Delete session
        await db.query(
          'DELETE FROM user_sessions WHERE user_id = $1 AND token_hash = $2',
          [req.user.id, tokenHash]
        );
      }

      res.json({ 
        success: true, 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }
  }

  /**
   * Register new user (admin only)
   */
  async register(req, res) {
    try {
      const { username, email, password, full_name, role, phone } = req.body;

      // Validate input
      if (!username || !email || !password || !full_name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 8 characters' 
        });
      }

      // Check if user exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'Username or email already exists' 
        });
      }

      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Insert user
      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, phone, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, email, full_name, role, phone, created_at`,
        [username, email, password_hash, full_name, role || 'user', phone, req.user?.id]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Registration failed' 
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const result = await db.query(
        `SELECT id, username, email, full_name, role, phone, last_login, created_at
         FROM users WHERE id = $1`,
        [req.user.id]
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch profile' 
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { full_name, email, phone } = req.body;
      
      const result = await db.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone)
         WHERE id = $4
         RETURNING id, username, email, full_name, role, phone`,
        [full_name, email, phone, req.user.id]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update profile' 
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'Current and new password are required' 
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ 
          success: false, 
          error: 'New password must be at least 8 characters' 
        });
      }

      // Get current password hash
      const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          error: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, req.user.id]
      );

      // Invalidate all sessions except current
      const currentToken = req.headers.authorization?.substring(7);
      const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');

      await db.query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND token_hash != $2',
        [req.user.id, currentTokenHash]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to change password' 
      });
    }
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(req, res) {
    try {
      const result = await db.query(`
        SELECT id, username, email, full_name, role, phone, is_active, last_login, created_at
        FROM users
        ORDER BY created_at DESC
      `);
      
      res.json({ 
        success: true, 
        data: result.rows 
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users' 
      });
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { full_name, email, role, phone, is_active } = req.body;

      const result = await db.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name),
             email = COALESCE($2, email),
             role = COALESCE($3, role),
             phone = COALESCE($4, phone),
             is_active = COALESCE($5, is_active)
         WHERE id = $6
         RETURNING id, username, email, full_name, role, phone, is_active`,
        [full_name, email, role, phone, is_active, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update user' 
      });
    }
  }

  /**
   * Delete user (admin only) - soft delete
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Can't delete yourself
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete your own account' 
        });
      }

      await db.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [id]
      );

      // Invalidate all sessions
      await db.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete user' 
      });
    }
  }
}

module.exports = new AuthController();

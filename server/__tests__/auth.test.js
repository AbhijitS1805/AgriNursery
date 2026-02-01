const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Create test app
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/auth', require('../routes/auth.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

describe('Authentication System', () => {
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    // Clean up test data
    await db.query("DELETE FROM users WHERE username LIKE 'test_%'");
    
    // Create test admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES ('test_admin', 'test_admin@test.com', $1, 'Test Admin', 'admin', true)
       RETURNING id`,
      [passwordHash]
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up - delete in correct order due to foreign keys
    await db.query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test_%')");
    await db.query("DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test_%')");
    await db.query("DELETE FROM users WHERE username LIKE 'test_%'");
    // Don't end the pool here - it's shared across tests
    // await db.end();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_admin',
          password: 'admin123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.username).toBe('test_admin');

      adminToken = res.body.data.token;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_admin',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_admin'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with admin token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'test_user1',
          email: 'test_user1@test.com',
          password: 'password123',
          full_name: 'Test User One',
          role: 'user'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('test_user1');
    });

    it('should reject registration without admin token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test_user2',
          email: 'test_user2@test.com',
          password: 'password123',
          full_name: 'Test User Two'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'test_user1',
          email: 'another@test.com',
          password: 'password123',
          full_name: 'Another User'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'test_user3',
          email: 'test_user3@test.com',
          password: 'weak',
          full_name: 'Test User Three'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('8 characters');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('test_admin');
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'admin123',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Change back
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [await bcrypt.hash('admin123', 10), 'test_admin']
      );
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak new password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'admin123',
          newPassword: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/users', () => {
    it('should get all users with admin token', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should reject without admin role', async () => {
      // Create regular user and get token
      const userRes = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'test_regular',
          email: 'test_regular@test.com',
          password: 'password123',
          full_name: 'Test Regular',
          role: 'user'
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_regular',
          password: 'password123'
        });

      const userToken = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('JWT Token Validation', () => {
    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, username: 'test_admin', role: 'admin' },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '1ms' }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token expired');
    });

    it('should reject malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer not.a.valid.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Authorization Middleware', () => {
  let adminToken, userToken;

  beforeAll(async () => {
    // First login as admin to get token
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_admin',
        password: 'admin123'
      });
    
    if (adminLoginRes.body.success) {
      adminToken = adminLoginRes.body.data.token;
    }

    // Create test regular user using admin token
    if (adminToken) {
      await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'test_regular_auth',
          email: 'test_regular_auth@test.com',
          password: 'password123',
          full_name: 'Test Regular Auth',
          role: 'user'
        });
    }

    // Login as regular user
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_regular_auth',
        password: 'password123'
      });
    
    if (userRes.body.success) {
      userToken = userRes.body.data.token;
    }
  });

  afterAll(async () => {
    // Clean up
    await db.query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE username = 'test_regular_auth')");
    await db.query("DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE username = 'test_regular_auth')");
    await db.query("DELETE FROM users WHERE username = 'test_regular_auth'");
    // Force exit after cleanup
    setTimeout(() => process.exit(0), 500);
  });

  it('should allow admin to access admin routes', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should block regular user from admin routes', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow all authenticated users to access profile', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });
});

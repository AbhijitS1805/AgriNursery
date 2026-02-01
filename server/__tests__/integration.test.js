const request = require('supertest');
const app = require('../index');
const db = require('../config/database');

describe('API Integration Tests', () => {
  let authToken;
  let userId;
  let batchId;
  let inventoryId;

  // Setup: Login before tests
  beforeAll(async () => {
    // Login to get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  // Cleanup
  afterAll(async () => {
    await db.end();
  });

  describe('Health Checks', () => {
    test('GET /health - should return OK status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /health/detailed - should return detailed health info', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('Authentication & Authorization', () => {
    test('POST /api/auth/login - should login successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'admin');
    });

    test('POST /api/auth/login - should fail with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    test('GET /api/auth/profile - should get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('email');
    });

    test('GET /api/auth/profile - should fail without token', async () => {
      await request(app)
        .get('/api/auth/profile')
        .expect(401);
    });
  });

  describe('Batch Management', () => {
    test('POST /api/batches - should create a batch', async () => {
      const response = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batch_number: 'TEST-BATCH-001',
          plant_name: 'Test Plant',
          variety: 'Test Variety',
          quantity: 100,
          planting_date: '2026-01-01',
          expected_harvest_date: '2026-03-01',
          status: 'active'
        })
        .expect(201);

      expect(response.body.batch).toHaveProperty('id');
      expect(response.body.batch.batch_number).toBe('TEST-BATCH-001');
      batchId = response.body.batch.id;
    });

    test('GET /api/batches - should list all batches', async () => {
      const response = await request(app)
        .get('/api/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('GET /api/batches/:id - should get specific batch', async () => {
      const response = await request(app)
        .get(`/api/batches/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(batchId);
      expect(response.body.batch_number).toBe('TEST-BATCH-001');
    });

    test('PUT /api/batches/:id - should update batch', async () => {
      const response = await request(app)
        .put(`/api/batches/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 150,
          status: 'active'
        })
        .expect(200);

      expect(response.body.batch.quantity).toBe(150);
    });
  });

  describe('Inventory Management', () => {
    test('POST /api/inventory - should add inventory item', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batch_id: batchId,
          location_id: 1,
          quantity: 50,
          status: 'available'
        })
        .expect(201);

      expect(response.body.inventory).toHaveProperty('id');
      inventoryId = response.body.inventory.id;
    });

    test('GET /api/inventory - should list inventory', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Dashboard & Reports', () => {
    test('GET /api/dashboard/stats - should get dashboard stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBatches');
      expect(response.body).toHaveProperty('activeBatches');
    });

    test('GET /api/reports/batch-summary - should get batch report', async () => {
      const response = await request(app)
        .get('/api/reports/batch-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Master Data', () => {
    test('GET /api/master/plants - should get plant varieties', async () => {
      const response = await request(app)
        .get('/api/master/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/locations - should get locations', async () => {
      const response = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('POST /api/auth/login - should be rate limited after 5 attempts', async () => {
      // Make 6 requests quickly
      const requests = Array(6).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    }, 10000);
  });

  describe('Error Handling', () => {
    test('GET /invalid-route - should return 404', async () => {
      const response = await request(app)
        .get('/invalid-route')
        .expect(404);

      expect(response.body.error).toHaveProperty('message');
    });

    test('POST /api/batches - should validate required fields', async () => {
      const response = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batch_number: 'INVALID'
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Cleanup Test Data', () => {
    test('DELETE /api/inventory/:id - should delete inventory', async () => {
      if (inventoryId) {
        await request(app)
          .delete(`/api/inventory/${inventoryId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });

    test('DELETE /api/batches/:id - should delete batch', async () => {
      if (batchId) {
        await request(app)
          .delete(`/api/batches/${batchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });
});

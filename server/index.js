const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const { 
  helmetConfig, 
  sanitizeInput, 
  requestSizeLimit,
  apiLimiter 
} = require('./middleware/security.middleware');
const { 
  logger, 
  morganMiddleware, 
  errorLogger 
} = require('./middleware/logger.middleware');

const app = express();

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morganMiddleware);

// Body parsing with size limits
app.use(express.json({ limit: requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimit }));

// Input sanitization
app.use(sanitizeInput);

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/batches', require('./routes/batches.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/polyhouses', require('./routes/polyhouses.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/purchases', require('./routes/purchases.routes'));
app.use('/api/tasks', require('./routes/tasks.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/master', require('./routes/master.routes'));
app.use('/api/production', require('./routes/production-simple.routes'));
app.use('/api/farmers', require('./routes/farmers.routes'));
app.use('/api/locations', require('./routes/locations.routes'));
app.use('/api/bookings', require('./routes/bookings.routes'));
app.use('/api/sales-invoices', require('./routes/sales-invoices.routes'));
app.use('/api/sales-payments', require('./routes/sales-payments.routes'));
app.use('/api/vehicles', require('./routes/vehicles.routes'));
app.use('/api/deliveries', require('./routes/deliveries.routes'));
app.use('/api/employees', require('./routes/employees.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/leave', require('./routes/leave.routes'));
app.use('/api/accounting', require('./routes/accounting.routes'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/purchase-orders', require('./routes/purchase-orders'));
app.use('/api/supplier-performance', require('./routes/supplier-performance.routes'));
app.use('/api/quality-inspection', require('./routes/quality-inspection.routes'));
app.use('/api/shipping', require('./routes/shipping.routes'));

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const db = require('./config/database');
    await db.query('SELECT 1');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Detailed health check for monitoring
app.get('/health/detailed', async (req, res) => {
  const db = require('./config/database');
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'OK',
      memory: 'OK',
      disk: 'OK'
    }
  };
  
  // Check database
  try {
    const result = await db.query('SELECT NOW()');
    health.checks.database = 'OK';
  } catch (error) {
    health.checks.database = 'ERROR';
    health.status = 'DEGRADED';
  }
  
  // Check memory
  const memUsage = process.memoryUsage();
  health.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };
  
  res.status(health.status === 'OK' ? 200 : 503).json(health);
});

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // Don't expose stack traces in production
  const response = {
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode
    }
  };
  
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌱 Agri-Nursery ERP Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

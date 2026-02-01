const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize, auditLog } = require('../middleware/auth.middleware');
const { authLimiter, passwordLimiter } = require('../middleware/security.middleware');

// Public routes with rate limiting
router.post('/login', authLimiter, authController.login);

// Protected routes - require authentication
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, auditLog('UPDATE', 'profile'), authController.updateProfile);
router.post('/change-password', authenticate, passwordLimiter, auditLog('CHANGE_PASSWORD', 'user'), authController.changePassword);

// Admin only routes
router.post('/register', authenticate, authorize('admin'), auditLog('CREATE', 'user'), authController.register);
router.get('/users', authenticate, authorize('admin', 'manager'), authController.getUsers);
router.put('/users/:id', authenticate, authorize('admin'), auditLog('UPDATE', 'user'), authController.updateUser);
router.delete('/users/:id', authenticate, authorize('admin'), auditLog('DELETE', 'user'), authController.deleteUser);

module.exports = router;

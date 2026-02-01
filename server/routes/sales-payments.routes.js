const express = require('express');
const router = express.Router();
const salesPaymentsController = require('../controllers/sales-payments.controller');

// Get all payments (with optional filters)
router.get('/', salesPaymentsController.getAllPayments);

// Get payment statistics
router.get('/stats', salesPaymentsController.getPaymentStats);

// Get payment methods
router.get('/methods', salesPaymentsController.getPaymentMethods);

// Get payments by invoice
router.get('/invoice/:invoice_id', salesPaymentsController.getPaymentsByInvoice);

// Get single payment by ID
router.get('/:id', salesPaymentsController.getPaymentById);

// Record a new payment
router.post('/', salesPaymentsController.recordPayment);

module.exports = router;

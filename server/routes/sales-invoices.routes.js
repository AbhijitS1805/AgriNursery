const express = require('express');
const router = express.Router();
const salesInvoicesController = require('../controllers/sales-invoices.controller');

// Get all sales invoices (with optional filters)
router.get('/', salesInvoicesController.getAllInvoices);

// Get invoice statistics
router.get('/stats', salesInvoicesController.getInvoiceStats);

// Get outstanding invoices
router.get('/outstanding', salesInvoicesController.getOutstandingInvoices);

// Get single invoice by ID
router.get('/:id', salesInvoicesController.getInvoiceById);

// Generate invoice for a booking
router.post('/', salesInvoicesController.generateInvoice);

module.exports = router;

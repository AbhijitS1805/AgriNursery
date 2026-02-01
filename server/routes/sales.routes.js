const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');

// Customers
router.get('/customers', salesController.getCustomers);
router.post('/customers', salesController.createCustomer);

// Sales Orders
router.get('/orders', salesController.getSalesOrders);
router.get('/orders/:id', salesController.getSalesOrderById);
router.post('/orders', salesController.createSalesOrder);
router.put('/orders/:id/fulfill', salesController.fulfillOrder);

// Invoices
router.get('/invoices', salesController.getInvoices);
router.post('/invoices', salesController.createInvoice);

module.exports = router;

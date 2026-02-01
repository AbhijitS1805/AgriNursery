const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment/Receipt Routes
router.get('/', paymentController.getAllPayments);
router.get('/summary', paymentController.getPaymentSummary);
router.get('/outstanding', paymentController.getOutstandingInvoices);
router.get('/bank-accounts', paymentController.getBankAccounts);
router.get('/:id', paymentController.getPaymentById);
router.post('/', paymentController.createPayment);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

// Cheque Management
router.put('/cheque/:id/clear', paymentController.clearCheque);

module.exports = router;

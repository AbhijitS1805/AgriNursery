const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');

// Suppliers
router.get('/suppliers', purchaseController.getSuppliers);
router.post('/suppliers', purchaseController.createSupplier);

// Purchase Orders
router.get('/orders', purchaseController.getPurchaseOrders);
router.post('/orders', purchaseController.createPurchaseOrder);

// Purchase Bills
router.get('/bills', purchaseController.getPurchaseBills);
router.get('/bills/:id', purchaseController.getPurchaseBillById);
router.post('/bills', purchaseController.createPurchaseBill);
router.put('/bills/:id', purchaseController.updatePurchaseBill);

// Supplier Payments
router.get('/suppliers/:supplier_id/pending-bills', purchaseController.getSupplierPendingBills);
router.get('/suppliers/:supplier_id/payments', purchaseController.getSupplierPayments);
router.post('/suppliers/payments', purchaseController.allocateSupplierPayment);

module.exports = router;

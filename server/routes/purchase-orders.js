const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');

// Purchase Orders
router.get('/', poController.getAllPurchaseOrders);
router.get('/:id', poController.getPurchaseOrderById);
router.post('/', poController.createPurchaseOrder);
router.put('/:id', poController.updatePurchaseOrder);
router.delete('/:id', poController.deletePurchaseOrder);

// Vendors
router.get('/vendors/all', poController.getVendors);
router.post('/vendors', poController.createVendor);

// GRNs
router.get('/grn/all', poController.getAllGRNs);
router.post('/grn', poController.createGRN);

module.exports = router;

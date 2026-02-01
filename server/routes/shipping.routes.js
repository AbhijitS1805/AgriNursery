const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shipping.controller');

// Carriers
router.get('/carriers', shippingController.getCarriers);
router.post('/carriers', shippingController.createCarrier);

// Rate calculation
router.post('/calculate-rate', shippingController.calculateRate);

// Shipments
router.get('/', shippingController.getAllShipments);
router.get('/active', shippingController.getActiveShipments);
router.get('/pending-pickups', shippingController.getPendingPickups);
router.get('/delivery-performance', shippingController.getDeliveryPerformance);
router.get('/:id', shippingController.getShipmentById);
router.post('/', shippingController.createShipment);
router.put('/:id/status', shippingController.updateShipmentStatus);

// Label printing
router.post('/:id/print-label', shippingController.printLabel);

module.exports = router;

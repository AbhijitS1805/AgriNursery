const express = require('express');
const router = express.Router();
const deliveriesController = require('../controllers/deliveries.controller');

// Get all deliveries
router.get('/', deliveriesController.getAllDeliveries);

// Get delivery statistics
router.get('/stats', deliveriesController.getDeliveryStats);

// Get pending deliveries (filter with query param)
router.get('/pending', deliveriesController.getAllDeliveries);

// Get delivery by ID
router.get('/:id', deliveriesController.getDeliveryById);

// Create new delivery (schedule)
router.post('/', deliveriesController.createDelivery);

// Update delivery
router.put('/:id', deliveriesController.updateDelivery);

// Update delivery status
router.patch('/:id/status', deliveriesController.updateDeliveryStatus);

// These use updateDeliveryStatus with different params
// Start delivery
// router.patch('/:id/start', deliveriesController.startDelivery);

// Complete delivery
// router.patch('/:id/complete', deliveriesController.completeDelivery);

// Cancel delivery
// router.patch('/:id/cancel', deliveriesController.cancelDelivery);

module.exports = router;

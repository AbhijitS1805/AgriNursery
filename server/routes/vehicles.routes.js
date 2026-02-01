const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehicles.controller');

// Get all vehicles
router.get('/', vehiclesController.getAllVehicles);

// Get vehicle statistics
router.get('/stats', vehiclesController.getVehicleStats);

// Get vehicle by ID
router.get('/:id', vehiclesController.getVehicleById);

// Create new vehicle
router.post('/', vehiclesController.createVehicle);

// Update vehicle
router.put('/:id', vehiclesController.updateVehicle);

// Delete vehicle
router.delete('/:id', vehiclesController.deleteVehicle);

// Add maintenance record
router.post('/:id/maintenance', vehiclesController.addMaintenance);

module.exports = router;

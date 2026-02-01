const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production-simple.controller');

// Simple production routes
router.get('/simple', productionController.getAllProductions);
router.post('/simple', productionController.createProduction);
router.post('/simple/:id/move', productionController.moveToPolyhouse);
router.get('/ready-crops', productionController.getReadyCrops);

module.exports = router;

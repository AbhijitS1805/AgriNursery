const express = require('express');
const router = express.Router();
const polyhouseController = require('../controllers/polyhouse.controller');

// Sites
router.get('/sites', polyhouseController.getSites);

// Polyhouses
router.get('/', polyhouseController.getPolyhouses);
router.post('/', polyhouseController.createPolyhouse);
router.put('/:id', polyhouseController.updatePolyhouse);
router.delete('/:id', polyhouseController.deletePolyhouse);
router.get('/utilization', polyhouseController.getUtilization);

// Sections
router.get('/sections', polyhouseController.getAllSections);
router.get('/:id/sections', polyhouseController.getSectionsByPolyhouse);
router.post('/sections', polyhouseController.createSection);

// Environmental Logs
router.get('/sections/:id/environment', polyhouseController.getEnvironmentalLogs);
router.post('/sections/:id/environment', polyhouseController.createEnvironmentalLog);

module.exports = router;

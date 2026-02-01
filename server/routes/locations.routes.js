const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locations.controller');

// Location hierarchy routes
router.get('/states', locationsController.getStates);
router.get('/districts/:stateId', locationsController.getDistrictsByState);
router.get('/talukas/:districtId', locationsController.getTalukasByDistrict);
router.get('/villages/:talukaId', locationsController.getVillagesByTaluka);
router.post('/villages', locationsController.createVillage);

module.exports = router;

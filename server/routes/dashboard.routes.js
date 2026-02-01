const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/stats', dashboardController.getDashboardStats);
router.get('/alerts', dashboardController.getAlerts);

module.exports = router;

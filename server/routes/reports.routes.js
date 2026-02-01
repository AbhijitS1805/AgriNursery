const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

// Financial Reports
router.get('/profit-by-variety', reportController.getProfitByVariety);
router.get('/batch-costing', reportController.getBatchCosting);

// Inventory Reports
router.get('/stock-status', reportController.getStockStatus);

// Production Reports
router.get('/batch-summary', reportController.getBatchSummary);
router.get('/mortality-analysis', reportController.getMortalityAnalysis);

module.exports = router;

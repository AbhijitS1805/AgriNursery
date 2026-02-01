const express = require('express');
const router = express.Router();
const supplierPerformanceController = require('../controllers/supplier-performance.controller');

// Scorecards & Rankings
router.get('/scorecards', supplierPerformanceController.getSupplierScorecards);
router.get('/top-suppliers', supplierPerformanceController.getTopSuppliers);
router.get('/underperforming', supplierPerformanceController.getUnderperformingSuppliers);

// Supplier-specific metrics
router.get('/:supplier_id/metrics', supplierPerformanceController.getSupplierMetrics);
router.get('/:supplier_id/germination', supplierPerformanceController.getGerminationHistory);
router.get('/:supplier_id/ratings', supplierPerformanceController.getSupplierRatings);

// Record performance data
router.post('/delivery-performance', supplierPerformanceController.recordDeliveryPerformance);
router.post('/germination', supplierPerformanceController.recordGermination);
router.post('/rating', supplierPerformanceController.createSupplierRating);

// Update metrics (for cron jobs or manual refresh)
router.post('/update-metrics', supplierPerformanceController.updateMonthlyMetrics);

module.exports = router;

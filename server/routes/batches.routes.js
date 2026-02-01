const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');

// Batch Management Routes
router.get('/', batchController.getAllBatches);
router.get('/active', batchController.getActiveBatches);
router.get('/varieties', batchController.getVarieties);
router.get('/stages', batchController.getGrowthStages);
router.get('/sections', batchController.getAvailableSections);
router.get('/:id', batchController.getBatchById);
router.post('/', batchController.createBatch);
router.put('/:id', batchController.updateBatch);
router.put('/:id/stage', batchController.updateBatchStage);
router.post('/:id/mortality', batchController.recordMortality);
router.post('/:id/cost', batchController.updateBatchCost);
router.get('/:id/history', batchController.getBatchHistory);

// Polyhouse Movement Routes
router.post('/move', batchController.moveBatchToPolyhouse);
router.get('/:batch_id/movements', batchController.getBatchMovements);

module.exports = router;

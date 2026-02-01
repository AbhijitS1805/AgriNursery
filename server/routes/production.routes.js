const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');

// Production Orders
router.get('/orders', productionController.getAllProductionOrders);
router.post('/orders', productionController.createProductionOrder);
router.post('/orders/start', productionController.startProduction);

// Bill of Materials (BOM)
router.get('/bom', productionController.getBOM);
router.post('/bom', productionController.createBOM);
router.put('/bom/:id', productionController.updateBOM);
router.delete('/bom/:id', productionController.deleteBOM);

// Finished Goods
router.get('/finished-goods', productionController.getAllFinishedGoods);
router.post('/finished-goods/convert', productionController.convertBatchToFinishedGoods);

// Material Requisitions
router.get('/requisitions', productionController.getMaterialRequisitions);
router.get('/requisitions/:requisition_id/items', productionController.getMaterialRequisitionItems);

module.exports = router;

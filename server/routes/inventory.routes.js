const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// Inventory Items
router.get('/items', inventoryController.getAllItems);
router.get('/items/low-stock', inventoryController.getLowStockItems);
router.get('/items/:id', inventoryController.getItemById);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// Inventory Transactions
router.get('/transactions', inventoryController.getTransactions);
router.post('/transactions', inventoryController.createTransaction);

// Inventory Batches (for expiry tracking)
router.get('/batches/expired', inventoryController.getExpiredBatches);

// Categories
router.get('/categories', inventoryController.getCategories);

module.exports = router;

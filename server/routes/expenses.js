const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// Expense Routes
router.get('/', expenseController.getAllExpenses);
router.get('/categories', expenseController.getExpenseCategories);
router.get('/summary', expenseController.getExpenseSummary);
router.get('/budget-utilization', expenseController.getBudgetUtilization);
router.get('/:id', expenseController.getExpenseById);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

// Approval
router.put('/:id/approve', expenseController.approveExpense);

module.exports = router;

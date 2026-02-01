const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting.controller');

// =====================================================
// VOUCHER ROUTES
// =====================================================

// Get all vouchers
router.get('/vouchers', accountingController.getAllVouchers);

// Get voucher by ID
router.get('/vouchers/:id', accountingController.getVoucherById);

// Create new voucher
router.post('/vouchers', accountingController.createVoucher);

// Cancel voucher
router.patch('/vouchers/:id/cancel', accountingController.cancelVoucher);

// =====================================================
// LEDGER ROUTES
// =====================================================

// Get all ledgers
router.get('/ledgers', accountingController.getAllLedgers);

// Create ledger
router.post('/ledgers', accountingController.createLedger);

// Get ledger statement
router.get('/ledgers/:id/statement', accountingController.getLedgerStatement);

// =====================================================
// ACCOUNT GROUPS
// =====================================================

// Get all account groups
router.get('/account-groups', accountingController.getAllAccountGroups);

// =====================================================
// VOUCHER TYPES
// =====================================================

// Get all voucher types
router.get('/voucher-types', accountingController.getAllVoucherTypes);

// =====================================================
// COST CENTERS
// =====================================================

// Get all cost centers
router.get('/cost-centers', accountingController.getAllCostCenters);

// =====================================================
// REPORTS
// =====================================================

// Trial Balance
router.get('/reports/trial-balance', accountingController.getTrialBalance);

// Day Book
router.get('/reports/day-book', accountingController.getDayBook);

// Cash/Bank Book
router.get('/reports/cash-bank-book', accountingController.getCashBankBook);

// Outstanding Receivables
router.get('/reports/outstanding-receivables', accountingController.getOutstandingReceivables);

// Outstanding Payables
router.get('/reports/outstanding-payables', accountingController.getOutstandingPayables);

module.exports = router;

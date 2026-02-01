const express = require('express');
const router = express.Router();
const {
  getEmployeeSalary,
  assignEmployeeSalary,
  generatePayroll,
  getPayrollList,
  getPayrollDetails,
  approvePayroll
} = require('../controllers/payroll.controller');

// Employee Salary Management
router.get('/employee-salary/:employee_id', getEmployeeSalary);
router.post('/employee-salary', assignEmployeeSalary);

// Payroll Processing
router.post('/generate', generatePayroll);
router.get('/list', getPayrollList);
router.get('/details/:id', getPayrollDetails);
router.put('/approve/:id', approvePayroll);

module.exports = router;

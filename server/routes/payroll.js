const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const newPayrollController = require('../controllers/payroll.controller');

// NEW: Employee Salary Management
router.get('/employee-salary/:employee_id', newPayrollController.getEmployeeSalary);
router.post('/employee-salary', newPayrollController.assignEmployeeSalary);

// NEW: Payroll Processing
router.post('/generate', newPayrollController.generatePayroll);
router.get('/list', newPayrollController.getPayrollList);
router.get('/details/:id', newPayrollController.getPayrollDetails);
router.put('/approve/:id', newPayrollController.approvePayroll);

// OLD: Salary Structure & Employee Salaries
router.get('/salary-structures', payrollController.getSalaryStructures);
router.get('/employee-salaries', payrollController.getEmployeeSalaries);
router.post('/employee-salaries', payrollController.upsertEmployeeSalary);

// Payroll Runs
router.get('/payroll-runs', payrollController.getPayrollRuns);
router.post('/payroll-runs/process', payrollController.processPayroll);

// Salary Slips
router.get('/salary-slips', payrollController.getSalarySlips);

// Loans
router.get('/loans', payrollController.getLoans);
router.post('/loans', payrollController.createLoan);

// Advances
router.get('/advances', payrollController.getAdvances);
router.post('/advances', payrollController.createAdvance);
router.put('/advances/:id/approve', payrollController.approveAdvance);

module.exports = router;

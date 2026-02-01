const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employees.controller');

// Employee routes
router.get('/', employeesController.getAllEmployees);
router.get('/stats', employeesController.getEmployeeStats);
router.get('/departments', employeesController.getDepartments);
router.get('/designations', employeesController.getDesignations);
router.get('/salary-components', employeesController.getSalaryComponents);
router.get('/:id', employeesController.getEmployeeById);
router.post('/', employeesController.createEmployee);
router.put('/:id', employeesController.updateEmployee);
router.delete('/:id', employeesController.deleteEmployee);

module.exports = router;

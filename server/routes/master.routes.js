const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  getSuppliers,
  createSupplier,
  getVarieties,
  createVariety,
  getSubCategories,
  createSubCategory,
  getCompanies,
  createCompany,
  getUnits,
  createUnit,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent
} = require('../controllers/master.controller');

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);

// Varieties
router.get('/varieties', getVarieties);
router.post('/varieties', createVariety);

// Sub Categories
router.get('/sub-categories', getSubCategories);
router.post('/sub-categories', createSubCategory);

// Companies
router.get('/companies', getCompanies);
router.post('/companies', createCompany);

// Units of Measure
router.get('/units', getUnits);
router.post('/units', createUnit);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Designations
router.get('/designations', getDesignations);
router.post('/designations', createDesignation);
router.put('/designations/:id', updateDesignation);
router.delete('/designations/:id', deleteDesignation);

// Salary Components
router.get('/salary-components', getSalaryComponents);
router.post('/salary-components', createSalaryComponent);
router.put('/salary-components/:id', updateSalaryComponent);
router.delete('/salary-components/:id', deleteSalaryComponent);

module.exports = router;

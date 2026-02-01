const db = require('../config/database');

// ============================================
// INVENTORY CATEGORIES
// ============================================

const getCategories = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, category_name, category_type, description FROM inventory_categories ORDER BY category_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name, category_type, description } = req.body;
    const result = await db.query(
      `INSERT INTO inventory_categories (category_name, category_type, description) 
       VALUES ($1, $2, $3) RETURNING *`,
      [category_name, category_type || 'consumable', description]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// SUPPLIERS
// ============================================

const getSuppliers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, supplier_code, supplier_name, contact_person, phone, email FROM suppliers WHERE is_active = true ORDER BY supplier_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { supplier_name, contact_person, phone, email } = req.body;
    const supplier_code = 'SUP-' + Date.now();
    const result = await db.query(
      `INSERT INTO suppliers (supplier_code, supplier_name, contact_person, phone, email) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [supplier_code, supplier_name, contact_person, phone, email]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// PLANT VARIETIES
// ============================================

const getVarieties = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, variety_code, common_name, botanical_name, category FROM plant_varieties WHERE is_active = true ORDER BY common_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching varieties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createVariety = async (req, res) => {
  try {
    const { common_name, botanical_name, category } = req.body;
    const variety_code = 'VAR-' + Date.now();
    const result = await db.query(
      `INSERT INTO plant_varieties (variety_code, common_name, botanical_name, category) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [variety_code, common_name, botanical_name, category]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating variety:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// SUB CATEGORIES
// ============================================

const getSubCategories = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, sub_category_name, description FROM sub_categories ORDER BY sub_category_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching sub-categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createSubCategory = async (req, res) => {
  try {
    const { sub_category_name, description } = req.body;
    const result = await db.query(
      `INSERT INTO sub_categories (sub_category_name, description) 
       VALUES ($1, $2) RETURNING *`,
      [sub_category_name, description]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating sub-category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// COMPANIES
// ============================================

const getCompanies = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, company_code, company_name, location FROM companies WHERE is_active = true ORDER BY company_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createCompany = async (req, res) => {
  try {
    const { company_name, location } = req.body;
    const company_code = 'COMP-' + Date.now();
    const result = await db.query(
      `INSERT INTO companies (company_code, company_name, location) 
       VALUES ($1, $2, $3) RETURNING *`,
      [company_code, company_name, location]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// UNITS OF MEASURE
// ============================================

const getUnits = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, unit_code, unit_name, unit_type FROM units_of_measure ORDER BY unit_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createUnit = async (req, res) => {
  try {
    const { unit_name, unit_type } = req.body;
    const unit_code = unit_name.toLowerCase().replace(/\s+/g, '_');
    const result = await db.query(
      `INSERT INTO units_of_measure (unit_code, unit_name, unit_type) 
       VALUES ($1, $2, $3) RETURNING *`,
      [unit_code, unit_name, unit_type || 'Other']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// DEPARTMENTS
// ============================================

const getDepartments = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, department_name, description, created_at FROM departments ORDER BY department_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { department_name, description } = req.body;
    const result = await db.query(
      `INSERT INTO departments (department_name, description) 
       VALUES ($1, $2) RETURNING *`,
      [department_name, description]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, description } = req.body;
    const result = await db.query(
      `UPDATE departments 
       SET department_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [department_name, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM departments WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// DESIGNATIONS
// ============================================

const getDesignations = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, designation_name, description, created_at FROM designations ORDER BY designation_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createDesignation = async (req, res) => {
  try {
    const { designation_name, description } = req.body;
    const result = await db.query(
      `INSERT INTO designations (designation_name, description) 
       VALUES ($1, $2) RETURNING *`,
      [designation_name, description]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating designation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation_name, description } = req.body;
    const result = await db.query(
      `UPDATE designations 
       SET designation_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [designation_name, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Designation not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating designation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM designations WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Designation not found' });
    }
    res.json({ success: true, message: 'Designation deleted successfully' });
  } catch (error) {
    console.error('Error deleting designation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// SALARY COMPONENTS
// ============================================

const getSalaryComponents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, component_name, component_type, is_fixed, calculation_type, 
              is_taxable, is_active, display_order, created_at 
       FROM salary_components 
       ORDER BY display_order, component_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching salary components:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createSalaryComponent = async (req, res) => {
  try {
    const { 
      component_name, 
      component_type, 
      is_fixed, 
      calculation_type, 
      is_taxable,
      display_order 
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO salary_components 
       (component_name, component_type, is_fixed, calculation_type, is_taxable, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        component_name, 
        component_type, 
        is_fixed !== false, 
        calculation_type || 'Flat', 
        is_taxable !== false,
        display_order || 0
      ]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating salary component:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateSalaryComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      component_name, 
      component_type, 
      is_fixed, 
      calculation_type, 
      is_taxable,
      is_active,
      display_order 
    } = req.body;
    
    const result = await db.query(
      `UPDATE salary_components 
       SET component_name = $1, component_type = $2, is_fixed = $3, 
           calculation_type = $4, is_taxable = $5, is_active = $6, 
           display_order = $7, updated_at = NOW()
       WHERE id = $8 
       RETURNING *`,
      [
        component_name, 
        component_type, 
        is_fixed, 
        calculation_type, 
        is_taxable,
        is_active,
        display_order,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary component not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating salary component:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteSalaryComponent = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete by setting is_active to false
    const result = await db.query(
      'UPDATE salary_components SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary component not found' });
    }
    res.json({ success: true, message: 'Salary component deactivated successfully' });
  } catch (error) {
    console.error('Error deleting salary component:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
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
};

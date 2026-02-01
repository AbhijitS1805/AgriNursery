const db = require('../config/database');

const employeesController = {
  // Get all employees
  async getAllEmployees(req, res) {
    try {
      const { department_id, status, search } = req.query;
      
      let query = `
        SELECT 
          e.id,
          e.employee_code,
          e.full_name,
          e.mobile,
          e.email,
          e.department_id,
          d.department_name,
          e.designation_id,
          des.designation_name,
          TO_CHAR(e.date_of_joining, 'YYYY-MM-DD') as date_of_joining,
          TO_CHAR(e.date_of_birth, 'YYYY-MM-DD') as date_of_birth,
          e.permanent_address,
          e.emergency_contact_mobile,
          EXTRACT(YEAR FROM AGE(COALESCE(e.date_of_leaving, CURRENT_DATE), e.date_of_joining)) as years_of_service,
          e.employment_type,
          e.status,
          rm.full_name as reporting_manager,
          e.created_at
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (department_id) {
        query += ` AND e.department_id = $${paramCount}`;
        params.push(department_id);
        paramCount++;
      }
      
      if (status) {
        query += ` AND e.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (search) {
        query += ` AND (e.full_name ILIKE $${paramCount} OR e.employee_code ILIKE $${paramCount} OR e.mobile ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }
      
      query += ` ORDER BY e.employee_code DESC`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Error fetching employees', error: error.message });
    }
  },

  // Get employee by ID
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          e.*,
          d.department_name,
          des.designation_name,
          rm.full_name as reporting_manager_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
        WHERE e.id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      // Get salary details
      const salaryQuery = `
        SELECT 
          es.id,
          es.employee_id,
          es.salary_component_id,
          es.amount,
          es.percentage,
          es.effective_from,
          es.is_active,
          sc.component_name,
          sc.component_type
        FROM employee_salaries es
        JOIN salary_components sc ON es.salary_component_id = sc.id
        WHERE es.employee_id = $1 AND es.is_active = true
        ORDER BY sc.display_order
      `;
      
      const salaryResult = await db.query(salaryQuery, [id]);
      
      res.json({
        ...result.rows[0],
        salary_components: salaryResult.rows
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ message: 'Error fetching employee', error: error.message });
    }
  },

  // Create new employee
  async createEmployee(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      await client.query('BEGIN');
      
      const {
        full_name,
        mobile,
        email,
        department_id,
        designation_id,
        date_of_joining,
        date_of_birth,
        address,
        emergency_contact,
        status
      } = req.body;
      
      // Validate required fields
      if (!full_name || !mobile) {
        return res.status(400).json({ 
          message: 'full_name and mobile are required' 
        });
      }
      
      // Split full name into first, middle, last
      const nameParts = full_name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const middle_name = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;
      
      // Generate employee code
      const empCodeResult = await client.query('SELECT generate_employee_code()');
      const employee_code = empCodeResult.rows[0].generate_employee_code;
      
      // Insert employee with basic fields
      const employeeQuery = `
        INSERT INTO employees (
          employee_code, first_name, middle_name, last_name,
          mobile, email, permanent_address,
          emergency_contact_mobile, department_id, designation_id,
          date_of_joining, date_of_birth, status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        RETURNING *
      `;
      
      const employeeResult = await client.query(employeeQuery, [
        employee_code,
        first_name,
        middle_name,
        last_name,
        mobile,
        email,
        address,
        emergency_contact,
        department_id && department_id !== '' ? parseInt(department_id) : null,
        designation_id && designation_id !== '' ? parseInt(designation_id) : null,
        date_of_joining || new Date().toISOString().split('T')[0],
        date_of_birth || null,
        status || 'Active'
      ]);
      
      const newEmployee = employeeResult.rows[0];
      
      // Initialize leave balance for the current year
      const currentYear = new Date().getFullYear();
      const leaveTypesResult = await client.query('SELECT id, max_days_per_year FROM leave_types WHERE is_active = true');
      
      for (const leaveType of leaveTypesResult.rows) {
        await client.query(`
          INSERT INTO employee_leave_balance (employee_id, leave_type_id, year, allocated_days)
          VALUES ($1, $2, $3, $4)
        `, [newEmployee.id, leaveType.id, currentYear, leaveType.max_days_per_year]);
      }
      
      await client.query('COMMIT');
      
      res.status(201).json(newEmployee);
      
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error creating employee:', error);
      
      if (error.constraint === 'employees_mobile_key') {
        return res.status(400).json({ message: 'Mobile number already exists' });
      }
      if (error.constraint === 'employees_aadhar_number_key') {
        return res.status(400).json({ message: 'Aadhar number already exists' });
      }
      if (error.constraint === 'employees_pan_number_key') {
        return res.status(400).json({ message: 'PAN number already exists' });
      }
      
      res.status(500).json({ message: 'Error creating employee', error: error.message });
    } finally {
      if (client) client.release();
    }
  },

  // Update employee
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const {
        full_name,
        mobile,
        email,
        department_id,
        designation_id,
        date_of_joining,
        date_of_birth,
        address,
        emergency_contact,
        status
      } = req.body;
      
      // Build update object with only the fields that are provided
      const updateFields = {};
      
      // Handle full_name by splitting it
      if (full_name) {
        const nameParts = full_name.trim().split(' ');
        updateFields.first_name = nameParts[0];
        updateFields.last_name = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        updateFields.middle_name = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;
      }
      
      if (mobile !== undefined) updateFields.mobile = mobile;
      if (email !== undefined) updateFields.email = email;
      if (department_id !== undefined) updateFields.department_id = department_id && department_id !== '' ? parseInt(department_id) : null;
      if (designation_id !== undefined) updateFields.designation_id = designation_id && designation_id !== '' ? parseInt(designation_id) : null;
      if (date_of_joining !== undefined) updateFields.date_of_joining = date_of_joining;
      if (date_of_birth !== undefined) updateFields.date_of_birth = date_of_birth;
      if (address !== undefined) updateFields.permanent_address = address;
      if (emergency_contact !== undefined) updateFields.emergency_contact_mobile = emergency_contact;
      if (status !== undefined) updateFields.status = status;
      
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }
      
      const setClause = Object.keys(updateFields)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [id, ...Object.values(updateFields)];
      
      const query = `
        UPDATE employees 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: 'Error updating employee', error: error.message });
    }
  },

  // Delete employee (soft delete - change status to Terminated)
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        UPDATE employees 
        SET status = 'Terminated', date_of_leaving = CURRENT_DATE, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      res.json({ message: 'Employee terminated successfully', employee: result.rows[0] });
    } catch (error) {
      console.error('Error terminating employee:', error);
      res.status(500).json({ message: 'Error terminating employee', error: error.message });
    }
  },

  // Get employee statistics
  async getEmployeeStats(req, res) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(*) FILTER (WHERE status = 'Active') as active_employees,
          COUNT(*) FILTER (WHERE status = 'On Leave') as on_leave,
          COUNT(*) FILTER (WHERE status = 'Resigned') as resigned,
          COUNT(*) FILTER (WHERE status = 'Terminated') as terminated,
          COUNT(*) FILTER (WHERE employment_type = 'Permanent') as permanent,
          COUNT(*) FILTER (WHERE employment_type = 'Contract') as contract,
          COUNT(*) FILTER (WHERE employment_type = 'Temporary') as temporary
        FROM employees
      `;
      
      const result = await db.query(query);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      res.status(500).json({ message: 'Error fetching employee stats', error: error.message });
    }
  },

  // Get departments
  async getDepartments(req, res) {
    try {
      const query = 'SELECT * FROM departments WHERE is_active = true ORDER BY department_name';
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ message: 'Error fetching departments', error: error.message });
    }
  },

  // Get designations
  async getDesignations(req, res) {
    try {
      const { department_id } = req.query;
      
      let query = 'SELECT * FROM designations WHERE is_active = true';
      const params = [];
      
      if (department_id) {
        query += ' AND department_id = $1';
        params.push(department_id);
      }
      
      query += ' ORDER BY designation_name';
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching designations:', error);
      res.status(500).json({ message: 'Error fetching designations', error: error.message });
    }
  },

  // Get salary components
  async getSalaryComponents(req, res) {
    try {
      const query = 'SELECT * FROM salary_components WHERE is_active = true ORDER BY display_order';
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching salary components:', error);
      res.status(500).json({ message: 'Error fetching salary components', error: error.message });
    }
  }
};

module.exports = employeesController;

const db = require('../config/database');

// ============================================
// EMPLOYEE SALARY ASSIGNMENT
// ============================================

// Get employee salary structure
const getEmployeeSalary = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    const query = `
      SELECT 
        es.id,
        es.employee_id,
        es.effective_from,
        es.salary_component_id as component_id,
        sc.component_name,
        sc.component_type,
        sc.calculation_type,
        es.amount,
        es.percentage
      FROM employee_salaries es
      JOIN salary_components sc ON es.salary_component_id = sc.id
      WHERE es.employee_id = $1 AND es.is_active = true
      ORDER BY sc.display_order
    `;
    
    const result = await db.query(query, [employee_id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    
    // Calculate CTC
    const ctc = result.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    
    // Group components
    const salaryData = {
      employee_id: result.rows[0].employee_id,
      effective_from: result.rows[0].effective_from,
      ctc: ctc,
      components: result.rows.map(row => ({
        component_id: row.component_id,
        component_name: row.component_name,
        component_type: row.component_type,
        calculation_type: row.calculation_type,
        amount: row.amount,
        percentage: row.percentage
      }))
    };
    
    res.json({ success: true, data: salaryData });
  } catch (error) {
    console.error('Error fetching employee salary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign/Update employee salary
const assignEmployeeSalary = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { employee_id, effective_from, components } = req.body;
    
    if (!employee_id || !components || components.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Employee ID and salary components are required' 
      });
    }
    
    // Deactivate existing salary structure
    await client.query(
      'UPDATE employee_salaries SET is_active = false WHERE employee_id = $1',
      [employee_id]
    );
    
    // Insert new salary components directly
    for (const component of components) {
      await client.query(
        `INSERT INTO employee_salaries 
         (employee_id, salary_component_id, amount, percentage, effective_from, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [
          employee_id,
          component.component_id,
          component.amount || 0,
          component.percentage || null,
          effective_from || new Date().toISOString().split('T')[0]
        ]
      );
    }
    
    // Calculate CTC
    const ctc = components.reduce((total, comp) => {
      return total + parseFloat(comp.amount || 0);
    }, 0);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Salary assigned successfully',
      data: { ctc }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning employee salary:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

// ============================================
// PAYROLL PROCESSING
// ============================================

// Generate monthly payroll
const generatePayroll = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { month, year, department_id } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Month and year are required' 
      });
    }
    
    // Get all active employees
    let employeeQuery = `
      SELECT e.id, e.employee_code, e.full_name, e.department_id
      FROM employees e
      WHERE e.status = 'Active'
    `;
    
    const params = [];
    if (department_id) {
      employeeQuery += ' AND e.department_id = $1';
      params.push(department_id);
    }
    
    const employees = await client.query(employeeQuery, params);
    
    if (employees.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active employees found' 
      });
    }
    
    let processedCount = 0;
    
    for (const employee of employees.rows) {
      // Get employee's active salary components
      const salaryQuery = `
        SELECT 
          es.salary_component_id,
          sc.component_name,
          sc.component_type,
          es.amount,
          es.percentage
        FROM employee_salaries es
        JOIN salary_components sc ON es.salary_component_id = sc.id
        WHERE es.employee_id = $1 AND es.is_active = true
        ORDER BY sc.display_order
      `;
      
      const salaryResult = await client.query(salaryQuery, [employee.id]);
      
      if (salaryResult.rows.length === 0) {
        console.log(`Skipping employee ${employee.employee_code} - no salary structure`);
        continue;
      }
      
      // Calculate gross salary
      const grossSalary = salaryResult.rows.reduce((sum, comp) => sum + parseFloat(comp.amount || 0), 0);
      
      // Check if payroll already exists for this employee/month/year
      const existingPayroll = await client.query(
        `SELECT id FROM payroll 
         WHERE employee_id = $1 AND month = $2 AND year = $3`,
        [employee.id, month, year]
      );
      
      if (existingPayroll.rows.length > 0) {
        console.log(`Payroll already exists for employee ${employee.employee_code}`);
        continue;
      }
      
      let totalEarnings = 0;
      let totalDeductions = 0;
      
      // Calculate earnings and deductions
      for (const comp of salaryResult.rows) {
        const amount = parseFloat(comp.amount || 0);
        if (comp.component_type === 'Earning') {
          totalEarnings += amount;
        } else if (comp.component_type === 'Deduction') {
          totalDeductions += amount;
        }
      }
      
      const netSalary = totalEarnings - totalDeductions;
      const basicSalary = salaryResult.rows.find(c => c.component_name.includes('Basic'))?.amount || totalEarnings * 0.5;
      
      // Generate payroll number
      const payrollNumber = `PAY-${year}${String(month).padStart(2, '0')}-${String(employee.id).padStart(4, '0')}`;
      
      // Create payroll record
      const payrollResult = await client.query(
        `INSERT INTO payroll (
          payroll_number, employee_id, month, year, 
          total_working_days, present_days, 
          basic_salary, gross_salary, total_earnings, total_deductions, net_salary,
          status
        )
         VALUES ($1, $2, $3, $4, 30, 30, $5, $6, $7, $8, $9, 'Draft')
         RETURNING id`,
        [payrollNumber, employee.id, month, year, basicSalary, grossSalary, totalEarnings, totalDeductions, netSalary]
      );
      
      const payroll_id = payrollResult.rows[0].id;
      
      // Insert payroll details for each component
      for (const comp of salaryResult.rows) {
        const amount = parseFloat(comp.amount || 0);
        
        await client.query(
          `INSERT INTO payroll_details 
           (payroll_id, salary_component_id, amount)
           VALUES ($1, $2, $3)`,
          [payroll_id, comp.salary_component_id, amount]
        );
      }
      
      processedCount++;
    }
    
    await client.query('COMMIT');
    
    const skippedCount = employees.rows.length - processedCount;
    const message = processedCount > 0 
      ? `Payroll generated for ${processedCount} employee(s)${skippedCount > 0 ? `. ${skippedCount} already exist(s) for this period.` : ''}`
      : `All ${skippedCount} employee(s) already have payroll for this period`;
    
    res.json({ 
      success: true, 
      message,
      data: { processed: processedCount, skipped: skippedCount, total: employees.rows.length }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating payroll:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

// Get payroll list
const getPayrollList = async (req, res) => {
  try {
    const { month, year, department_id, status } = req.query;
    
    let query = `
      SELECT 
        p.id,
        p.employee_id,
        e.employee_code,
        e.full_name as employee_name,
        d.department_name,
        p.month,
        p.year,
        p.gross_salary,
        p.total_earnings,
        p.total_deductions,
        p.net_salary,
        p.status,
        p.payment_date
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (month) {
      query += ` AND p.month = $${paramCount}`;
      params.push(month);
      paramCount++;
    }
    
    if (year) {
      query += ` AND p.year = $${paramCount}`;
      params.push(year);
      paramCount++;
    }
    
    if (department_id) {
      query += ` AND e.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY p.year DESC, p.month DESC, e.employee_code`;
    
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
    
  } catch (error) {
    console.error('Error fetching payroll list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payroll details
const getPayrollDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payrollQuery = `
      SELECT 
        p.*,
        e.employee_code,
        e.full_name,
        d.department_name,
        des.designation_name
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE p.id = $1
    `;
    
    const payroll = await db.query(payrollQuery, [id]);
    
    if (payroll.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    
    // Get payroll details (components)
    const detailsQuery = `
      SELECT 
        pd.*,
        sc.component_name,
        sc.component_type
      FROM payroll_details pd
      JOIN salary_components sc ON pd.salary_component_id = sc.id
      WHERE pd.payroll_id = $1
      ORDER BY sc.display_order
    `;
    
    const details = await db.query(detailsQuery, [id]);
    
    res.json({ 
      success: true, 
      data: {
        ...payroll.rows[0],
        components: details.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching payroll details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve payroll and create accounting entry
const approvePayroll = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get payroll details with components
    const payrollResult = await client.query(
      `SELECT p.*, e.department_id, e.full_name
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.id = $1`,
      [id]
    );
    
    if (payrollResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    
    const payroll = payrollResult.rows[0];
    
    if (payroll.status === 'Paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: 'Payroll already paid' 
      });
    }
    
    // Get payroll component details for individual payables
    const componentsResult = await client.query(
      `SELECT pd.*, sc.component_name, sc.component_type
       FROM payroll_details pd
       JOIN salary_components sc ON pd.salary_component_id = sc.id
       WHERE pd.payroll_id = $1 AND sc.component_type = 'Deduction'`,
      [id]
    );
    
    // Get voucher type for payroll
    const voucherTypeResult = await client.query(
      `SELECT id FROM voucher_types WHERE type_code = 'PAY' LIMIT 1`
    );
    
    if (voucherTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ 
        success: false, 
        error: 'Payroll voucher type not configured' 
      });
    }
    
    const voucherTypeId = voucherTypeResult.rows[0].id;
    
    // Generate voucher number
    const voucherNumber = `PAY-${payroll.year}${String(payroll.month).padStart(2, '0')}-${String(payroll.employee_id).padStart(4, '0')}`;
    
    // Create voucher
    const voucherResult = await client.query(
      `INSERT INTO vouchers (
        voucher_type_id, voucher_number, voucher_date, 
        narration, source_type, source_id, 
        total_amount, status
      )
      VALUES ($1, $2, CURRENT_DATE, $3, 'PAYROLL', $4, $5, 'Posted')
      RETURNING id`,
      [
        voucherTypeId,
        voucherNumber,
        `Salary Payment - ${payroll.full_name} - ${payroll.month}/${payroll.year}`,
        id,
        payroll.gross_salary
      ]
    );
    
    const voucherId = voucherResult.rows[0].id;
    
    // Get ledger IDs
    const salaryLedger = await client.query(
      `SELECT id FROM ledgers WHERE ledger_code = 'SAL-001' LIMIT 1`
    );
    const cashLedger = await client.query(
      `SELECT id FROM ledgers WHERE ledger_code = 'CASH-001' LIMIT 1`
    );
    
    if (salaryLedger.rows.length === 0 || cashLedger.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ 
        success: false, 
        error: 'Required ledgers not configured. Please run payroll accounting setup.' 
      });
    }
    
    let entryNumber = 1;
    
    // Debit: Salary Expense (total earnings, not gross)
    await client.query(
      `INSERT INTO journal_entries (
        voucher_id, entry_number, ledger_id, 
        debit_amount, credit_amount, narration
      )
      VALUES ($1, $2, $3, $4, 0, 'Salary expense')`,
      [voucherId, entryNumber++, salaryLedger.rows[0].id, payroll.total_earnings]
    );
    
    // Credit: Cash (net salary paid)
    await client.query(
      `INSERT INTO journal_entries (
        voucher_id, entry_number, ledger_id, 
        debit_amount, credit_amount, narration
      )
      VALUES ($1, $2, $3, 0, $4, 'Net salary paid')`,
      [voucherId, entryNumber++, cashLedger.rows[0].id, payroll.net_salary]
    );
    
    // Credit: Individual deduction payables (PF, TDS, PT, ESI)
    for (const component of componentsResult.rows) {
      let ledgerCode = null;
      
      // Map component to ledger
      if (component.component_name.includes('PF') || component.component_name.includes('Provident')) {
        ledgerCode = 'SAL-002'; // PF Payable
      } else if (component.component_name.includes('TDS') || component.component_name.includes('Tax')) {
        ledgerCode = 'SAL-003'; // TDS Payable
      } else if (component.component_name.includes('PT') || component.component_name.includes('Professional')) {
        ledgerCode = 'SAL-004'; // PT Payable
      } else if (component.component_name.includes('ESI') || component.component_name.includes('Insurance')) {
        ledgerCode = 'SAL-005'; // ESI Payable
      }
      
      if (ledgerCode && component.amount > 0) {
        const payableLedger = await client.query(
          `SELECT id FROM ledgers WHERE ledger_code = $1 LIMIT 1`,
          [ledgerCode]
        );
        
        if (payableLedger.rows.length > 0) {
          await client.query(
            `INSERT INTO journal_entries (
              voucher_id, entry_number, ledger_id, 
              debit_amount, credit_amount, narration
            )
            VALUES ($1, $2, $3, 0, $4, $5)`,
            [
              voucherId, 
              entryNumber++, 
              payableLedger.rows[0].id, 
              component.amount,
              `${component.component_name} deduction`
            ]
          );
        }
      }
    }
    
    // Update payroll status
    await client.query(
      `UPDATE payroll 
       SET status = 'Paid', payment_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Payroll approved and accounting entries created',
      data: {
        payroll_id: id,
        voucher_id: voucherId,
        voucher_number: voucherNumber
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving payroll:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getEmployeeSalary,
  assignEmployeeSalary,
  generatePayroll,
  getPayrollList,
  getPayrollDetails,
  approvePayroll
};

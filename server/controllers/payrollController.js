const pool = require('../config/database');

// Get salary structures
exports.getSalaryStructures = async (req, res) => {
    try {
        const query = 'SELECT * FROM salary_structures WHERE is_active = true ORDER BY structure_name';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salary structures:', error);
        res.status(500).json({ error: 'Failed to fetch salary structures' });
    }
};

// Get employee salaries
exports.getEmployeeSalaries = async (req, res) => {
    try {
        const query = `
            SELECT es.*, e.full_name as employee_name, e.employee_code, e.designation
            FROM employee_salaries es
            JOIN employees e ON es.employee_id = e.id
            WHERE es.is_active = true
            ORDER BY e.full_name
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching employee salaries:', error);
        res.status(500).json({ error: 'Failed to fetch employee salaries' });
    }
};

// Create/Update employee salary
exports.upsertEmployeeSalary = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            employee_id,
            structure_id,
            basic_salary,
            hra,
            da,
            ta,
            medical_allowance,
            other_allowances,
            pf_employee,
            pf_employer,
            esi_employee,
            esi_employer,
            professional_tax,
            tds,
            other_deductions,
            ctc,
            net_salary,
            effective_from
        } = req.body;
        
        // Check if salary already exists
        const checkQuery = 'SELECT id FROM employee_salaries WHERE employee_id = $1 AND is_active = true';
        const checkResult = await client.query(checkQuery, [employee_id]);
        
        if (checkResult.rows.length > 0) {
            // Update existing
            const updateQuery = `
                UPDATE employee_salaries
                SET structure_id = $1, basic_salary = $2, hra = $3, da = $4, ta = $5,
                    medical_allowance = $6, other_allowances = $7, pf_employee = $8,
                    pf_employer = $9, esi_employee = $10, esi_employer = $11,
                    professional_tax = $12, tds = $13, other_deductions = $14,
                    ctc = $15, net_salary = $16, effective_from = $17,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $18
                RETURNING *
            `;
            
            const values = [
                structure_id, basic_salary, hra, da, ta, medical_allowance,
                other_allowances, pf_employee, pf_employer, esi_employee,
                esi_employer, professional_tax, tds, other_deductions,
                ctc, net_salary, effective_from, checkResult.rows[0].id
            ];
            
            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');
            res.json(result.rows[0]);
        } else {
            // Insert new
            const insertQuery = `
                INSERT INTO employee_salaries (
                    employee_id, structure_id, basic_salary, hra, da, ta,
                    medical_allowance, other_allowances, pf_employee, pf_employer,
                    esi_employee, esi_employer, professional_tax, tds,
                    other_deductions, ctc, net_salary, effective_from
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING *
            `;
            
            const values = [
                employee_id, structure_id, basic_salary, hra, da, ta,
                medical_allowance, other_allowances, pf_employee, pf_employer,
                esi_employee, esi_employer, professional_tax, tds,
                other_deductions, ctc, net_salary, effective_from
            ];
            
            const result = await client.query(insertQuery, values);
            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving employee salary:', error);
        res.status(500).json({ error: 'Failed to save employee salary' });
    } finally {
        client.release();
    }
};

// Get payroll runs
exports.getPayrollRuns = async (req, res) => {
    try {
        const { month, year, status } = req.query;
        
        let query = 'SELECT * FROM payroll_runs WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (month) {
            query += ` AND month = $${paramCount++}`;
            params.push(month);
        }
        
        if (year) {
            query += ` AND year = $${paramCount++}`;
            params.push(year);
        }
        
        if (status) {
            query += ` AND status = $${paramCount++}`;
            params.push(status);
        }
        
        query += ' ORDER BY year DESC, month DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payroll runs:', error);
        res.status(500).json({ error: 'Failed to fetch payroll runs' });
    }
};

// Process payroll
exports.processPayroll = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { month, year, pay_date } = req.body;
        
        // Create payroll run
        const payrollRunQuery = `
            INSERT INTO payroll_runs (month, year, pay_date, status)
            VALUES ($1, $2, $3, 'Processing')
            RETURNING *
        `;
        
        const payrollRunResult = await client.query(payrollRunQuery, [month, year, pay_date]);
        const payrollRun = payrollRunResult.rows[0];
        
        // Get all active employees with salaries
        const employeesQuery = `
            SELECT e.id, e.full_name, e.employee_code, es.*
            FROM employees e
            JOIN employee_salaries es ON e.id = es.employee_id
            WHERE e.status = 'Active' AND es.is_active = true
        `;
        
        const employeesResult = await client.query(employeesQuery);
        
        // Get attendance for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];
        
        let totalPayrollAmount = 0;
        
        for (const emp of employeesResult.rows) {
            // Get attendance count
            const attendanceQuery = `
                SELECT COUNT(*) as days_present
                FROM attendance
                WHERE employee_id = $1 AND date BETWEEN $2 AND $3 AND status = 'Present'
            `;
            
            const attendanceResult = await client.query(attendanceQuery, [emp.id, startDate, endDate]);
            const daysPresent = parseInt(attendanceResult.rows[0].days_present);
            const workingDays = 26; // Standard working days
            
            // Calculate salary based on attendance
            const salaryFactor = daysPresent / workingDays;
            const basicEarned = emp.basic_salary * salaryFactor;
            const hraEarned = emp.hra * salaryFactor;
            const daEarned = emp.da * salaryFactor;
            const taEarned = emp.ta * salaryFactor;
            const medicalEarned = emp.medical_allowance * salaryFactor;
            const otherAllowancesEarned = emp.other_allowances * salaryFactor;
            
            const grossSalary = basicEarned + hraEarned + daEarned + taEarned + medicalEarned + otherAllowancesEarned;
            
            // Get loan EMI deductions
            const loanQuery = `
                SELECT COALESCE(SUM(emi_amount), 0) as loan_emi
                FROM loan_emi_schedule
                WHERE employee_id = $1 AND emi_date <= $2 AND payment_status = 'Pending'
                LIMIT 1
            `;
            
            const loanResult = await client.query(loanQuery, [emp.id, endDate]);
            const loanEmi = parseFloat(loanResult.rows[0].loan_emi);
            
            // Get advance recovery
            const advanceQuery = `
                SELECT COALESCE(installment_amount, 0) as advance_recovery
                FROM salary_advances
                WHERE employee_id = $1 AND status = 'Approved' AND recovery_completed = false
                LIMIT 1
            `;
            
            const advanceResult = await client.query(advanceQuery, [emp.id]);
            const advanceRecovery = advanceResult.rows[0].advance_recovery ? parseFloat(advanceResult.rows[0].advance_recovery) : 0;
            
            const totalDeductions = emp.pf_employee + emp.esi_employee + emp.professional_tax + emp.tds + emp.other_deductions + loanEmi + advanceRecovery;
            const netSalary = grossSalary - totalDeductions;
            
            // Create salary slip
            const slipQuery = `
                INSERT INTO salary_slips (
                    payroll_run_id, employee_id, month, year,
                    basic_salary, hra, da, ta, medical_allowance, other_allowances,
                    gross_salary, pf_deduction, esi_deduction, professional_tax,
                    tds, loan_emi, advance_recovery, other_deductions,
                    total_deductions, net_salary, days_present, days_absent, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'Generated')
            `;
            
            await client.query(slipQuery, [
                payrollRun.id, emp.id, month, year,
                basicEarned, hraEarned, daEarned, taEarned, medicalEarned, otherAllowancesEarned,
                grossSalary, emp.pf_employee, emp.esi_employee, emp.professional_tax,
                emp.tds, loanEmi, advanceRecovery, emp.other_deductions,
                totalDeductions, netSalary, daysPresent, (workingDays - daysPresent)
            ]);
            
            totalPayrollAmount += netSalary;
        }
        
        // Update payroll run
        await client.query(
            'UPDATE payroll_runs SET total_employees = $1, total_amount = $2, status = $3 WHERE id = $4',
            [employeesResult.rows.length, totalPayrollAmount, 'Completed', payrollRun.id]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Payroll processed successfully', payroll_run_id: payrollRun.id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing payroll:', error);
        res.status(500).json({ error: 'Failed to process payroll' });
    } finally {
        client.release();
    }
};

// Get salary slips
exports.getSalarySlips = async (req, res) => {
    try {
        const { payroll_run_id, employee_id, month, year } = req.query;
        
        let query = `
            SELECT ss.*, e.full_name as employee_name, e.employee_code
            FROM salary_slips ss
            JOIN employees e ON ss.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        
        if (payroll_run_id) {
            query += ` AND ss.payroll_run_id = $${paramCount++}`;
            params.push(payroll_run_id);
        }
        
        if (employee_id) {
            query += ` AND ss.employee_id = $${paramCount++}`;
            params.push(employee_id);
        }
        
        if (month) {
            query += ` AND ss.month = $${paramCount++}`;
            params.push(month);
        }
        
        if (year) {
            query += ` AND ss.year = $${paramCount++}`;
            params.push(year);
        }
        
        query += ' ORDER BY ss.year DESC, ss.month DESC, e.full_name';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salary slips:', error);
        res.status(500).json({ error: 'Failed to fetch salary slips' });
    }
};

// Get employee loans
exports.getLoans = async (req, res) => {
    try {
        const { employee_id, status } = req.query;
        
        let query = `
            SELECT el.*, e.full_name as employee_name, e.employee_code
            FROM employee_loans el
            JOIN employees e ON el.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        
        if (employee_id) {
            query += ` AND el.employee_id = $${paramCount++}`;
            params.push(employee_id);
        }
        
        if (status) {
            query += ` AND el.status = $${paramCount++}`;
            params.push(status);
        }
        
        query += ' ORDER BY el.loan_date DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans' });
    }
};

// Create loan
exports.createLoan = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            employee_id,
            loan_amount,
            interest_rate,
            tenure_months,
            loan_date,
            purpose
        } = req.body;
        
        // Calculate EMI
        const monthlyRate = interest_rate / 100 / 12;
        const emiAmount = (loan_amount * monthlyRate * Math.pow(1 + monthlyRate, tenure_months)) / 
                         (Math.pow(1 + monthlyRate, tenure_months) - 1);
        
        const totalRepayment = emiAmount * tenure_months;
        const totalInterest = totalRepayment - loan_amount;
        
        // Create loan
        const loanQuery = `
            INSERT INTO employee_loans (
                employee_id, loan_amount, interest_rate, tenure_months,
                emi_amount, total_interest, total_repayment, loan_date,
                purpose, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
            RETURNING *
        `;
        
        const loanResult = await client.query(loanQuery, [
            employee_id, loan_amount, interest_rate, tenure_months,
            emiAmount, totalInterest, totalRepayment, loan_date, purpose
        ]);
        
        const loan = loanResult.rows[0];
        
        // Generate EMI schedule
        const startDate = new Date(loan_date);
        for (let i = 1; i <= tenure_months; i++) {
            const emiDate = new Date(startDate);
            emiDate.setMonth(emiDate.getMonth() + i);
            
            const scheduleQuery = `
                INSERT INTO loan_emi_schedule (
                    loan_id, employee_id, emi_number, emi_date,
                    emi_amount, payment_status
                ) VALUES ($1, $2, $3, $4, $5, 'Pending')
            `;
            
            await client.query(scheduleQuery, [
                loan.id, employee_id, i, emiDate.toISOString().split('T')[0], emiAmount
            ]);
        }
        
        await client.query('COMMIT');
        res.status(201).json(loan);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating loan:', error);
        res.status(500).json({ error: 'Failed to create loan' });
    } finally {
        client.release();
    }
};

// Get salary advances
exports.getAdvances = async (req, res) => {
    try {
        const { employee_id, status } = req.query;
        
        let query = `
            SELECT sa.*, e.full_name as employee_name, e.employee_code
            FROM salary_advances sa
            JOIN employees e ON sa.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        
        if (employee_id) {
            query += ` AND sa.employee_id = $${paramCount++}`;
            params.push(employee_id);
        }
        
        if (status) {
            query += ` AND sa.status = $${paramCount++}`;
            params.push(status);
        }
        
        query += ' ORDER BY sa.request_date DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching advances:', error);
        res.status(500).json({ error: 'Failed to fetch advances' });
    }
};

// Create advance
exports.createAdvance = async (req, res) => {
    try {
        const {
            employee_id,
            advance_amount,
            recovery_months,
            request_date,
            reason
        } = req.body;
        
        const installmentAmount = advance_amount / recovery_months;
        
        const query = `
            INSERT INTO salary_advances (
                employee_id, advance_amount, recovery_months,
                installment_amount, request_date, reason, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            employee_id, advance_amount, recovery_months,
            installmentAmount, request_date, reason
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating advance:', error);
        res.status(500).json({ error: 'Failed to create advance' });
    }
};

// Approve advance
exports.approveAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved_by } = req.body;
        
        const query = `
            UPDATE salary_advances
            SET status = 'Approved', approved_by = $1, approved_date = CURRENT_DATE
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [approved_by, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Advance not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error approving advance:', error);
        res.status(500).json({ error: 'Failed to approve advance' });
    }
};

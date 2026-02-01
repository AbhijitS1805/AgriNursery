-- =====================================================
-- PAYROLL & SALARY MANAGEMENT SYSTEM
-- =====================================================

-- Salary Structure Master
CREATE TABLE IF NOT EXISTS salary_structures (
    id SERIAL PRIMARY KEY,
    structure_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary Components (Earnings & Deductions)
CREATE TABLE IF NOT EXISTS salary_components (
    id SERIAL PRIMARY KEY,
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('Earning', 'Deduction')),
    calculation_type VARCHAR(20) CHECK (calculation_type IN ('Fixed', 'Percentage', 'Attendance', 'Performance')),
    is_taxable BOOLEAN DEFAULT TRUE,
    is_statutory BOOLEAN DEFAULT FALSE, -- PF, ESI, PT
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Salary Assignment
CREATE TABLE IF NOT EXISTS employee_salaries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    salary_structure_id INTEGER REFERENCES salary_structures(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Basic Salary
    basic_salary DECIMAL(15,2) NOT NULL,
    gross_salary DECIMAL(15,2),
    
    -- CTC Components
    hra DECIMAL(15,2) DEFAULT 0,
    da DECIMAL(15,2) DEFAULT 0,
    ta DECIMAL(15,2) DEFAULT 0,
    special_allowance DECIMAL(15,2) DEFAULT 0,
    other_allowance DECIMAL(15,2) DEFAULT 0,
    
    -- Deductions
    pf_employee DECIMAL(15,2) DEFAULT 0,
    pf_employer DECIMAL(15,2) DEFAULT 0,
    esi_employee DECIMAL(15,2) DEFAULT 0,
    esi_employer DECIMAL(15,2) DEFAULT 0,
    professional_tax DECIMAL(15,2) DEFAULT 0,
    tds DECIMAL(15,2) DEFAULT 0,
    
    -- Net Salary
    net_salary DECIMAL(15,2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary Component Details (per employee)
CREATE TABLE IF NOT EXISTS employee_salary_components (
    id SERIAL PRIMARY KEY,
    employee_salary_id INTEGER REFERENCES employee_salaries(id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES salary_components(id),
    component_type VARCHAR(20),
    amount DECIMAL(15,2) NOT NULL,
    percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly Payroll Processing
CREATE TABLE IF NOT EXISTS payroll_runs (
    id SERIAL PRIMARY KEY,
    payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
    payroll_year INTEGER NOT NULL,
    payroll_period VARCHAR(20), -- e.g., "Jan 2026"
    
    -- Dates
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    payment_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Processing', 'Processed', 'Paid', 'Cancelled')),
    
    -- Summary
    total_employees INTEGER DEFAULT 0,
    total_gross_salary DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net_salary DECIMAL(15,2) DEFAULT 0,
    
    -- Accounting
    voucher_id INTEGER REFERENCES vouchers(id),
    
    -- Audit
    processed_by INTEGER,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(payroll_month, payroll_year)
);

-- Individual Salary Slips
CREATE TABLE IF NOT EXISTS salary_slips (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    employee_code VARCHAR(50),
    employee_name VARCHAR(255),
    department VARCHAR(100),
    designation VARCHAR(100),
    
    -- Salary Period
    salary_month INTEGER,
    salary_year INTEGER,
    from_date DATE,
    to_date DATE,
    payment_date DATE,
    
    -- Attendance
    working_days INTEGER DEFAULT 0,
    present_days DECIMAL(5,2) DEFAULT 0,
    absent_days DECIMAL(5,2) DEFAULT 0,
    paid_leaves DECIMAL(5,2) DEFAULT 0,
    
    -- Earnings
    basic_salary DECIMAL(15,2) DEFAULT 0,
    hra DECIMAL(15,2) DEFAULT 0,
    da DECIMAL(15,2) DEFAULT 0,
    ta DECIMAL(15,2) DEFAULT 0,
    overtime_amount DECIMAL(15,2) DEFAULT 0,
    bonus DECIMAL(15,2) DEFAULT 0,
    incentive DECIMAL(15,2) DEFAULT 0,
    other_earnings DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) DEFAULT 0,
    
    -- Deductions
    pf_employee DECIMAL(15,2) DEFAULT 0,
    esi_employee DECIMAL(15,2) DEFAULT 0,
    professional_tax DECIMAL(15,2) DEFAULT 0,
    tds DECIMAL(15,2) DEFAULT 0,
    loan_deduction DECIMAL(15,2) DEFAULT 0,
    advance_deduction DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    
    -- Net Pay
    net_salary DECIMAL(15,2) DEFAULT 0,
    
    -- Payment Status
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Hold', 'Cancelled')),
    payment_mode VARCHAR(20),
    payment_reference VARCHAR(100),
    
    -- Notes
    remarks TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, salary_month, salary_year)
);

-- Loan Management
CREATE TABLE IF NOT EXISTS employee_loans (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    loan_number VARCHAR(50) UNIQUE,
    loan_type VARCHAR(50) CHECK (loan_type IN ('Personal', 'Vehicle', 'Education', 'Medical', 'Emergency', 'Other')),
    
    -- Loan Details
    loan_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    tenure_months INTEGER NOT NULL,
    emi_amount DECIMAL(15,2) NOT NULL,
    
    -- Dates
    sanction_date DATE NOT NULL,
    disbursement_date DATE,
    start_date DATE NOT NULL, -- EMI start date
    end_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Active', 'Closed', 'Written Off')),
    
    -- Tracking
    total_paid DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2),
    
    -- Approval
    approved_by INTEGER,
    approved_date DATE,
    rejection_reason TEXT,
    
    -- Notes
    purpose TEXT,
    remarks TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan EMI Schedule
CREATE TABLE IF NOT EXISTS loan_emi_schedule (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES employee_loans(id) ON DELETE CASCADE,
    emi_number INTEGER NOT NULL,
    emi_date DATE NOT NULL,
    emi_amount DECIMAL(15,2) NOT NULL,
    principal_amount DECIMAL(15,2) DEFAULT 0,
    interest_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_balance DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Waived')),
    payment_date DATE,
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary Advances
CREATE TABLE IF NOT EXISTS salary_advances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    advance_number VARCHAR(50) UNIQUE,
    advance_amount DECIMAL(15,2) NOT NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    required_date DATE,
    reason TEXT,
    
    -- Approval
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Disbursed', 'Recovered')),
    approved_by INTEGER,
    approved_date DATE,
    rejection_reason TEXT,
    
    -- Disbursement
    disbursement_date DATE,
    payment_mode VARCHAR(20),
    payment_reference VARCHAR(100),
    
    -- Recovery
    recovery_mode VARCHAR(20) CHECK (recovery_mode IN ('Single', 'Installments')),
    installments INTEGER DEFAULT 1,
    recovered_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Overtime Tracking
CREATE TABLE IF NOT EXISTS overtime_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    overtime_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    overtime_rate DECIMAL(10,2),
    overtime_amount DECIMAL(15,2),
    approved_by INTEGER,
    approval_status VARCHAR(20) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_employee_salaries_employee ON employee_salaries(employee_id);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(payroll_month, payroll_year);
CREATE INDEX idx_salary_slips_employee ON salary_slips(employee_id);
CREATE INDEX idx_salary_slips_period ON salary_slips(salary_month, salary_year);
CREATE INDEX idx_employee_loans_employee ON employee_loans(employee_id);
CREATE INDEX idx_employee_loans_status ON employee_loans(status);
CREATE INDEX idx_salary_advances_employee ON salary_advances(employee_id);
CREATE INDEX idx_salary_advances_status ON salary_advances(status);

-- Triggers
CREATE TRIGGER employee_salaries_update
    BEFORE UPDATE ON employee_salaries
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

CREATE TRIGGER payroll_runs_update
    BEFORE UPDATE ON payroll_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

-- Views
CREATE OR REPLACE VIEW v_employee_salary_summary AS
SELECT 
    e.id as employee_id,
    e.employee_code,
    e.full_name,
    e.department_name,
    e.designation_name,
    es.basic_salary,
    es.gross_salary,
    es.net_salary,
    es.effective_from,
    es.effective_to,
    es.is_active
FROM employees e
LEFT JOIN employee_salaries es ON e.id = es.employee_id AND es.is_active = TRUE
ORDER BY e.full_name;

CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT 
    pr.id,
    pr.payroll_period,
    pr.payroll_month,
    pr.payroll_year,
    pr.from_date,
    pr.to_date,
    pr.payment_date,
    pr.status,
    pr.total_employees,
    pr.total_gross_salary,
    pr.total_deductions,
    pr.total_net_salary,
    COUNT(ss.id) as processed_employees
FROM payroll_runs pr
LEFT JOIN salary_slips ss ON pr.id = ss.payroll_run_id
GROUP BY pr.id
ORDER BY pr.payroll_year DESC, pr.payroll_month DESC;

CREATE OR REPLACE VIEW v_loan_summary AS
SELECT 
    el.id,
    el.loan_number,
    e.employee_code,
    e.full_name,
    el.loan_type,
    el.loan_amount,
    el.emi_amount,
    el.tenure_months,
    el.total_paid,
    el.outstanding_amount,
    el.status,
    el.start_date,
    el.end_date
FROM employee_loans el
JOIN employees e ON el.employee_id = e.id
ORDER BY el.start_date DESC;

COMMENT ON TABLE salary_structures IS 'Salary structure templates';
COMMENT ON TABLE salary_components IS 'Earnings and deduction components';
COMMENT ON TABLE employee_salaries IS 'Employee salary assignments with CTC breakup';
COMMENT ON TABLE payroll_runs IS 'Monthly payroll processing batches';
COMMENT ON TABLE salary_slips IS 'Individual employee salary slips';
COMMENT ON TABLE employee_loans IS 'Employee loan management';
COMMENT ON TABLE salary_advances IS 'Salary advance requests and recovery';
COMMENT ON TABLE overtime_records IS 'Overtime hours and payment tracking';

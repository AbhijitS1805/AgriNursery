-- =====================================================
-- HRMS (Human Resource Management System) Database Schema
-- =====================================================

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(20) UNIQUE,
    description TEXT,
    head_employee_id INTEGER, -- Will be FK to employees table
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Designations/Positions Table
CREATE TABLE IF NOT EXISTS designations (
    id SERIAL PRIMARY KEY,
    designation_name VARCHAR(100) NOT NULL UNIQUE,
    designation_code VARCHAR(20) UNIQUE,
    department_id INTEGER REFERENCES departments(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) GENERATED ALWAYS AS (
        CASE 
            WHEN middle_name IS NOT NULL THEN first_name || ' ' || middle_name || ' ' || last_name
            ELSE first_name || ' ' || last_name
        END
    ) STORED,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5),
    
    -- Contact Information
    mobile VARCHAR(15) NOT NULL,
    alternate_mobile VARCHAR(15),
    email VARCHAR(100),
    permanent_address TEXT,
    current_address TEXT,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_mobile VARCHAR(15),
    emergency_contact_relation VARCHAR(50),
    
    -- Government IDs
    aadhar_number VARCHAR(12) UNIQUE,
    pan_number VARCHAR(10) UNIQUE,
    uan_number VARCHAR(12), -- Universal Account Number for PF
    esic_number VARCHAR(17), -- Employee State Insurance
    
    -- Employment Details
    department_id INTEGER REFERENCES departments(id),
    designation_id INTEGER REFERENCES designations(id),
    date_of_joining DATE NOT NULL,
    date_of_leaving DATE,
    employment_type VARCHAR(20) CHECK (employment_type IN ('Permanent', 'Contract', 'Temporary', 'Intern')) DEFAULT 'Permanent',
    status VARCHAR(20) CHECK (status IN ('Active', 'On Leave', 'Resigned', 'Terminated', 'Retired')) DEFAULT 'Active',
    
    -- Bank Details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(30),
    bank_ifsc_code VARCHAR(11),
    bank_branch VARCHAR(100),
    
    -- Profile
    photo_url TEXT,
    qualification VARCHAR(100),
    previous_experience_years DECIMAL(4,1) DEFAULT 0,
    
    -- System Fields
    reporting_manager_id INTEGER REFERENCES employees(id),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add self-referencing FK for department head
ALTER TABLE departments ADD CONSTRAINT fk_department_head 
    FOREIGN KEY (head_employee_id) REFERENCES employees(id);

-- Salary Structure/Components Table
CREATE TABLE IF NOT EXISTS salary_components (
    id SERIAL PRIMARY KEY,
    component_name VARCHAR(100) NOT NULL UNIQUE,
    component_type VARCHAR(20) CHECK (component_type IN ('Earning', 'Deduction')) NOT NULL,
    is_fixed BOOLEAN DEFAULT true, -- Fixed or variable component
    calculation_type VARCHAR(20) CHECK (calculation_type IN ('Flat', 'Percentage')) DEFAULT 'Flat',
    is_taxable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee Salary Details
CREATE TABLE IF NOT EXISTS employee_salaries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    salary_component_id INTEGER NOT NULL REFERENCES salary_components(id),
    amount DECIMAL(12,2) NOT NULL,
    percentage DECIMAL(5,2), -- For percentage-based components
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, salary_component_id, effective_from)
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS employee_attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    total_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
            ELSE 0
        END
    ) STORED,
    status VARCHAR(20) CHECK (status IN ('Present', 'Absent', 'Half Day', 'Late', 'On Leave', 'Holiday', 'Week Off')) DEFAULT 'Present',
    remarks TEXT,
    marked_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- Leave Types Table
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    leave_type_name VARCHAR(50) NOT NULL UNIQUE,
    leave_code VARCHAR(10) UNIQUE,
    max_days_per_year INTEGER DEFAULT 0,
    carry_forward BOOLEAN DEFAULT false,
    max_carry_forward_days INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee Leave Balance
CREATE TABLE IF NOT EXISTS employee_leave_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    allocated_days DECIMAL(5,2) DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    balance_days DECIMAL(5,2) GENERATED ALWAYS AS (allocated_days - used_days) STORED,
    carry_forward_days DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- Leave Applications Table
CREATE TABLE IF NOT EXISTS leave_applications (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')) DEFAULT 'Pending',
    applied_on TIMESTAMP DEFAULT NOW(),
    approved_by INTEGER REFERENCES employees(id),
    approved_on TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payroll/Salary Processing Table
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    payroll_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    
    -- Working Days
    total_working_days INTEGER NOT NULL,
    present_days DECIMAL(5,2) NOT NULL,
    absent_days DECIMAL(5,2) DEFAULT 0,
    paid_leave_days DECIMAL(5,2) DEFAULT 0,
    unpaid_leave_days DECIMAL(5,2) DEFAULT 0,
    
    -- Salary Breakdown
    basic_salary DECIMAL(12,2) NOT NULL,
    gross_salary DECIMAL(12,2) NOT NULL,
    total_earnings DECIMAL(12,2) NOT NULL,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL,
    
    -- Statutory Deductions
    pf_deduction DECIMAL(12,2) DEFAULT 0,
    esic_deduction DECIMAL(12,2) DEFAULT 0,
    tds DECIMAL(12,2) DEFAULT 0,
    professional_tax DECIMAL(12,2) DEFAULT 0,
    
    -- Other Deductions
    loan_deduction DECIMAL(12,2) DEFAULT 0,
    advance_deduction DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,
    
    -- Payment Details
    payment_date DATE,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('Bank Transfer', 'Cash', 'Cheque', 'UPI')),
    payment_reference VARCHAR(100),
    
    status VARCHAR(20) CHECK (status IN ('Draft', 'Processed', 'Paid', 'Hold')) DEFAULT 'Draft',
    notes TEXT,
    processed_by INTEGER REFERENCES employees(id),
    processed_on TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- Payroll Details (Component-wise breakdown)
CREATE TABLE IF NOT EXISTS payroll_details (
    id SERIAL PRIMARY KEY,
    payroll_id INTEGER NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
    salary_component_id INTEGER NOT NULL REFERENCES salary_components(id),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Employee Loans/Advances
CREATE TABLE IF NOT EXISTS employee_loans (
    id SERIAL PRIMARY KEY,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    loan_type VARCHAR(20) CHECK (loan_type IN ('Advance', 'Loan')) NOT NULL,
    loan_amount DECIMAL(12,2) NOT NULL,
    disbursed_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    
    installment_amount DECIMAL(12,2) NOT NULL,
    total_installments INTEGER NOT NULL,
    paid_installments INTEGER DEFAULT 0,
    remaining_installments INTEGER GENERATED ALWAYS AS (total_installments - paid_installments) STORED,
    
    total_paid DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (disbursed_amount - total_paid) STORED,
    
    loan_date DATE NOT NULL,
    start_deduction_from DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Completed', 'Cancelled')) DEFAULT 'Active',
    
    approved_by INTEGER REFERENCES employees(id),
    approved_on TIMESTAMP,
    reason TEXT,
    remarks TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Loan Installment Payments
CREATE TABLE IF NOT EXISTS loan_installments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES employee_loans(id) ON DELETE CASCADE,
    payroll_id INTEGER REFERENCES payroll(id),
    installment_number INTEGER NOT NULL,
    installment_amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Paid', 'Skipped')) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(loan_id, installment_number)
);

-- Employee Documents
CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES employees(id),
    upload_date TIMESTAMP DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewer_id INTEGER NOT NULL REFERENCES employees(id),
    
    -- Rating Scale (1-5)
    quality_of_work DECIMAL(2,1) CHECK (quality_of_work BETWEEN 1 AND 5),
    productivity DECIMAL(2,1) CHECK (productivity BETWEEN 1 AND 5),
    attendance_punctuality DECIMAL(2,1) CHECK (attendance_punctuality BETWEEN 1 AND 5),
    teamwork DECIMAL(2,1) CHECK (teamwork BETWEEN 1 AND 5),
    communication DECIMAL(2,1) CHECK (communication BETWEEN 1 AND 5),
    overall_rating DECIMAL(2,1),
    
    strengths TEXT,
    areas_of_improvement TEXT,
    goals_for_next_period TEXT,
    reviewer_comments TEXT,
    employee_comments TEXT,
    
    status VARCHAR(20) CHECK (status IN ('Draft', 'Submitted', 'Acknowledged')) DEFAULT 'Draft',
    review_date DATE,
    acknowledged_on TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_mobile ON employees(mobile);

CREATE INDEX idx_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX idx_attendance_date ON employee_attendance(attendance_date);
CREATE INDEX idx_attendance_employee_date ON employee_attendance(employee_id, attendance_date);

CREATE INDEX idx_leave_applications_employee ON leave_applications(employee_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_leave_applications_dates ON leave_applications(from_date, to_date);

CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_month_year ON payroll(month, year);
CREATE INDEX idx_payroll_status ON payroll(status);

CREATE INDEX idx_loans_employee ON employee_loans(employee_id);
CREATE INDEX idx_loans_status ON employee_loans(status);

-- =====================================================
-- AUTO-NUMBERING FUNCTIONS
-- =====================================================

-- Generate Employee Code
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 8) AS INTEGER)), 0) + 1
    INTO next_num
    FROM employees
    WHERE employee_code LIKE 'EMP-' || year_part || '-%';
    
    RETURN 'EMP-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate Leave Application Number
CREATE OR REPLACE FUNCTION generate_leave_application_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM leave_applications
    WHERE application_number LIKE 'LVE-' || year_part || '-%';
    
    RETURN 'LVE-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate Payroll Number
CREATE OR REPLACE FUNCTION generate_payroll_number(p_month INTEGER, p_year INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(payroll_number FROM 16) AS INTEGER)), 0) + 1
    INTO next_num
    FROM payroll
    WHERE payroll_number LIKE 'PAY-' || p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-%';
    
    RETURN 'PAY-' || p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate Loan Number
CREATE OR REPLACE FUNCTION generate_loan_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(loan_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_num
    FROM employee_loans
    WHERE loan_number LIKE 'LOAN-' || year_part || '-%';
    
    RETURN 'LOAN-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designations_updated_at BEFORE UPDATE ON designations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_attendance_updated_at BEFORE UPDATE ON employee_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_loans_updated_at BEFORE UPDATE ON employee_loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update loan paid installments and total paid
CREATE OR REPLACE FUNCTION update_loan_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Paid' AND OLD.status != 'Paid' THEN
        UPDATE employee_loans
        SET 
            paid_installments = paid_installments + 1,
            total_paid = total_paid + NEW.installment_amount
        WHERE id = NEW.loan_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_loan_payment AFTER UPDATE ON loan_installments
    FOR EACH ROW EXECUTE FUNCTION update_loan_payment_status();

-- Auto-update leave balance when leave is approved
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        UPDATE employee_leave_balance
        SET used_days = used_days + NEW.total_days
        WHERE employee_id = NEW.employee_id 
        AND leave_type_id = NEW.leave_type_id
        AND year = EXTRACT(YEAR FROM NEW.from_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_balance AFTER UPDATE ON leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_approval();

-- =====================================================
-- VIEWS
-- =====================================================

-- Employee Summary View
CREATE OR REPLACE VIEW v_employee_summary AS
SELECT 
    e.id,
    e.employee_code,
    e.full_name,
    e.mobile,
    e.email,
    d.department_name,
    des.designation_name,
    e.date_of_joining,
    EXTRACT(YEAR FROM AGE(COALESCE(e.date_of_leaving, CURRENT_DATE), e.date_of_joining)) as years_of_service,
    e.employment_type,
    e.status,
    rm.full_name as reporting_manager,
    e.created_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN designations des ON e.designation_id = des.id
LEFT JOIN employees rm ON e.reporting_manager_id = rm.id;

-- Attendance Summary View
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT 
    ea.employee_id,
    e.employee_code,
    e.full_name,
    EXTRACT(MONTH FROM ea.attendance_date) as month,
    EXTRACT(YEAR FROM ea.attendance_date) as year,
    COUNT(*) as total_days,
    SUM(CASE WHEN ea.status = 'Present' THEN 1 ELSE 0 END) as present_days,
    SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
    SUM(CASE WHEN ea.status = 'Half Day' THEN 0.5 ELSE 0 END) as half_days,
    SUM(CASE WHEN ea.status IN ('On Leave', 'Holiday', 'Week Off') THEN 1 ELSE 0 END) as leave_days,
    AVG(ea.total_hours) as avg_hours_per_day
FROM employee_attendance ea
JOIN employees e ON ea.employee_id = e.id
GROUP BY ea.employee_id, e.employee_code, e.full_name, 
    EXTRACT(MONTH FROM ea.attendance_date), EXTRACT(YEAR FROM ea.attendance_date);

-- Leave Balance Summary View
CREATE OR REPLACE VIEW v_leave_balance_summary AS
SELECT 
    elb.employee_id,
    e.employee_code,
    e.full_name,
    lt.leave_type_name,
    elb.year,
    elb.allocated_days,
    elb.used_days,
    elb.balance_days,
    elb.carry_forward_days
FROM employee_leave_balance elb
JOIN employees e ON elb.employee_id = e.id
JOIN leave_types lt ON elb.leave_type_id = lt.id;

-- Payroll Summary View
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT 
    p.id,
    p.payroll_number,
    p.employee_id,
    e.employee_code,
    e.full_name,
    d.department_name,
    p.month,
    p.year,
    p.present_days,
    p.absent_days,
    p.gross_salary,
    p.total_deductions,
    p.net_salary,
    p.payment_date,
    p.status,
    p.created_at
FROM payroll p
JOIN employees e ON p.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default departments
INSERT INTO departments (department_name, department_code, description) VALUES
('Administration', 'ADMIN', 'Administrative department'),
('Production', 'PROD', 'Plant production and nursery operations'),
('Sales & Marketing', 'SALES', 'Sales and customer relations'),
('Delivery & Logistics', 'DELIVERY', 'Delivery and transportation'),
('Accounts & Finance', 'FINANCE', 'Financial management'),
('HR & Admin', 'HR', 'Human resources')
ON CONFLICT DO NOTHING;

-- Insert default designations
INSERT INTO designations (designation_name, designation_code, department_id) VALUES
('Manager', 'MGR', (SELECT id FROM departments WHERE department_code = 'ADMIN')),
('Assistant Manager', 'ASTMGR', (SELECT id FROM departments WHERE department_code = 'ADMIN')),
('Supervisor', 'SUPV', (SELECT id FROM departments WHERE department_code = 'PROD')),
('Worker', 'WKR', (SELECT id FROM departments WHERE department_code = 'PROD')),
('Sales Executive', 'SALESEXE', (SELECT id FROM departments WHERE department_code = 'SALES')),
('Driver', 'DRV', (SELECT id FROM departments WHERE department_code = 'DELIVERY')),
('Delivery Boy', 'DELBOY', (SELECT id FROM departments WHERE department_code = 'DELIVERY')),
('Accountant', 'ACC', (SELECT id FROM departments WHERE department_code = 'FINANCE')),
('HR Executive', 'HREXE', (SELECT id FROM departments WHERE department_code = 'HR'))
ON CONFLICT DO NOTHING;

-- Insert default salary components
INSERT INTO salary_components (component_name, component_type, is_fixed, calculation_type, is_taxable, display_order) VALUES
('Basic Salary', 'Earning', true, 'Flat', true, 1),
('HRA (House Rent Allowance)', 'Earning', true, 'Percentage', true, 2),
('Conveyance Allowance', 'Earning', true, 'Flat', true, 3),
('Medical Allowance', 'Earning', true, 'Flat', true, 4),
('Special Allowance', 'Earning', true, 'Flat', true, 5),
('Overtime', 'Earning', false, 'Flat', true, 6),
('Bonus', 'Earning', false, 'Flat', true, 7),
('Incentive', 'Earning', false, 'Flat', true, 8),
('PF (Provident Fund)', 'Deduction', true, 'Percentage', false, 9),
('ESIC', 'Deduction', true, 'Percentage', false, 10),
('Professional Tax', 'Deduction', true, 'Flat', false, 11),
('TDS', 'Deduction', true, 'Percentage', false, 12),
('Loan Deduction', 'Deduction', false, 'Flat', false, 13),
('Advance Deduction', 'Deduction', false, 'Flat', false, 14),
('Other Deduction', 'Deduction', false, 'Flat', false, 15)
ON CONFLICT DO NOTHING;

-- Insert default leave types
INSERT INTO leave_types (leave_type_name, leave_code, max_days_per_year, carry_forward, max_carry_forward_days, is_paid, requires_approval) VALUES
('Casual Leave', 'CL', 12, true, 5, true, true),
('Sick Leave', 'SL', 12, false, 0, true, true),
('Earned Leave', 'EL', 15, true, 10, true, true),
('Unpaid Leave', 'UL', 365, false, 0, false, true),
('Maternity Leave', 'ML', 180, false, 0, true, true),
('Paternity Leave', 'PL', 15, false, 0, true, true),
('Compensatory Off', 'CO', 12, false, 0, true, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE employees IS 'Core employee information including personal, contact, and employment details';
COMMENT ON TABLE employee_attendance IS 'Daily attendance records with check-in/out times';
COMMENT ON TABLE leave_applications IS 'Employee leave requests and approvals';
COMMENT ON TABLE payroll IS 'Monthly salary processing and payment records';
COMMENT ON TABLE employee_loans IS 'Employee loans and advances with installment tracking';
COMMENT ON TABLE performance_reviews IS 'Employee performance evaluation records';

-- =====================================================
-- EXPENSE MANAGEMENT SYSTEM
-- =====================================================

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    category_code VARCHAR(20) UNIQUE,
    parent_category_id INTEGER REFERENCES expense_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Categories
INSERT INTO expense_categories (category_name, category_code, description) VALUES
('Operational Expenses', 'OPEX', 'Day-to-day operational costs'),
('Administrative Expenses', 'ADMIN', 'Office and administrative costs'),
('Utilities', 'UTIL', 'Electricity, Water, Internet'),
('Transportation', 'TRANS', 'Vehicle fuel, maintenance'),
('Marketing & Sales', 'MKTG', 'Advertising and promotional costs'),
('Maintenance & Repairs', 'MAIN', 'Equipment and infrastructure maintenance'),
('Employee Benefits', 'EMPBEN', 'Staff welfare, training'),
('Professional Fees', 'PROF', 'Consultants, legal, audit'),
('Miscellaneous', 'MISC', 'Other expenses')
ON CONFLICT (category_name) DO NOTHING;

-- Expense Masters (for recurring/frequent expenses)
CREATE TABLE IF NOT EXISTS expense_masters (
    id SERIAL PRIMARY KEY,
    expense_name VARCHAR(255) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES expense_categories(id),
    default_amount DECIMAL(15,2),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_frequency VARCHAR(20), -- 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'
    account_head_id INTEGER, -- link to chart of accounts
    requires_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Vouchers/Entries
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Category & Type
    category_id INTEGER REFERENCES expense_categories(id),
    expense_master_id INTEGER REFERENCES expense_masters(id),
    expense_name VARCHAR(255) NOT NULL,
    
    -- Party/Vendor
    vendor_id INTEGER,
    vendor_name VARCHAR(255),
    
    -- Amount
    base_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Payment Details
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('Cash', 'Bank', 'Cheque', 'UPI', 'Card', 'Credit')),
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid')),
    paid_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Bank/Cheque Details
    bank_account_id INTEGER,
    cheque_number VARCHAR(50),
    cheque_date DATE,
    transaction_ref VARCHAR(100),
    
    -- Supporting Documents
    bill_number VARCHAR(50),
    bill_date DATE,
    attachment_url TEXT,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    approved_by INTEGER,
    approved_date DATE,
    rejection_reason TEXT,
    
    -- Accounting
    voucher_id INTEGER, -- link to accounting vouchers
    account_head_id INTEGER,
    is_posted BOOLEAN DEFAULT FALSE,
    
    -- Additional Details
    department VARCHAR(100),
    project_name VARCHAR(255),
    remarks TEXT,
    
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Breakup (for detailed split)
CREATE TABLE IF NOT EXISTS expense_breakup (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    
    -- Item Details
    description VARCHAR(255),
    category_id INTEGER REFERENCES expense_categories(id),
    quantity DECIMAL(15,3) DEFAULT 1,
    unit_price DECIMAL(15,2),
    amount DECIMAL(15,2) NOT NULL,
    
    -- Tax
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Petty Cash Management
CREATE TABLE IF NOT EXISTS petty_cash (
    id SERIAL PRIMARY KEY,
    
    -- Imprest System
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    limit_amount DECIMAL(15,2) DEFAULT 10000,
    
    -- Custodian
    custodian_id INTEGER,
    custodian_name VARCHAR(255),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Petty Cash Transactions
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id SERIAL PRIMARY KEY,
    petty_cash_id INTEGER REFERENCES petty_cash(id),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Transaction Type
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('Replenishment', 'Expense', 'Reimbursement')),
    
    -- Amount
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2),
    
    -- Details
    expense_category_id INTEGER REFERENCES expense_categories(id),
    description TEXT,
    paid_to VARCHAR(255),
    bill_number VARCHAR(50),
    
    -- Approval
    approved_by INTEGER,
    approved_date DATE,
    
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Expenses Schedule
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id SERIAL PRIMARY KEY,
    expense_master_id INTEGER REFERENCES expense_masters(id),
    expense_name VARCHAR(255) NOT NULL,
    
    -- Schedule
    frequency VARCHAR(20) NOT NULL, -- 'Monthly', 'Quarterly', 'Yearly'
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE,
    
    -- Amount
    amount DECIMAL(15,2) NOT NULL,
    
    -- Party
    vendor_id INTEGER,
    vendor_name VARCHAR(255),
    
    -- Payment
    payment_mode VARCHAR(20),
    auto_generate BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Budgets (for budget control)
CREATE TABLE IF NOT EXISTS expense_budgets (
    id SERIAL PRIMARY KEY,
    
    -- Period
    financial_year VARCHAR(10) NOT NULL,
    period_type VARCHAR(20) DEFAULT 'Yearly', -- 'Monthly', 'Quarterly', 'Yearly'
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    
    -- Category
    category_id INTEGER REFERENCES expense_categories(id),
    department VARCHAR(100),
    
    -- Budget
    budget_amount DECIMAL(15,2) NOT NULL,
    actual_expense DECIMAL(15,2) DEFAULT 0,
    variance DECIMAL(15,2) DEFAULT 0,
    variance_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Alerts
    alert_threshold DECIMAL(5,2) DEFAULT 80, -- Alert at 80% utilization
    is_exceeded BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(financial_year, period_type, category_id, department)
);

-- Expense Approvals Workflow
CREATE TABLE IF NOT EXISTS expense_approvals (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    
    -- Approval Level
    approval_level INTEGER DEFAULT 1,
    approver_id INTEGER NOT NULL,
    approver_name VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approval_date TIMESTAMP,
    comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Reimbursements (for employee expense claims)
CREATE TABLE IF NOT EXISTS expense_reimbursements (
    id SERIAL PRIMARY KEY,
    reimbursement_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Employee
    employee_id INTEGER NOT NULL,
    employee_name VARCHAR(255),
    
    -- Period
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_from_date DATE,
    expense_to_date DATE,
    
    -- Amount
    total_claimed DECIMAL(15,2) NOT NULL,
    approved_amount DECIMAL(15,2) DEFAULT 0,
    rejected_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected', 'Paid')),
    
    -- Approval
    approved_by INTEGER,
    approved_date DATE,
    rejection_reason TEXT,
    
    -- Payment
    payment_mode VARCHAR(20),
    paid_date DATE,
    payment_ref VARCHAR(100),
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reimbursement Line Items
CREATE TABLE IF NOT EXISTS reimbursement_items (
    id SERIAL PRIMARY KEY,
    reimbursement_id INTEGER REFERENCES expense_reimbursements(id) ON DELETE CASCADE,
    
    -- Expense Details
    expense_date DATE NOT NULL,
    category_id INTEGER REFERENCES expense_categories(id),
    expense_type VARCHAR(255),
    description TEXT,
    
    -- Amount
    claimed_amount DECIMAL(15,2) NOT NULL,
    approved_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Bill Details
    bill_number VARCHAR(50),
    attachment_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_status ON expenses(payment_status);
CREATE INDEX idx_expense_breakup_expense ON expense_breakup(expense_id);
CREATE INDEX idx_petty_cash_trans_date ON petty_cash_transactions(transaction_date);
CREATE INDEX idx_recurring_expenses_due ON recurring_expenses(next_due_date);
CREATE INDEX idx_reimbursements_employee ON expense_reimbursements(employee_id);
CREATE INDEX idx_reimbursements_status ON expense_reimbursements(status);

-- Auto-generate expense number trigger
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
        NEW.expense_number := 'EXP-' || TO_CHAR(NEW.expense_date, 'YYYYMM') || '-' || 
                             LPAD(NEXTVAL('expenses_id_seq')::TEXT, 5, '0');
    END IF;
    
    -- Calculate pending amount
    NEW.pending_amount := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
    
    -- Update payment status
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.payment_status := 'Paid';
    ELSIF NEW.paid_amount > 0 THEN
        NEW.payment_status := 'Partial';
    ELSE
        NEW.payment_status := 'Pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_number_trigger
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION generate_expense_number();

-- Update budget on expense posting
CREATE OR REPLACE FUNCTION update_expense_budget()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_posted = TRUE AND (OLD.is_posted IS NULL OR OLD.is_posted = FALSE) THEN
        UPDATE expense_budgets
        SET 
            actual_expense = actual_expense + NEW.total_amount,
            variance = budget_amount - (actual_expense + NEW.total_amount),
            variance_percentage = ((actual_expense + NEW.total_amount) / NULLIF(budget_amount, 0) * 100),
            is_exceeded = ((actual_expense + NEW.total_amount) > budget_amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE category_id = NEW.category_id
          AND NEW.expense_date BETWEEN from_date AND to_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_trigger
    AFTER INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_budget();

-- Views
CREATE OR REPLACE VIEW v_expense_summary AS
SELECT 
    DATE_TRUNC('month', expense_date) as month,
    ec.category_name,
    COUNT(*) as expense_count,
    SUM(total_amount) as total_expense,
    SUM(paid_amount) as paid,
    SUM(pending_amount) as pending
FROM expenses e
LEFT JOIN expense_categories ec ON e.category_id = ec.id
GROUP BY DATE_TRUNC('month', expense_date), ec.category_name
ORDER BY month DESC, total_expense DESC;

CREATE OR REPLACE VIEW v_budget_utilization AS
SELECT 
    financial_year,
    ec.category_name,
    budget_amount,
    actual_expense,
    variance,
    variance_percentage,
    CASE 
        WHEN variance_percentage >= 100 THEN 'Exceeded'
        WHEN variance_percentage >= alert_threshold THEN 'Warning'
        ELSE 'Normal'
    END as status
FROM expense_budgets eb
LEFT JOIN expense_categories ec ON eb.category_id = ec.id
ORDER BY variance_percentage DESC;

CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT 
    e.id,
    e.expense_number,
    e.expense_date,
    e.expense_name,
    e.total_amount,
    e.created_by,
    ea.approver_name,
    ea.approval_level,
    ea.status
FROM expenses e
JOIN expense_approvals ea ON e.id = ea.expense_id
WHERE ea.status = 'Pending'
ORDER BY e.expense_date DESC;

COMMENT ON TABLE expense_categories IS 'Expense classification categories';
COMMENT ON TABLE expense_masters IS 'Master data for recurring expenses';
COMMENT ON TABLE expenses IS 'Main expense vouchers/entries';
COMMENT ON TABLE expense_breakup IS 'Line-item details for expenses';
COMMENT ON TABLE petty_cash IS 'Petty cash imprest accounts';
COMMENT ON TABLE petty_cash_transactions IS 'Petty cash book entries';
COMMENT ON TABLE recurring_expenses IS 'Recurring expense schedules';
COMMENT ON TABLE expense_budgets IS 'Budget allocation and tracking';
COMMENT ON TABLE expense_reimbursements IS 'Employee expense claims';

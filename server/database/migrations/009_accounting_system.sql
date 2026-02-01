-- =====================================================
-- ACCOUNTING SYSTEM MIGRATION - TALLY-STYLE DOUBLE ENTRY
-- Every transaction creates journal entries automatically
-- =====================================================

-- Drop existing accounting tables if any
DROP VIEW IF EXISTS v_cash_bank_book CASCADE;
DROP VIEW IF EXISTS v_outstanding_payables CASCADE;
DROP VIEW IF EXISTS v_outstanding_receivables CASCADE;
DROP VIEW IF EXISTS v_day_book CASCADE;
DROP VIEW IF EXISTS v_ledger_statement CASCADE;
DROP VIEW IF EXISTS v_trial_balance CASCADE;

DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_entries CASCADE;
DROP TRIGGER IF EXISTS trg_ledgers_update ON ledgers CASCADE;
DROP TRIGGER IF EXISTS trg_vouchers_update ON vouchers CASCADE;

DROP TABLE IF EXISTS bank_reconciliation CASCADE;
DROP TABLE IF EXISTS bill_wise_details CASCADE;
DROP TABLE IF EXISTS tax_ledger_mapping CASCADE;
DROP TABLE IF EXISTS tax_categories CASCADE;
DROP TABLE IF EXISTS financial_years CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS voucher_types CASCADE;
DROP TABLE IF EXISTS ledgers CASCADE;
DROP TABLE IF EXISTS account_groups CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- =====================================================
-- CHART OF ACCOUNTS & ACCOUNT GROUPS
-- =====================================================

-- Account Groups (like Tally's primary groups)
CREATE TABLE account_groups (
    id SERIAL PRIMARY KEY,
    group_code VARCHAR(20) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    parent_group_id INTEGER REFERENCES account_groups(id),
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('Asset', 'Liability', 'Income', 'Expense')),
    affects_gross_profit BOOLEAN DEFAULT FALSE,
    is_revenue BOOLEAN DEFAULT FALSE,
    display_order INTEGER,
    is_system BOOLEAN DEFAULT FALSE, -- System groups cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ledgers/Accounts (Chart of Accounts)
CREATE TABLE ledgers (
    id SERIAL PRIMARY KEY,
    ledger_code VARCHAR(50) UNIQUE NOT NULL,
    ledger_name VARCHAR(150) NOT NULL,
    account_group_id INTEGER REFERENCES account_groups(id) NOT NULL,
    alias VARCHAR(150),
    
    -- Opening Balance
    opening_balance DECIMAL(15,2) DEFAULT 0,
    opening_balance_type VARCHAR(10) CHECK (opening_balance_type IN ('Debit', 'Credit')),
    opening_date DATE DEFAULT CURRENT_DATE,
    
    -- Contact Info (for party ledgers)
    contact_person VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    
    -- Credit Control
    credit_limit DECIMAL(15,2),
    credit_days INTEGER,
    
    -- Flags
    is_default BOOLEAN DEFAULT FALSE, -- Default ledgers like Cash, Bank
    is_reconciled BOOLEAN DEFAULT FALSE, -- For bank accounts
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- =====================================================
-- VOUCHER TYPES & TRANSACTIONS
-- =====================================================

-- Voucher Types (Payment, Receipt, Contra, Journal, Sales, Purchase, Debit Note, Credit Note)
CREATE TABLE voucher_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(20) UNIQUE NOT NULL,
    type_name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10), -- PMT, RCP, CNT, JRN, SAL, PUR, DBT, CRD
    method_of_numbering VARCHAR(20) DEFAULT 'Auto' CHECK (method_of_numbering IN ('Auto', 'Manual')),
    starting_number INTEGER DEFAULT 1,
    prefix VARCHAR(10),
    suffix VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers (Main transaction header)
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    voucher_type_id INTEGER REFERENCES voucher_types(id) NOT NULL,
    voucher_number VARCHAR(50) NOT NULL, -- Auto-generated or manual
    voucher_date DATE NOT NULL,
    reference_number VARCHAR(100), -- External reference (invoice #, bill #, etc.)
    reference_date DATE,
    
    -- Party Details (for payment/receipt/sales/purchase)
    party_ledger_id INTEGER REFERENCES ledgers(id),
    
    -- Narration
    narration TEXT,
    
    -- Linked Transactions (source of this voucher)
    source_type VARCHAR(50), -- 'sale', 'purchase', 'booking', 'payroll', 'production', etc.
    source_id INTEGER, -- ID of source transaction
    
    -- Financial Year
    financial_year VARCHAR(10), -- 2025-26
    
    -- Amounts
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Posted' CHECK (status IN ('Draft', 'Posted', 'Cancelled')),
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciliation_date DATE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id),
    cancellation_reason TEXT,
    
    UNIQUE(voucher_type_id, voucher_number, financial_year)
);

-- Journal Entries (Double-entry details)
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE NOT NULL,
    entry_number INTEGER NOT NULL, -- Line number in voucher
    
    -- Ledger
    ledger_id INTEGER REFERENCES ledgers(id) NOT NULL,
    
    -- Amounts
    debit_amount DECIMAL(15,2) DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount DECIMAL(15,2) DEFAULT 0 CHECK (credit_amount >= 0),
    
    -- Check: Either debit or credit, not both
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    
    -- Cost Centers (optional)
    cost_center_id INTEGER, -- For department/project tracking
    
    -- Additional Details
    narration TEXT,
    
    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciliation_id INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- COST CENTERS & PROFIT CENTERS
-- =====================================================

CREATE TABLE cost_centers (
    id SERIAL PRIMARY KEY,
    center_code VARCHAR(20) UNIQUE NOT NULL,
    center_name VARCHAR(100) NOT NULL,
    center_type VARCHAR(20) CHECK (center_type IN ('Cost', 'Profit')),
    parent_center_id INTEGER REFERENCES cost_centers(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- BANK RECONCILIATION
-- =====================================================

CREATE TABLE bank_reconciliation (
    id SERIAL PRIMARY KEY,
    ledger_id INTEGER REFERENCES ledgers(id) NOT NULL,
    journal_entry_id INTEGER REFERENCES journal_entries(id) NOT NULL,
    bank_statement_date DATE NOT NULL,
    bank_statement_balance DECIMAL(15,2),
    reconciled_by INTEGER REFERENCES users(id),
    reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- =====================================================
-- BILL-WISE DETAILS (Outstanding Management)
-- =====================================================

CREATE TABLE bill_wise_details (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES vouchers(id) NOT NULL,
    party_ledger_id INTEGER REFERENCES ledgers(id) NOT NULL,
    
    -- Bill Reference
    bill_type VARCHAR(20) CHECK (bill_type IN ('New Ref', 'Against Ref', 'On Account', 'Advance')),
    reference_type VARCHAR(20) CHECK (reference_type IN ('Agst Ref', 'New Ref')),
    reference_number VARCHAR(100),
    reference_date DATE,
    
    -- Amounts
    bill_amount DECIMAL(15,2) NOT NULL,
    adjusted_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2),
    
    -- Due Date
    due_date DATE,
    overdue_days INTEGER,
    
    is_fully_adjusted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TAX CONFIGURATION (GST)
-- =====================================================

CREATE TABLE tax_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(20) CHECK (tax_type IN ('GST', 'IGST', 'CGST_SGST', 'Cess', 'Exempt')),
    cgst_rate DECIMAL(5,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax Ledger Mapping
CREATE TABLE tax_ledger_mapping (
    id SERIAL PRIMARY KEY,
    tax_category_id INTEGER REFERENCES tax_categories(id) NOT NULL,
    cgst_ledger_id INTEGER REFERENCES ledgers(id),
    sgst_ledger_id INTEGER REFERENCES ledgers(id),
    igst_ledger_id INTEGER REFERENCES ledgers(id),
    cess_ledger_id INTEGER REFERENCES ledgers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FINANCIAL YEAR MANAGEMENT
-- =====================================================

CREATE TABLE financial_years (
    id SERIAL PRIMARY KEY,
    year_code VARCHAR(10) UNIQUE NOT NULL, -- 2025-26
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMP,
    closed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDICES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX idx_vouchers_party ON vouchers(party_ledger_id);
CREATE INDEX idx_vouchers_type ON vouchers(voucher_type_id);
CREATE INDEX idx_vouchers_source ON vouchers(source_type, source_id);
CREATE INDEX idx_vouchers_fy ON vouchers(financial_year);
CREATE INDEX idx_journal_ledger ON journal_entries(ledger_id);
CREATE INDEX idx_journal_voucher ON journal_entries(voucher_id);
CREATE INDEX idx_ledgers_group ON ledgers(account_group_id);
CREATE INDEX idx_bills_party ON bill_wise_details(party_ledger_id);
CREATE INDEX idx_bills_pending ON bill_wise_details(is_fully_adjusted, due_date);

-- =====================================================
-- VIEWS FOR COMMON REPORTS
-- =====================================================

-- Trial Balance View
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT 
    l.id as ledger_id,
    l.ledger_code,
    l.ledger_name,
    ag.group_name as account_group,
    ag.nature,
    l.opening_balance,
    l.opening_balance_type,
    COALESCE(SUM(je.debit_amount), 0) as total_debit,
    COALESCE(SUM(je.credit_amount), 0) as total_credit,
    CASE 
        WHEN l.opening_balance_type = 'Debit' THEN
            l.opening_balance + COALESCE(SUM(je.debit_amount), 0) - COALESCE(SUM(je.credit_amount), 0)
        WHEN l.opening_balance_type = 'Credit' THEN
            l.opening_balance + COALESCE(SUM(je.credit_amount), 0) - COALESCE(SUM(je.debit_amount), 0)
        ELSE COALESCE(SUM(je.debit_amount), 0) - COALESCE(SUM(je.credit_amount), 0)
    END as closing_balance,
    CASE 
        WHEN (l.opening_balance_type = 'Debit' AND 
              l.opening_balance + COALESCE(SUM(je.debit_amount), 0) - COALESCE(SUM(je.credit_amount), 0) >= 0)
          OR (l.opening_balance_type = 'Credit' AND 
              l.opening_balance + COALESCE(SUM(je.credit_amount), 0) - COALESCE(SUM(je.debit_amount), 0) < 0)
          OR (l.opening_balance_type IS NULL AND 
              COALESCE(SUM(je.debit_amount), 0) - COALESCE(SUM(je.credit_amount), 0) >= 0)
        THEN 'Debit'
        ELSE 'Credit'
    END as closing_balance_type
FROM ledgers l
LEFT JOIN account_groups ag ON l.account_group_id = ag.id
LEFT JOIN journal_entries je ON l.id = je.ledger_id
LEFT JOIN vouchers v ON je.voucher_id = v.id AND v.status = 'Posted'
WHERE l.is_active = TRUE
GROUP BY l.id, l.ledger_code, l.ledger_name, ag.group_name, ag.nature, 
         l.opening_balance, l.opening_balance_type;

-- Ledger Statement View
CREATE OR REPLACE VIEW v_ledger_statement AS
SELECT 
    je.id,
    v.voucher_date as transaction_date,
    vt.type_name as voucher_type,
    v.voucher_number,
    v.reference_number,
    v.narration,
    l.ledger_name,
    je.debit_amount,
    je.credit_amount,
    v.party_ledger_id,
    pl.ledger_name as party_name,
    v.financial_year,
    v.status,
    je.ledger_id,
    v.id as voucher_id
FROM journal_entries je
JOIN vouchers v ON je.voucher_id = v.id
JOIN voucher_types vt ON v.voucher_type_id = vt.id
JOIN ledgers l ON je.ledger_id = l.id
LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
WHERE v.status = 'Posted'
ORDER BY v.voucher_date, v.id, je.entry_number;

-- Day Book View
CREATE OR REPLACE VIEW v_day_book AS
SELECT 
    v.id as voucher_id,
    v.voucher_date,
    vt.type_name as voucher_type,
    vt.abbreviation,
    v.voucher_number,
    v.reference_number,
    v.narration,
    v.total_amount,
    pl.ledger_name as party_name,
    v.status,
    v.financial_year,
    v.created_by,
    u.full_name as created_by_name,
    v.created_at
FROM vouchers v
JOIN voucher_types vt ON v.voucher_type_id = vt.id
LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
LEFT JOIN users u ON v.created_by = u.id
ORDER BY v.voucher_date DESC, v.id DESC;

-- Outstanding Receivables View
CREATE OR REPLACE VIEW v_outstanding_receivables AS
SELECT 
    bw.id,
    bw.party_ledger_id,
    l.ledger_name as party_name,
    l.contact_person,
    l.mobile,
    bw.reference_number,
    bw.reference_date,
    bw.bill_amount,
    bw.adjusted_amount,
    bw.pending_amount,
    bw.due_date,
    bw.overdue_days,
    CASE 
        WHEN bw.due_date IS NULL THEN 'Not Due'
        WHEN bw.due_date >= CURRENT_DATE THEN 'Not Due'
        WHEN bw.overdue_days <= 30 THEN '0-30 Days'
        WHEN bw.overdue_days <= 60 THEN '31-60 Days'
        WHEN bw.overdue_days <= 90 THEN '61-90 Days'
        ELSE 'Above 90 Days'
    END as ageing_bucket
FROM bill_wise_details bw
JOIN ledgers l ON bw.party_ledger_id = l.id
WHERE bw.is_fully_adjusted = FALSE 
  AND bw.pending_amount > 0
  AND l.is_active = TRUE
ORDER BY bw.due_date NULLS LAST;

-- Outstanding Payables View
CREATE OR REPLACE VIEW v_outstanding_payables AS
SELECT 
    bw.id,
    bw.party_ledger_id,
    l.ledger_name as party_name,
    l.contact_person,
    l.mobile,
    bw.reference_number,
    bw.reference_date,
    bw.bill_amount,
    bw.adjusted_amount,
    bw.pending_amount,
    bw.due_date,
    bw.overdue_days,
    CASE 
        WHEN bw.due_date IS NULL THEN 'Not Due'
        WHEN bw.due_date >= CURRENT_DATE THEN 'Not Due'
        WHEN bw.overdue_days <= 30 THEN '0-30 Days'
        WHEN bw.overdue_days <= 60 THEN '31-60 Days'
        WHEN bw.overdue_days <= 90 THEN '61-90 Days'
        ELSE 'Above 90 Days'
    END as ageing_bucket
FROM bill_wise_details bw
JOIN ledgers l ON bw.party_ledger_id = l.id
JOIN account_groups ag ON l.account_group_id = ag.id
WHERE bw.is_fully_adjusted = FALSE 
  AND bw.pending_amount > 0
  AND l.is_active = TRUE
  AND ag.nature = 'Liability'
ORDER BY bw.due_date NULLS LAST;

-- Cash/Bank Book View
CREATE OR REPLACE VIEW v_cash_bank_book AS
SELECT 
    v.voucher_date as transaction_date,
    vt.type_name as voucher_type,
    v.voucher_number,
    v.reference_number,
    l.ledger_name as account,
    pl.ledger_name as party_name,
    v.narration,
    je.debit_amount as receipt,
    je.credit_amount as payment,
    je.ledger_id,
    v.id as voucher_id,
    je.is_reconciled
FROM journal_entries je
JOIN vouchers v ON je.voucher_id = v.id
JOIN voucher_types vt ON v.voucher_type_id = vt.id
JOIN ledgers l ON je.ledger_id = l.id
JOIN account_groups ag ON l.account_group_id = ag.id
LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
WHERE v.status = 'Posted'
  AND ag.group_code IN ('CASH', 'BANK')
ORDER BY v.voucher_date DESC, v.id DESC;

-- =====================================================
-- SEED DATA - DEFAULT ACCOUNT GROUPS
-- =====================================================

INSERT INTO account_groups (group_code, group_name, parent_group_id, nature, affects_gross_profit, is_revenue, display_order, is_system) VALUES
-- Primary Groups
('ASSETS', 'Assets', NULL, 'Asset', FALSE, FALSE, 1, TRUE),
('LIABILITIES', 'Liabilities', NULL, 'Liability', FALSE, FALSE, 2, TRUE),
('INCOME', 'Income', NULL, 'Income', FALSE, TRUE, 3, TRUE),
('EXPENSES', 'Expenses', NULL, 'Expense', FALSE, FALSE, 4, TRUE),

-- Asset Sub-groups
('CASH', 'Cash-in-Hand', 1, 'Asset', FALSE, FALSE, 11, TRUE),
('BANK', 'Bank Accounts', 1, 'Asset', FALSE, FALSE, 12, TRUE),
('STOCK', 'Stock-in-Hand', 1, 'Asset', FALSE, FALSE, 13, TRUE),
('SUNDRY_DEBTORS', 'Sundry Debtors', 1, 'Asset', FALSE, FALSE, 14, TRUE),
('FIXED_ASSETS', 'Fixed Assets', 1, 'Asset', FALSE, FALSE, 15, TRUE),
('INVESTMENTS', 'Investments', 1, 'Asset', FALSE, FALSE, 16, TRUE),
('DEPOSITS', 'Deposits (Asset)', 1, 'Asset', FALSE, FALSE, 17, TRUE),
('LOANS_ADVANCES', 'Loans & Advances (Asset)', 1, 'Asset', FALSE, FALSE, 18, TRUE),

-- Liability Sub-groups
('CAPITAL', 'Capital Account', 2, 'Liability', FALSE, FALSE, 21, TRUE),
('SUNDRY_CREDITORS', 'Sundry Creditors', 2, 'Liability', FALSE, FALSE, 22, TRUE),
('DUTIES_TAXES', 'Duties & Taxes', 2, 'Liability', FALSE, FALSE, 23, TRUE),
('PROVISIONS', 'Provisions', 2, 'Liability', FALSE, FALSE, 24, TRUE),
('LOANS', 'Loans (Liability)', 2, 'Liability', FALSE, FALSE, 25, TRUE),
('SECURED_LOANS', 'Secured Loans', 2, 'Liability', FALSE, FALSE, 26, TRUE),
('UNSECURED_LOANS', 'Unsecured Loans', 2, 'Liability', FALSE, FALSE, 27, TRUE),
('CURRENT_LIABILITIES', 'Current Liabilities', 2, 'Liability', FALSE, FALSE, 28, TRUE),

-- Income Sub-groups
('SALES', 'Sales Accounts', 3, 'Income', TRUE, TRUE, 31, TRUE),
('DIRECT_INCOME', 'Direct Incomes', 3, 'Income', TRUE, TRUE, 32, TRUE),
('INDIRECT_INCOME', 'Indirect Incomes', 3, 'Income', FALSE, TRUE, 33, TRUE),

-- Expense Sub-groups
('PURCHASE', 'Purchase Accounts', 4, 'Expense', TRUE, FALSE, 41, TRUE),
('DIRECT_EXPENSES', 'Direct Expenses', 4, 'Expense', TRUE, FALSE, 42, TRUE),
('INDIRECT_EXPENSES', 'Indirect Expenses', 4, 'Expense', FALSE, FALSE, 43, TRUE),
('SALARIES_WAGES', 'Salaries & Wages', 4, 'Expense', FALSE, FALSE, 44, TRUE);

-- =====================================================
-- SEED DATA - DEFAULT LEDGERS
-- =====================================================

INSERT INTO ledgers (ledger_code, ledger_name, account_group_id, opening_balance, opening_balance_type, is_default) VALUES
-- Cash & Bank
('CASH', 'Cash', (SELECT id FROM account_groups WHERE group_code = 'CASH'), 0, 'Debit', TRUE),
('BANK001', 'State Bank of India', (SELECT id FROM account_groups WHERE group_code = 'BANK'), 0, 'Debit', TRUE),

-- Tax Ledgers
('CGST_OUT', 'CGST Output', (SELECT id FROM account_groups WHERE group_code = 'DUTIES_TAXES'), 0, 'Credit', TRUE),
('SGST_OUT', 'SGST Output', (SELECT id FROM account_groups WHERE group_code = 'DUTIES_TAXES'), 0, 'Credit', TRUE),
('IGST_OUT', 'IGST Output', (SELECT id FROM account_groups WHERE group_code = 'DUTIES_TAXES'), 0, 'Credit', TRUE),
('CGST_IN', 'CGST Input', (SELECT id FROM account_groups WHERE group_code = 'DUTIES_TAXES'), 0, 'Debit', TRUE),
('SGST_IN', 'SGST Input', (SELECT id FROM account_groups WHERE group_code = 'DUTIES_TAXES'), 0, 'Debit', TRUE),
('IGST_IN', 'IGST Input', (SELECT id FROM account_groups WHERE group_code = 'DUTIES_TAXES'), 0, 'Debit', TRUE),

-- Default Income/Expense
('SALES001', 'Plant Sales', (SELECT id FROM account_groups WHERE group_code = 'SALES'), 0, 'Credit', TRUE),
('PURCHASE001', 'Purchase of Seeds & Consumables', (SELECT id FROM account_groups WHERE group_code = 'PURCHASE'), 0, 'Debit', TRUE),
('ROUNDOFF', 'Round Off', (SELECT id FROM account_groups WHERE group_code = 'INDIRECT_EXPENSES'), 0, 'Debit', TRUE);

-- =====================================================
-- SEED DATA - VOUCHER TYPES
-- =====================================================

INSERT INTO voucher_types (type_code, type_name, abbreviation, starting_number, prefix) VALUES
('PAYMENT', 'Payment', 'PMT', 1, 'PMT-'),
('RECEIPT', 'Receipt', 'RCP', 1, 'RCP-'),
('CONTRA', 'Contra', 'CNT', 1, 'CNT-'),
('JOURNAL', 'Journal', 'JRN', 1, 'JRN-'),
('SALES', 'Sales', 'SAL', 1, 'SAL-'),
('PURCHASE', 'Purchase', 'PUR', 1, 'PUR-'),
('DEBIT_NOTE', 'Debit Note', 'DBT', 1, 'DBT-'),
('CREDIT_NOTE', 'Credit Note', 'CRD', 1, 'CRD-');

-- =====================================================
-- SEED DATA - TAX CATEGORIES
-- =====================================================

INSERT INTO tax_categories (category_code, category_name, tax_type, cgst_rate, sgst_rate, igst_rate) VALUES
('GST_0', 'GST 0%', 'CGST_SGST', 0, 0, 0),
('GST_5', 'GST 5%', 'CGST_SGST', 2.5, 2.5, 5),
('GST_12', 'GST 12%', 'CGST_SGST', 6, 6, 12),
('GST_18', 'GST 18%', 'CGST_SGST', 9, 9, 18),
('GST_28', 'GST 28%', 'CGST_SGST', 14, 14, 28),
('EXEMPT', 'Exempted', 'Exempt', 0, 0, 0);

-- =====================================================
-- SEED DATA - COST CENTERS
-- =====================================================

INSERT INTO cost_centers (center_code, center_name, center_type) VALUES
('PROD', 'Production', 'Cost'),
('SALES', 'Sales & Marketing', 'Cost'),
('ADMIN', 'Administration', 'Cost'),
('POLY01', 'Polyhouse 1', 'Profit'),
('POLY02', 'Polyhouse 2', 'Profit');

-- =====================================================
-- SEED DATA - CURRENT FINANCIAL YEAR
-- =====================================================

INSERT INTO financial_years (year_code, start_date, end_date, is_active) VALUES
('2025-26', '2025-04-01', '2026-03-31', TRUE);

-- =====================================================
-- TRIGGERS FOR AUTO UPDATES
-- =====================================================

-- Update voucher updated_at
CREATE OR REPLACE FUNCTION update_voucher_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vouchers_update
BEFORE UPDATE ON vouchers
FOR EACH ROW
EXECUTE FUNCTION update_voucher_timestamp();

-- Update ledger updated_at
CREATE OR REPLACE FUNCTION update_ledger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledgers_update
BEFORE UPDATE ON ledgers
FOR EACH ROW
EXECUTE FUNCTION update_ledger_timestamp();

-- Update bill overdue days
CREATE OR REPLACE FUNCTION update_bill_overdue_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
        NEW.overdue_days = CURRENT_DATE - NEW.due_date;
    ELSE
        NEW.overdue_days = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_overdue_update
BEFORE INSERT OR UPDATE ON bill_wise_details
FOR EACH ROW
EXECUTE FUNCTION update_bill_overdue_days();

-- Validate journal entries balance
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_debit_total DECIMAL(15,2);
    v_credit_total DECIMAL(15,2);
BEGIN
    -- Calculate totals for this voucher
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_debit_total, v_credit_total
    FROM journal_entries
    WHERE voucher_id = COALESCE(NEW.voucher_id, OLD.voucher_id);
    
    -- Check if balanced
    IF ABS(v_debit_total - v_credit_total) > 0.01 THEN
        RAISE EXCEPTION 'Journal entries must balance: Debit=% Credit=%', v_debit_total, v_credit_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_journal_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_journal_balance();

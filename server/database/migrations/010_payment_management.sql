-- =====================================================
-- PAYMENT & RECEIPT MANAGEMENT SYSTEM
-- =====================================================

-- Payment/Receipt Vouchers (extending accounting vouchers)
CREATE TABLE IF NOT EXISTS payment_receipts (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('Payment', 'Receipt')),
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('Cash', 'Bank', 'Cheque', 'UPI', 'Card', 'NEFT', 'RTGS')),
    
    -- Party Details
    party_type VARCHAR(20) CHECK (party_type IN ('Customer', 'Supplier', 'Employee', 'Other')),
    party_id INTEGER, -- reference to farmers/suppliers/employees table
    party_name VARCHAR(255),
    
    -- Payment Details
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Bank/Cheque Details
    bank_account_id INTEGER REFERENCES ledgers(id),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    cheque_status VARCHAR(20) CHECK (cheque_status IN ('Pending', 'Cleared', 'Bounced', 'Cancelled')),
    bank_name VARCHAR(255),
    
    -- Transaction Reference
    transaction_reference VARCHAR(100),
    utr_number VARCHAR(50),
    
    -- Allocation
    against_invoice_id INTEGER, -- reference to sales/purchase invoice
    invoice_number VARCHAR(50),
    advance_payment BOOLEAN DEFAULT FALSE,
    
    -- Additional Info
    narration TEXT,
    internal_notes TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- Payment Allocation (link payments to invoices)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id SERIAL PRIMARY KEY,
    payment_receipt_id INTEGER REFERENCES payment_receipts(id) ON DELETE CASCADE,
    invoice_type VARCHAR(20) CHECK (invoice_type IN ('Sales', 'Purchase')),
    invoice_id INTEGER,
    invoice_number VARCHAR(50),
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank Accounts Master
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    account_number VARCHAR(50) NOT NULL UNIQUE,
    ifsc_code VARCHAR(20),
    account_type VARCHAR(20) CHECK (account_type IN ('Savings', 'Current', 'OD', 'CC')),
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    ledger_id INTEGER REFERENCES ledgers(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cheque Register
CREATE TABLE IF NOT EXISTS cheque_register (
    id SERIAL PRIMARY KEY,
    payment_receipt_id INTEGER REFERENCES payment_receipts(id),
    cheque_number VARCHAR(50) NOT NULL,
    cheque_date DATE NOT NULL,
    cheque_amount DECIMAL(15,2) NOT NULL,
    party_name VARCHAR(255),
    bank_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Cleared', 'Bounced', 'Cancelled')),
    clearance_date DATE,
    bounce_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outstanding Tracking (detailed)
CREATE TABLE IF NOT EXISTS outstanding_invoices (
    id SERIAL PRIMARY KEY,
    invoice_type VARCHAR(20) CHECK (invoice_type IN ('Sales', 'Purchase')),
    invoice_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    party_type VARCHAR(20),
    party_id INTEGER,
    party_name VARCHAR(255),
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    overdue_days INTEGER DEFAULT 0,
    credit_period INTEGER DEFAULT 0,
    payment_terms VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue', 'Written Off')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_payment_receipts_voucher ON payment_receipts(voucher_id);
CREATE INDEX idx_payment_receipts_party ON payment_receipts(party_type, party_id);
CREATE INDEX idx_payment_receipts_date ON payment_receipts(payment_date);
CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_receipt_id);
CREATE INDEX idx_payment_allocations_invoice ON payment_allocations(invoice_type, invoice_id);
CREATE INDEX idx_cheque_register_status ON cheque_register(status);
CREATE INDEX idx_outstanding_invoices_party ON outstanding_invoices(party_type, party_id);
CREATE INDEX idx_outstanding_invoices_status ON outstanding_invoices(status);

-- Triggers
CREATE OR REPLACE FUNCTION update_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_receipts_update
    BEFORE UPDATE ON payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

CREATE TRIGGER bank_accounts_update
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

-- Function to update outstanding amount
CREATE OR REPLACE FUNCTION update_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update outstanding_invoices when payment is allocated
    UPDATE outstanding_invoices
    SET paid_amount = paid_amount + NEW.allocated_amount,
        outstanding_amount = total_amount - (paid_amount + NEW.allocated_amount),
        status = CASE
            WHEN (total_amount - (paid_amount + NEW.allocated_amount)) <= 0 THEN 'Paid'
            WHEN (paid_amount + NEW.allocated_amount) > 0 THEN 'Partial'
            ELSE 'Pending'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE invoice_type = NEW.invoice_type
      AND invoice_id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_allocation_update_outstanding
    AFTER INSERT ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_outstanding_amount();

-- View: Payment Summary
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT 
    pr.id,
    pr.payment_type,
    pr.payment_mode,
    pr.party_name,
    pr.amount,
    pr.payment_date,
    v.voucher_number,
    v.voucher_date,
    pr.cheque_number,
    pr.cheque_status,
    pr.transaction_reference,
    pr.narration,
    COALESCE(ba.account_name, 'Cash') as account_name
FROM payment_receipts pr
LEFT JOIN vouchers v ON pr.voucher_id = v.id
LEFT JOIN bank_accounts ba ON pr.bank_account_id = ba.id
ORDER BY pr.payment_date DESC;

-- View: Outstanding Summary
CREATE OR REPLACE VIEW v_outstanding_summary AS
SELECT 
    party_type,
    party_name,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_invoiced,
    SUM(paid_amount) as total_paid,
    SUM(outstanding_amount) as total_outstanding,
    SUM(CASE WHEN status = 'Overdue' THEN outstanding_amount ELSE 0 END) as overdue_amount,
    AVG(overdue_days) as avg_overdue_days
FROM outstanding_invoices
WHERE outstanding_amount > 0
GROUP BY party_type, party_name
ORDER BY total_outstanding DESC;

-- View: Cheque Status
CREATE OR REPLACE VIEW v_cheque_status AS
SELECT 
    cr.cheque_number,
    cr.cheque_date,
    cr.cheque_amount,
    cr.party_name,
    cr.bank_name,
    cr.status,
    cr.clearance_date,
    pr.payment_type,
    v.voucher_number
FROM cheque_register cr
LEFT JOIN payment_receipts pr ON cr.payment_receipt_id = pr.id
LEFT JOIN vouchers v ON pr.voucher_id = v.id
ORDER BY cr.cheque_date DESC;

COMMENT ON TABLE payment_receipts IS 'Payment and receipt vouchers with detailed tracking';
COMMENT ON TABLE payment_allocations IS 'Links payments to specific invoices';
COMMENT ON TABLE bank_accounts IS 'Bank account master with balances';
COMMENT ON TABLE cheque_register IS 'Tracks all cheque transactions';
COMMENT ON TABLE outstanding_invoices IS 'Tracks all outstanding invoices';

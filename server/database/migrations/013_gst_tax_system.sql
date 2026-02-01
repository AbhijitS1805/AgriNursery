-- =====================================================
-- GST & TAX MANAGEMENT SYSTEM
-- =====================================================

-- GST Configuration
CREATE TABLE IF NOT EXISTS gst_settings (
    id SERIAL PRIMARY KEY,
    company_gstin VARCHAR(15) UNIQUE NOT NULL,
    company_legal_name VARCHAR(255) NOT NULL,
    company_trade_name VARCHAR(255),
    state_code VARCHAR(2),
    is_composition_scheme BOOLEAN DEFAULT FALSE,
    gst_registration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GST Rates Master
CREATE TABLE IF NOT EXISTS gst_rates (
    id SERIAL PRIMARY KEY,
    hsn_code VARCHAR(20) NOT NULL,
    description TEXT,
    cgst_rate DECIMAL(5,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer/Supplier GST Details
CREATE TABLE IF NOT EXISTS party_gst_details (
    id SERIAL PRIMARY KEY,
    party_type VARCHAR(20) CHECK (party_type IN ('Customer', 'Supplier')),
    party_id INTEGER NOT NULL,
    party_name VARCHAR(255),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    state_code VARCHAR(2),
    gst_registration_type VARCHAR(50), -- 'Regular', 'Composition', 'Unregistered'
    is_sez BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(party_type, party_id)
);

-- GST Invoice Details (for sales & purchase)
CREATE TABLE IF NOT EXISTS gst_invoices (
    id SERIAL PRIMARY KEY,
    invoice_type VARCHAR(20) CHECK (invoice_type IN ('Sales', 'Purchase')),
    invoice_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    
    -- Party Details
    party_gstin VARCHAR(15),
    party_state_code VARCHAR(2),
    place_of_supply VARCHAR(2),
    is_interstate BOOLEAN DEFAULT FALSE,
    is_reverse_charge BOOLEAN DEFAULT FALSE,
    
    -- Amounts
    taxable_amount DECIMAL(15,2) NOT NULL,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    cess_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0,
    total_invoice_amount DECIMAL(15,2) NOT NULL,
    
    -- TDS/TCS
    tds_amount DECIMAL(15,2) DEFAULT 0,
    tcs_amount DECIMAL(15,2) DEFAULT 0,
    
    -- IRN & E-way Bill
    irn VARCHAR(100),
    irn_date TIMESTAMP,
    ack_number VARCHAR(50),
    eway_bill_number VARCHAR(20),
    eway_bill_date DATE,
    eway_bill_valid_till DATE,
    
    -- Filing Status
    gstr1_filed BOOLEAN DEFAULT FALSE,
    gstr1_filing_date DATE,
    gstr3b_filed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(invoice_type, invoice_id)
);

-- GST Invoice Line Items
CREATE TABLE IF NOT EXISTS gst_invoice_items (
    id SERIAL PRIMARY KEY,
    gst_invoice_id INTEGER REFERENCES gst_invoices(id) ON DELETE CASCADE,
    
    -- Item Details
    item_name VARCHAR(255),
    hsn_code VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(50),
    unit_price DECIMAL(15,2),
    discount DECIMAL(15,2) DEFAULT 0,
    taxable_value DECIMAL(15,2),
    
    -- Tax Details
    cgst_rate DECIMAL(5,2),
    cgst_amount DECIMAL(15,2),
    sgst_rate DECIMAL(5,2),
    sgst_amount DECIMAL(15,2),
    igst_rate DECIMAL(5,2),
    igst_amount DECIMAL(15,2),
    cess_rate DECIMAL(5,2),
    cess_amount DECIMAL(15,2),
    
    total_amount DECIMAL(15,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Input Tax Credit (ITC) Ledger
CREATE TABLE IF NOT EXISTS itc_ledger (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('Purchase', 'Credit Note', 'Debit Note', 'Reversal')),
    transaction_id INTEGER,
    transaction_number VARCHAR(50),
    transaction_date DATE NOT NULL,
    
    -- Supplier Details
    supplier_gstin VARCHAR(15),
    supplier_name VARCHAR(255),
    
    -- ITC Amounts
    cgst_itc DECIMAL(15,2) DEFAULT 0,
    sgst_itc DECIMAL(15,2) DEFAULT 0,
    igst_itc DECIMAL(15,2) DEFAULT 0,
    cess_itc DECIMAL(15,2) DEFAULT 0,
    total_itc DECIMAL(15,2) DEFAULT 0,
    
    -- Utilization
    cgst_utilized DECIMAL(15,2) DEFAULT 0,
    sgst_utilized DECIMAL(15,2) DEFAULT 0,
    igst_utilized DECIMAL(15,2) DEFAULT 0,
    total_utilized DECIMAL(15,2) DEFAULT 0,
    balance_itc DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    itc_status VARCHAR(20) DEFAULT 'Available' CHECK (itc_status IN ('Available', 'Utilized', 'Reversed', 'Lapsed')),
    reversal_reason TEXT,
    
    -- GSTR-2 Matching
    gstr2_matched BOOLEAN DEFAULT FALSE,
    mismatch_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GST Returns Filing
CREATE TABLE IF NOT EXISTS gst_returns (
    id SERIAL PRIMARY KEY,
    return_type VARCHAR(10) CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-9')),
    return_period VARCHAR(10), -- 'MM-YYYY'
    financial_year VARCHAR(10),
    
    -- Period
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    
    -- GSTR-1 (Sales)
    b2b_invoices INTEGER DEFAULT 0,
    b2b_taxable_value DECIMAL(15,2) DEFAULT 0,
    b2b_tax_amount DECIMAL(15,2) DEFAULT 0,
    b2c_invoices INTEGER DEFAULT 0,
    b2c_taxable_value DECIMAL(15,2) DEFAULT 0,
    b2c_tax_amount DECIMAL(15,2) DEFAULT 0,
    
    -- GSTR-3B (Summary)
    total_taxable_sales DECIMAL(15,2) DEFAULT 0,
    total_tax_liability DECIMAL(15,2) DEFAULT 0,
    total_itc_available DECIMAL(15,2) DEFAULT 0,
    total_itc_utilized DECIMAL(15,2) DEFAULT 0,
    total_tax_payable DECIMAL(15,2) DEFAULT 0,
    
    -- Tax Payable Breakup
    cgst_payable DECIMAL(15,2) DEFAULT 0,
    sgst_payable DECIMAL(15,2) DEFAULT 0,
    igst_payable DECIMAL(15,2) DEFAULT 0,
    cess_payable DECIMAL(15,2) DEFAULT 0,
    
    -- Interest & Late Fee
    interest_amount DECIMAL(15,2) DEFAULT 0,
    late_fee DECIMAL(15,2) DEFAULT 0,
    
    -- Payment
    total_paid DECIMAL(15,2) DEFAULT 0,
    payment_date DATE,
    challan_number VARCHAR(50),
    
    -- Filing Status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Filed', 'Revised', 'Cancelled')),
    filed_date DATE,
    acknowledgement_number VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(return_type, return_period)
);

-- TDS Master
CREATE TABLE IF NOT EXISTS tds_sections (
    id SERIAL PRIMARY KEY,
    section_code VARCHAR(20) UNIQUE NOT NULL, -- '194C', '194J', etc.
    section_name VARCHAR(255) NOT NULL,
    description TEXT,
    tds_rate DECIMAL(5,2) NOT NULL,
    threshold_limit DECIMAL(15,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TDS Deductions
CREATE TABLE IF NOT EXISTS tds_deductions (
    id SERIAL PRIMARY KEY,
    deduction_type VARCHAR(20) CHECK (deduction_type IN ('Purchase', 'Expense', 'Salary', 'Professional Fee')),
    transaction_id INTEGER,
    transaction_number VARCHAR(50),
    transaction_date DATE NOT NULL,
    
    -- Party Details
    deductee_pan VARCHAR(10),
    deductee_name VARCHAR(255) NOT NULL,
    
    -- TDS Details
    section_id INTEGER REFERENCES tds_sections(id),
    section_code VARCHAR(20),
    gross_amount DECIMAL(15,2) NOT NULL,
    tds_rate DECIMAL(5,2) NOT NULL,
    tds_amount DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL,
    
    -- Payment to Govt
    tds_paid_date DATE,
    challan_number VARCHAR(50),
    challan_date DATE,
    
    -- Certificate
    certificate_number VARCHAR(50),
    certificate_date DATE,
    
    -- Quarter
    financial_year VARCHAR(10),
    quarter VARCHAR(2), -- 'Q1', 'Q2', 'Q3', 'Q4'
    
    -- Filing
    filed_in_return BOOLEAN DEFAULT FALSE,
    return_period VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_gst_invoices_type_id ON gst_invoices(invoice_type, invoice_id);
CREATE INDEX idx_gst_invoices_date ON gst_invoices(invoice_date);
CREATE INDEX idx_gst_invoice_items_invoice ON gst_invoice_items(gst_invoice_id);
CREATE INDEX idx_itc_ledger_date ON itc_ledger(transaction_date);
CREATE INDEX idx_itc_ledger_status ON itc_ledger(itc_status);
CREATE INDEX idx_tds_deductions_date ON tds_deductions(transaction_date);
CREATE INDEX idx_tds_deductions_section ON tds_deductions(section_id);

-- Views
CREATE OR REPLACE VIEW v_gst_sales_summary AS
SELECT 
    DATE_TRUNC('month', invoice_date) as month,
    COUNT(*) as invoice_count,
    SUM(taxable_amount) as total_taxable,
    SUM(cgst_amount) as total_cgst,
    SUM(sgst_amount) as total_sgst,
    SUM(igst_amount) as total_igst,
    SUM(total_tax_amount) as total_tax,
    SUM(total_invoice_amount) as total_amount
FROM gst_invoices
WHERE invoice_type = 'Sales'
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_gst_purchase_summary AS
SELECT 
    DATE_TRUNC('month', invoice_date) as month,
    COUNT(*) as invoice_count,
    SUM(taxable_amount) as total_taxable,
    SUM(cgst_amount) as total_cgst,
    SUM(sgst_amount) as total_sgst,
    SUM(igst_amount) as total_igst,
    SUM(total_tax_amount) as total_tax,
    SUM(total_invoice_amount) as total_amount
FROM gst_invoices
WHERE invoice_type = 'Purchase'
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_itc_balance AS
SELECT 
    SUM(cgst_itc - cgst_utilized) as cgst_balance,
    SUM(sgst_itc - sgst_utilized) as sgst_balance,
    SUM(igst_itc - igst_utilized) as igst_balance,
    SUM(balance_itc) as total_balance
FROM itc_ledger
WHERE itc_status = 'Available';

CREATE OR REPLACE VIEW v_tds_summary AS
SELECT 
    financial_year,
    quarter,
    section_code,
    COUNT(*) as deduction_count,
    SUM(gross_amount) as total_gross,
    SUM(tds_amount) as total_tds,
    SUM(CASE WHEN tds_paid_date IS NOT NULL THEN tds_amount ELSE 0 END) as paid_tds,
    SUM(CASE WHEN tds_paid_date IS NULL THEN tds_amount ELSE 0 END) as pending_tds
FROM tds_deductions
GROUP BY financial_year, quarter, section_code
ORDER BY financial_year DESC, quarter DESC;

COMMENT ON TABLE gst_settings IS 'GST configuration and company GSTIN details';
COMMENT ON TABLE gst_rates IS 'HSN code-wise GST rates';
COMMENT ON TABLE gst_invoices IS 'GST invoice headers with tax calculations';
COMMENT ON TABLE gst_invoice_items IS 'Line-item level GST calculations';
COMMENT ON TABLE itc_ledger IS 'Input Tax Credit tracking and utilization';
COMMENT ON TABLE gst_returns IS 'GSTR-1 and GSTR-3B return filings';
COMMENT ON TABLE tds_sections IS 'TDS section codes and rates';
COMMENT ON TABLE tds_deductions IS 'TDS deductions from transactions';

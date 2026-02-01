-- =====================================================
-- PURCHASE ORDER & PROCUREMENT SYSTEM
-- =====================================================

-- Purchase Requisition (Internal Request)
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id SERIAL PRIMARY KEY,
    requisition_number VARCHAR(50) UNIQUE NOT NULL,
    requisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Requester
    requested_by INTEGER NOT NULL,
    requester_name VARCHAR(255),
    department VARCHAR(100),
    
    -- Purpose
    purpose TEXT,
    required_by_date DATE,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    
    -- Total
    estimated_amount DECIMAL(15,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected', 'Converted')),
    
    -- Approval
    approved_by INTEGER,
    approved_date DATE,
    rejection_reason TEXT,
    
    -- Conversion to PO
    po_id INTEGER,
    converted_date DATE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requisition Items
CREATE TABLE IF NOT EXISTS requisition_items (
    id SERIAL PRIMARY KEY,
    requisition_id INTEGER REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    
    -- Item
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    
    -- Quantity
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50),
    
    -- Pricing
    estimated_rate DECIMAL(15,2),
    estimated_amount DECIMAL(15,2),
    
    -- Purpose
    purpose TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Vendor
    vendor_id INTEGER NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_gstin VARCHAR(15),
    
    -- Requisition Reference
    requisition_id INTEGER REFERENCES purchase_requisitions(id),
    
    -- Delivery
    delivery_address TEXT,
    delivery_date DATE,
    delivery_terms TEXT,
    
    -- Payment
    payment_terms VARCHAR(255),
    advance_percentage DECIMAL(5,2) DEFAULT 0,
    advance_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Amounts
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    freight_charges DECIMAL(15,2) DEFAULT 0,
    other_charges DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Acknowledged', 'Partially Received', 'Completed', 'Cancelled')),
    
    -- Dates
    sent_date DATE,
    acknowledged_date DATE,
    
    -- Approval
    approved_by INTEGER,
    approved_date DATE,
    
    -- Receipt Tracking
    received_quantity DECIMAL(15,2) DEFAULT 0,
    pending_quantity DECIMAL(15,2) DEFAULT 0,
    received_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Terms & Conditions
    terms_and_conditions TEXT,
    special_instructions TEXT,
    
    remarks TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    -- Item
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    hsn_code VARCHAR(20),
    
    -- Quantity
    ordered_quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50),
    
    -- Received Tracking
    received_quantity DECIMAL(15,3) DEFAULT 0,
    pending_quantity DECIMAL(15,3) DEFAULT 0,
    
    -- Pricing
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    taxable_amount DECIMAL(15,2),
    
    -- Tax
    gst_rate DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Total
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Delivery
    expected_delivery_date DATE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goods Receipt Note (GRN)
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- PO Reference
    po_id INTEGER REFERENCES purchase_orders(id),
    po_number VARCHAR(50),
    
    -- Vendor
    vendor_id INTEGER NOT NULL,
    vendor_name VARCHAR(255),
    
    -- Vendor Document
    vendor_invoice_number VARCHAR(50),
    vendor_invoice_date DATE,
    vehicle_number VARCHAR(50),
    lr_number VARCHAR(50),
    
    -- Receipt Details
    received_by INTEGER,
    receiver_name VARCHAR(255),
    
    -- Quality Check
    qc_status VARCHAR(20) DEFAULT 'Pending' CHECK (qc_status IN ('Pending', 'Approved', 'Rejected', 'Partial')),
    qc_checked_by INTEGER,
    qc_date DATE,
    qc_remarks TEXT,
    
    -- Amount
    total_amount DECIMAL(15,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Received', 'QC Done', 'Posted')),
    is_posted BOOLEAN DEFAULT FALSE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GRN Items
CREATE TABLE IF NOT EXISTS grn_items (
    id SERIAL PRIMARY KEY,
    grn_id INTEGER REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES purchase_order_items(id),
    
    -- Item
    item_name VARCHAR(255) NOT NULL,
    
    -- Quantities
    ordered_quantity DECIMAL(15,3),
    received_quantity DECIMAL(15,3) NOT NULL,
    accepted_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,
    shortage_quantity DECIMAL(15,3) DEFAULT 0,
    
    unit VARCHAR(50),
    
    -- Pricing
    unit_price DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    
    -- Quality
    qc_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    
    -- Storage Location
    storage_location VARCHAR(255),
    bin_location VARCHAR(100),
    
    batch_number VARCHAR(100),
    expiry_date DATE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Master (Enhanced)
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) UNIQUE NOT NULL,
    
    -- Contact
    contact_person VARCHAR(255),
    mobile VARCHAR(15),
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    
    -- GST & Tax
    gstin VARCHAR(15),
    pan VARCHAR(10),
    state_code VARCHAR(2),
    
    -- Bank Details
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    branch VARCHAR(255),
    
    -- Business Terms
    payment_terms VARCHAR(255),
    credit_period INTEGER DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    
    -- Category
    vendor_category VARCHAR(100), -- 'Seeds', 'Fertilizer', 'Pesticide', 'Pots', 'General'
    
    -- Rating
    rating DECIMAL(2,1) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Blacklisted')),
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Quotations (RFQ Response)
CREATE TABLE IF NOT EXISTS vendor_quotations (
    id SERIAL PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Vendor
    vendor_id INTEGER REFERENCES vendors(id),
    vendor_name VARCHAR(255),
    
    -- Validity
    valid_till DATE,
    
    -- Terms
    payment_terms VARCHAR(255),
    delivery_terms VARCHAR(255),
    
    -- Total
    total_amount DECIMAL(15,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Received' CHECK (status IN ('Received', 'Under Review', 'Accepted', 'Rejected')),
    
    -- Comparison
    is_lowest_quote BOOLEAN DEFAULT FALSE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER REFERENCES vendor_quotations(id) ON DELETE CASCADE,
    
    item_name VARCHAR(255),
    quantity DECIMAL(15,3),
    unit VARCHAR(50),
    unit_price DECIMAL(15,2),
    tax_percentage DECIMAL(5,2),
    total_amount DECIMAL(15,2),
    
    delivery_days INTEGER,
    remarks TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Return/Debit Note
CREATE TABLE IF NOT EXISTS purchase_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- GRN/Purchase Reference
    grn_id INTEGER REFERENCES goods_receipt_notes(id),
    purchase_bill_id INTEGER,
    
    -- Vendor
    vendor_id INTEGER NOT NULL,
    vendor_name VARCHAR(255),
    
    -- Return Reason
    return_reason TEXT NOT NULL,
    
    -- Amount
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Posted')),
    is_posted BOOLEAN DEFAULT FALSE,
    
    -- Accounting
    debit_note_number VARCHAR(50),
    voucher_id INTEGER,
    
    remarks TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return Items
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER REFERENCES purchase_returns(id) ON DELETE CASCADE,
    grn_item_id INTEGER REFERENCES grn_items(id),
    
    item_name VARCHAR(255),
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    
    return_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_grn_po ON goods_receipt_notes(po_id);
CREATE INDEX idx_grn_items_grn ON grn_items(grn_id);
CREATE INDEX idx_vendors_category ON vendors(vendor_category);
CREATE INDEX idx_quotations_vendor ON vendor_quotations(vendor_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_po_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update PO item received quantities
    IF TG_TABLE_NAME = 'grn_items' THEN
        UPDATE purchase_order_items
        SET 
            received_quantity = received_quantity + NEW.accepted_quantity,
            pending_quantity = ordered_quantity - (received_quantity + NEW.accepted_quantity)
        WHERE id = NEW.po_item_id;
        
        -- Update PO status
        UPDATE purchase_orders po
        SET 
            status = CASE 
                WHEN (SELECT SUM(pending_quantity) FROM purchase_order_items WHERE po_id = po.id) = 0 THEN 'Completed'
                WHEN (SELECT SUM(received_quantity) FROM purchase_order_items WHERE po_id = po.id) > 0 THEN 'Partially Received'
                ELSE po.status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT po_id FROM goods_receipt_notes WHERE id = NEW.grn_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grn_update_po
    AFTER INSERT OR UPDATE ON grn_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_status();

-- Views
CREATE OR REPLACE VIEW v_po_summary AS
SELECT 
    po.id,
    po.po_number,
    po.po_date,
    v.vendor_name,
    po.total_amount,
    po.status,
    po.delivery_date,
    COUNT(poi.id) as item_count,
    SUM(poi.pending_quantity) as total_pending_qty
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
GROUP BY po.id, v.vendor_name
ORDER BY po.po_date DESC;

CREATE OR REPLACE VIEW v_pending_grn AS
SELECT 
    po.id,
    po.po_number,
    po.po_date,
    v.vendor_name,
    poi.item_name,
    poi.ordered_quantity,
    poi.received_quantity,
    poi.pending_quantity,
    poi.expected_delivery_date
FROM purchase_orders po
JOIN vendors v ON po.vendor_id = v.id
JOIN purchase_order_items poi ON po.id = poi.po_id
WHERE poi.pending_quantity > 0
ORDER BY poi.expected_delivery_date;

COMMENT ON TABLE purchase_requisitions IS 'Internal purchase requests';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to vendors';
COMMENT ON TABLE goods_receipt_notes IS 'Material receipt tracking';
COMMENT ON TABLE vendors IS 'Vendor/Supplier master';
COMMENT ON TABLE vendor_quotations IS 'Vendor price quotations';
COMMENT ON TABLE purchase_returns IS 'Purchase return/debit notes';

-- =====================================================
-- QUALITY INSPECTION & CONTROL SYSTEM
-- QC gate for incoming materials with debit note generation
-- =====================================================

-- Quality Inspections (Main Table)
CREATE TABLE IF NOT EXISTS quality_inspections (
    id SERIAL PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Reference
    reference_type VARCHAR(50) NOT NULL, -- 'purchase_order', 'purchase_bill', 'delivery', 'grn'
    reference_id INTEGER NOT NULL,
    
    -- Supplier & Order Info
    supplier_id INTEGER REFERENCES suppliers(id),
    po_number VARCHAR(50),
    bill_number VARCHAR(50),
    
    -- Inspection Details
    inspection_date DATE DEFAULT CURRENT_DATE,
    inspector_name VARCHAR(255),
    inspector_id INTEGER REFERENCES users(id),
    
    -- Overall Status
    inspection_status VARCHAR(50) DEFAULT 'pending' CHECK (
        inspection_status IN ('pending', 'in_progress', 'approved', 'rejected', 'conditional_approved')
    ),
    
    -- Quantities
    total_items_inspected INTEGER DEFAULT 0,
    items_passed INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    pass_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_items_inspected > 0 
             THEN (items_passed::DECIMAL / total_items_inspected * 100) 
             ELSE 0 END
    ) STORED,
    
    -- Quality Grade
    overall_quality_grade VARCHAR(20), -- 'A', 'B', 'C', 'Rejected'
    
    -- Financial Impact
    total_value DECIMAL(15,2) DEFAULT 0,
    rejected_value DECIMAL(15,2) DEFAULT 0,
    debit_note_value DECIMAL(15,2) DEFAULT 0,
    
    -- Notes & Actions
    inspection_notes TEXT,
    rejection_reason TEXT,
    corrective_action TEXT,
    
    -- Debit Note
    debit_note_generated BOOLEAN DEFAULT FALSE,
    debit_note_id INTEGER,
    
    -- Approval
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Items (Line-level QC)
CREATE TABLE IF NOT EXISTS inspection_items (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES quality_inspections(id) ON DELETE CASCADE,
    
    -- Item Details
    item_id INTEGER REFERENCES inventory_items(id),
    item_name VARCHAR(255),
    batch_number VARCHAR(100),
    
    -- Quantities
    ordered_quantity DECIMAL(10,2),
    received_quantity DECIMAL(10,2),
    inspected_quantity DECIMAL(10,2),
    accepted_quantity DECIMAL(10,2) DEFAULT 0,
    rejected_quantity DECIMAL(10,2) DEFAULT 0,
    
    -- Pricing
    unit_price DECIMAL(10,2),
    total_value DECIMAL(15,2),
    rejected_value DECIMAL(15,2),
    
    -- Quality Checks
    quality_status VARCHAR(50) DEFAULT 'pending', -- 'passed', 'failed', 'conditional'
    quality_grade VARCHAR(20),
    
    -- Defect Tracking
    defect_type VARCHAR(100), -- 'damaged', 'expired', 'wrong_item', 'poor_quality', 'contaminated'
    defect_description TEXT,
    defect_percentage DECIMAL(5,2),
    
    -- Specific Checks (for seeds/plants)
    germination_test_done BOOLEAN DEFAULT FALSE,
    germination_rate DECIMAL(5,2),
    physical_damage BOOLEAN DEFAULT FALSE,
    moisture_content DECIMAL(5,2),
    pest_infestation BOOLEAN DEFAULT FALSE,
    
    -- Photos/Attachments
    photo_urls TEXT[], -- Array of image URLs
    
    -- Inspector Notes
    inspector_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QC Checklists (Templates)
CREATE TABLE IF NOT EXISTS qc_checklists (
    id SERIAL PRIMARY KEY,
    checklist_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'seeds', 'fertilizers', 'pesticides', 'pots', 'soil'
    
    -- Checklist Items (JSON array)
    check_points JSONB, -- [{"point": "Check moisture", "type": "boolean"}, ...]
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QC Checklist Responses
CREATE TABLE IF NOT EXISTS qc_checklist_responses (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES quality_inspections(id) ON DELETE CASCADE,
    inspection_item_id INTEGER REFERENCES inspection_items(id) ON DELETE CASCADE,
    checklist_id INTEGER REFERENCES qc_checklists(id),
    
    -- Responses (JSON)
    responses JSONB, -- {"moisture_check": true, "damage_check": false, ...}
    
    overall_pass BOOLEAN,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debit Notes (for Rejected Materials)
CREATE TABLE IF NOT EXISTS debit_notes (
    id SERIAL PRIMARY KEY,
    debit_note_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Reference
    inspection_id INTEGER REFERENCES quality_inspections(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    purchase_bill_id INTEGER,
    
    -- Details
    debit_note_date DATE DEFAULT CURRENT_DATE,
    reason VARCHAR(100) NOT NULL, -- 'quality_rejection', 'short_supply', 'damage', 'wrong_item'
    description TEXT,
    
    -- Financial
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent_to_supplier', 'acknowledged', 'resolved', 'disputed')
    ),
    
    -- Resolution
    resolution_type VARCHAR(50), -- 'credit_note', 'replacement', 'refund'
    resolution_date DATE,
    resolution_notes TEXT,
    
    -- Approval
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debit Note Items
CREATE TABLE IF NOT EXISTS debit_note_items (
    id SERIAL PRIMARY KEY,
    debit_note_id INTEGER REFERENCES debit_notes(id) ON DELETE CASCADE,
    
    item_id INTEGER REFERENCES inventory_items(id),
    item_name VARCHAR(255),
    rejected_quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(15,2),
    
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material Return Requests
CREATE TABLE IF NOT EXISTS material_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Reference
    inspection_id INTEGER REFERENCES quality_inspections(id),
    debit_note_id INTEGER REFERENCES debit_notes(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    -- Return Details
    return_date DATE DEFAULT CURRENT_DATE,
    reason VARCHAR(100),
    
    -- Status
    return_status VARCHAR(50) DEFAULT 'initiated' CHECK (
        return_status IN ('initiated', 'packed', 'shipped', 'received_by_supplier', 'completed', 'cancelled')
    ),
    
    -- Logistics
    courier_name VARCHAR(255),
    tracking_number VARCHAR(100),
    pickup_date DATE,
    
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    
    notes TEXT,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Views for QC Dashboard
CREATE OR REPLACE VIEW v_pending_inspections AS
SELECT 
    qi.id,
    qi.inspection_number,
    qi.inspection_date,
    qi.reference_type,
    qi.reference_id,
    s.supplier_name,
    qi.po_number,
    qi.total_items_inspected,
    qi.inspection_status,
    u.full_name as inspector_name
FROM quality_inspections qi
JOIN suppliers s ON qi.supplier_id = s.id
LEFT JOIN users u ON qi.inspector_id = u.id
WHERE qi.inspection_status IN ('pending', 'in_progress')
ORDER BY qi.inspection_date DESC;

CREATE OR REPLACE VIEW v_rejection_summary AS
SELECT 
    DATE_TRUNC('month', qi.inspection_date) as month,
    s.supplier_name,
    COUNT(qi.id) as total_inspections,
    SUM(qi.items_failed) as total_rejected_items,
    AVG(qi.pass_percentage) as avg_pass_rate,
    SUM(qi.rejected_value) as total_rejected_value
FROM quality_inspections qi
JOIN suppliers s ON qi.supplier_id = s.id
WHERE qi.inspection_status = 'rejected'
GROUP BY DATE_TRUNC('month', qi.inspection_date), s.supplier_name
ORDER BY month DESC, total_rejected_value DESC;

CREATE OR REPLACE VIEW v_debit_notes_pending AS
SELECT 
    dn.*,
    s.supplier_name,
    s.contact_person,
    s.email,
    s.phone
FROM debit_notes dn
JOIN suppliers s ON dn.supplier_id = s.id
WHERE dn.status IN ('pending', 'sent_to_supplier')
ORDER BY dn.debit_note_date DESC;

-- Indexes
CREATE INDEX idx_quality_inspections_supplier ON quality_inspections(supplier_id);
CREATE INDEX idx_quality_inspections_status ON quality_inspections(inspection_status);
CREATE INDEX idx_quality_inspections_date ON quality_inspections(inspection_date);
CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id);
CREATE INDEX idx_inspection_items_item ON inspection_items(item_id);
CREATE INDEX idx_debit_notes_supplier ON debit_notes(supplier_id);
CREATE INDEX idx_debit_notes_status ON debit_notes(status);
CREATE INDEX idx_material_returns_supplier ON material_returns(supplier_id);

-- Triggers
CREATE TRIGGER update_quality_inspections_updated_at 
    BEFORE UPDATE ON quality_inspections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debit_notes_updated_at 
    BEFORE UPDATE ON debit_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_returns_updated_at 
    BEFORE UPDATE ON material_returns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate inspection number
CREATE OR REPLACE FUNCTION generate_inspection_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
        NEW.inspection_number := 'QC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                                 LPAD(NEXTVAL('quality_inspections_id_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inspection_number 
    BEFORE INSERT ON quality_inspections 
    FOR EACH ROW EXECUTE FUNCTION generate_inspection_number();

-- Function to auto-generate debit note number
CREATE OR REPLACE FUNCTION generate_debit_note_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.debit_note_number IS NULL OR NEW.debit_note_number = '' THEN
        NEW.debit_note_number := 'DN-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                                  LPAD(NEXTVAL('debit_notes_id_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_debit_note_number 
    BEFORE INSERT ON debit_notes 
    FOR EACH ROW EXECUTE FUNCTION generate_debit_note_number();

-- Comments
COMMENT ON TABLE quality_inspections IS 'Quality control gate for incoming materials';
COMMENT ON TABLE inspection_items IS 'Line-item level quality inspection details';
COMMENT ON TABLE qc_checklists IS 'Reusable QC checklist templates';
COMMENT ON TABLE debit_notes IS 'Debit notes for rejected/damaged materials';
COMMENT ON TABLE material_returns IS 'Track physical return of rejected materials';

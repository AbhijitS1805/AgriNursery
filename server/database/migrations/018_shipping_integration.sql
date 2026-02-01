-- =====================================================
-- SHIPPING & LOGISTICS INTEGRATION SYSTEM
-- Track shipments, rates, courier integration, tracking
-- =====================================================

-- Shipping Carriers/Couriers
CREATE TABLE IF NOT EXISTS shipping_carriers (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(50) UNIQUE NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    
    -- Contact
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- API Integration
    api_enabled BOOLEAN DEFAULT FALSE,
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    
    -- Service Types
    services_offered TEXT[], -- ['express', 'standard', 'economy', 'cold_chain']
    
    -- Coverage
    domestic_service BOOLEAN DEFAULT TRUE,
    international_service BOOLEAN DEFAULT FALSE,
    coverage_pincodes TEXT[], -- Array of serviceable pincodes
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    preferred_carrier BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipping Rate Cards
CREATE TABLE IF NOT EXISTS shipping_rates (
    id SERIAL PRIMARY KEY,
    carrier_id INTEGER REFERENCES shipping_carriers(id) ON DELETE CASCADE,
    
    -- Service Type
    service_type VARCHAR(50), -- 'express', 'standard', 'economy'
    
    -- Zone-based Pricing
    zone VARCHAR(50), -- 'local', 'regional', 'national', 'zone_a', 'zone_b'
    origin_pincode VARCHAR(10),
    destination_pincode VARCHAR(10),
    
    -- Weight Slabs
    weight_from_kg DECIMAL(10,2),
    weight_to_kg DECIMAL(10,2),
    
    -- Volumetric Weight (for live plants)
    volumetric_divisor INTEGER DEFAULT 5000, -- cm³/kg
    
    -- Pricing
    base_rate DECIMAL(10,2) NOT NULL,
    per_kg_rate DECIMAL(10,2) DEFAULT 0,
    fuel_surcharge_percentage DECIMAL(5,2) DEFAULT 0,
    handling_charge DECIMAL(10,2) DEFAULT 0,
    
    -- Additional Charges
    fragile_charge DECIMAL(10,2) DEFAULT 0, -- For plants
    cold_chain_charge DECIMAL(10,2) DEFAULT 0,
    insurance_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Validity
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipments (Main Table)
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Reference
    reference_type VARCHAR(50), -- 'sales_order', 'purchase_return', 'transfer'
    reference_id INTEGER,
    reference_number VARCHAR(50),
    
    -- Parties
    customer_id INTEGER REFERENCES customers(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    -- Shipping Details
    carrier_id INTEGER REFERENCES shipping_carriers(id),
    service_type VARCHAR(50),
    
    -- Dates
    shipment_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Origin
    origin_address TEXT,
    origin_city VARCHAR(100),
    origin_state VARCHAR(100),
    origin_pincode VARCHAR(10),
    
    -- Destination
    destination_name VARCHAR(255),
    destination_address TEXT,
    destination_city VARCHAR(100),
    destination_state VARCHAR(100),
    destination_pincode VARCHAR(10),
    destination_phone VARCHAR(20),
    
    -- Package Details
    number_of_packages INTEGER DEFAULT 1,
    total_weight_kg DECIMAL(10,2),
    volumetric_weight_kg DECIMAL(10,2),
    chargeable_weight_kg DECIMAL(10,2),
    
    -- Dimensions (in cm)
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    height_cm DECIMAL(10,2),
    
    -- Special Handling
    is_fragile BOOLEAN DEFAULT TRUE, -- Plants are fragile
    requires_cold_chain BOOLEAN DEFAULT FALSE,
    handling_instructions TEXT,
    
    -- Tracking
    tracking_number VARCHAR(100),
    awb_number VARCHAR(100), -- Air Waybill
    
    -- Shipping Charges
    freight_charge DECIMAL(10,2) DEFAULT 0,
    fuel_surcharge DECIMAL(10,2) DEFAULT 0,
    handling_charge DECIMAL(10,2) DEFAULT 0,
    insurance_charge DECIMAL(10,2) DEFAULT 0,
    other_charges DECIMAL(10,2) DEFAULT 0,
    total_shipping_cost DECIMAL(10,2) GENERATED ALWAYS AS (
        freight_charge + fuel_surcharge + handling_charge + insurance_charge + other_charges
    ) STORED,
    
    -- Payment
    freight_payment_mode VARCHAR(50) DEFAULT 'prepaid', -- 'prepaid', 'to_pay', 'third_party'
    
    -- Status
    shipment_status VARCHAR(50) DEFAULT 'created' CHECK (
        shipment_status IN ('created', 'label_printed', 'picked_up', 'in_transit', 
                           'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled')
    ),
    
    -- Delivery Confirmation
    delivered_to VARCHAR(255),
    delivery_signature_url TEXT,
    delivery_photo_url TEXT,
    delivery_notes TEXT,
    
    -- Label
    shipping_label_url TEXT,
    label_printed_at TIMESTAMP,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Items
CREATE TABLE IF NOT EXISTS shipment_items (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
    
    -- Item Details
    item_type VARCHAR(50), -- 'finished_goods', 'inventory_item', 'batch'
    item_id INTEGER,
    item_name VARCHAR(255),
    sku_code VARCHAR(100),
    
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    
    -- Packaging
    package_number INTEGER, -- Which package this item is in
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracking Updates (Timeline)
CREATE TABLE IF NOT EXISTS tracking_updates (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
    
    -- Update Details
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(100),
    location VARCHAR(255),
    
    -- Description
    description TEXT,
    
    -- Source
    updated_by VARCHAR(100), -- 'system', 'carrier_api', 'manual', 'user_id'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipping Rate Calculator Function
CREATE OR REPLACE FUNCTION calculate_shipping_rate(
    p_carrier_id INTEGER,
    p_service_type VARCHAR,
    p_origin_pincode VARCHAR,
    p_destination_pincode VARCHAR,
    p_weight_kg DECIMAL,
    p_is_fragile BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    base_rate DECIMAL,
    per_kg_rate DECIMAL,
    fuel_surcharge DECIMAL,
    handling_charge DECIMAL,
    fragile_charge DECIMAL,
    total_cost DECIMAL
) AS $$
DECLARE
    v_rate_record RECORD;
    v_base DECIMAL := 0;
    v_per_kg DECIMAL := 0;
    v_fuel DECIMAL := 0;
    v_handling DECIMAL := 0;
    v_fragile DECIMAL := 0;
    v_total DECIMAL := 0;
BEGIN
    -- Find applicable rate
    SELECT * INTO v_rate_record
    FROM shipping_rates
    WHERE carrier_id = p_carrier_id
      AND service_type = p_service_type
      AND p_weight_kg BETWEEN weight_from_kg AND weight_to_kg
      AND is_active = TRUE
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    ORDER BY weight_from_kg DESC
    LIMIT 1;
    
    IF FOUND THEN
        v_base := v_rate_record.base_rate;
        v_per_kg := v_rate_record.per_kg_rate * p_weight_kg;
        v_fuel := (v_base + v_per_kg) * v_rate_record.fuel_surcharge_percentage / 100;
        v_handling := v_rate_record.handling_charge;
        
        IF p_is_fragile THEN
            v_fragile := v_rate_record.fragile_charge;
        END IF;
        
        v_total := v_base + v_per_kg + v_fuel + v_handling + v_fragile;
    END IF;
    
    RETURN QUERY SELECT v_base, v_per_kg, v_fuel, v_handling, v_fragile, v_total;
END;
$$ LANGUAGE plpgsql;

-- Views for Shipping Dashboard
CREATE OR REPLACE VIEW v_active_shipments AS
SELECT 
    s.*,
    c.customer_name,
    sc.carrier_name,
    COUNT(si.id) as total_items
FROM shipments s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN shipping_carriers sc ON s.carrier_id = sc.id
LEFT JOIN shipment_items si ON s.id = si.shipment_id
WHERE s.shipment_status NOT IN ('delivered', 'cancelled')
GROUP BY s.id, c.customer_name, sc.carrier_name
ORDER BY s.shipment_date DESC;

CREATE OR REPLACE VIEW v_delivery_performance AS
SELECT 
    DATE_TRUNC('month', shipment_date) as month,
    carrier_id,
    sc.carrier_name,
    COUNT(*) as total_shipments,
    SUM(CASE WHEN actual_delivery_date <= expected_delivery_date THEN 1 ELSE 0 END) as on_time_deliveries,
    AVG(CASE WHEN actual_delivery_date IS NOT NULL 
             THEN actual_delivery_date - expected_delivery_date 
             ELSE NULL END) as avg_delay_days,
    SUM(total_shipping_cost) as total_shipping_cost
FROM shipments s
JOIN shipping_carriers sc ON s.carrier_id = sc.id
WHERE shipment_status = 'delivered'
GROUP BY DATE_TRUNC('month', shipment_date), carrier_id, sc.carrier_name
ORDER BY month DESC, total_shipments DESC;

CREATE OR REPLACE VIEW v_pending_pickups AS
SELECT 
    s.id,
    s.shipment_number,
    s.shipment_date,
    s.destination_name,
    s.destination_city,
    sc.carrier_name,
    s.number_of_packages,
    s.total_weight_kg
FROM shipments s
JOIN shipping_carriers sc ON s.carrier_id = sc.id
WHERE s.shipment_status = 'created'
ORDER BY s.shipment_date;

-- Indexes
CREATE INDEX idx_shipments_customer ON shipments(customer_id);
CREATE INDEX idx_shipments_carrier ON shipments(carrier_id);
CREATE INDEX idx_shipments_status ON shipments(shipment_status);
CREATE INDEX idx_shipments_date ON shipments(shipment_date);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX idx_tracking_updates_shipment ON tracking_updates(shipment_id);
CREATE INDEX idx_shipping_rates_carrier ON shipping_rates(carrier_id);

-- Triggers
CREATE TRIGGER update_shipments_updated_at 
    BEFORE UPDATE ON shipments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_carriers_updated_at 
    BEFORE UPDATE ON shipping_carriers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate shipment number
CREATE OR REPLACE FUNCTION generate_shipment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
        NEW.shipment_number := 'SHP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                                LPAD(NEXTVAL('shipments_id_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shipment_number 
    BEFORE INSERT ON shipments 
    FOR EACH ROW EXECUTE FUNCTION generate_shipment_number();

-- Calculate volumetric weight trigger
CREATE OR REPLACE FUNCTION calculate_volumetric_weight()
RETURNS TRIGGER AS $$
DECLARE
    v_volumetric_weight DECIMAL;
    v_divisor INTEGER := 5000; -- Default divisor
BEGIN
    IF NEW.length_cm IS NOT NULL AND NEW.width_cm IS NOT NULL AND NEW.height_cm IS NOT NULL THEN
        -- Get divisor from carrier's rate card
        SELECT COALESCE(volumetric_divisor, 5000) INTO v_divisor
        FROM shipping_rates
        WHERE carrier_id = NEW.carrier_id
        LIMIT 1;
        
        -- Calculate volumetric weight
        v_volumetric_weight := (NEW.length_cm * NEW.width_cm * NEW.height_cm) / v_divisor;
        NEW.volumetric_weight_kg := v_volumetric_weight;
        
        -- Chargeable weight is higher of actual or volumetric
        NEW.chargeable_weight_kg := GREATEST(NEW.total_weight_kg, v_volumetric_weight);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_shipment_weight 
    BEFORE INSERT OR UPDATE ON shipments 
    FOR EACH ROW EXECUTE FUNCTION calculate_volumetric_weight();

-- Comments
COMMENT ON TABLE shipping_carriers IS 'Courier/carrier master with API integration';
COMMENT ON TABLE shipping_rates IS 'Zone and weight-based shipping rate cards';
COMMENT ON TABLE shipments IS 'Shipment tracking with delivery confirmation';
COMMENT ON TABLE tracking_updates IS 'Real-time shipment status timeline';
COMMENT ON FUNCTION calculate_shipping_rate IS 'Calculate shipping cost based on carrier rates';

-- Enhanced Delivery Management System
-- Includes vehicles, delivery personnel, and delivery tracking

-- =============================================
-- Vehicles Table
-- =============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- Truck, Van, Pickup, Auto, Bike, etc.
    capacity_kg DECIMAL(10,2), -- Load capacity in kg
    capacity_cubic_meter DECIMAL(10,2), -- Volume capacity
    driver_name VARCHAR(255),
    driver_mobile VARCHAR(15),
    status VARCHAR(20) DEFAULT 'Available', -- Available, In Use, Maintenance, Retired
    fuel_type VARCHAR(20), -- Petrol, Diesel, Electric, CNG
    insurance_expiry DATE,
    maintenance_due DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);

-- =============================================
-- Delivery Personnel Table
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_personnel (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    alternate_mobile VARCHAR(15),
    address TEXT,
    role VARCHAR(50) DEFAULT 'Delivery Boy', -- Delivery Boy, Driver, Helper, Supervisor
    joining_date DATE,
    status VARCHAR(20) DEFAULT 'Active', -- Active, On Leave, Resigned, Terminated
    driving_license VARCHAR(50),
    license_expiry DATE,
    aadhar_number VARCHAR(12),
    salary_amount DECIMAL(10,2),
    photo_url TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_mobile VARCHAR(15),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_personnel_status ON delivery_personnel(status);
CREATE INDEX idx_personnel_mobile ON delivery_personnel(mobile);
CREATE INDEX idx_personnel_code ON delivery_personnel(employee_code);

-- =============================================
-- Enhanced Deliveries Table
-- =============================================
-- Drop existing table and recreate with vehicle and personnel
DROP TABLE IF EXISTS delivery_items CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;

CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    sales_invoice_id INTEGER REFERENCES sales_invoices(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES delivery_personnel(id),
    helper_id INTEGER REFERENCES delivery_personnel(id), -- Optional helper/assistant
    delivery_date DATE NOT NULL,
    scheduled_time TIME,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    delivery_address TEXT NOT NULL,
    customer_name VARCHAR(255),
    customer_mobile VARCHAR(15),
    status VARCHAR(20) DEFAULT 'Scheduled', -- Scheduled, In Transit, Delivered, Cancelled, Failed
    delivery_proof_url TEXT, -- Photo/signature of delivery proof
    customer_signature_url TEXT,
    distance_km DECIMAL(10,2),
    fuel_cost DECIMAL(10,2),
    toll_charges DECIMAL(10,2),
    other_expenses DECIMAL(10,2),
    total_expense DECIMAL(10,2),
    delivery_notes TEXT,
    customer_feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    cancelled_reason TEXT,
    failed_reason TEXT,
    rescheduled_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_number ON deliveries(delivery_number);
CREATE INDEX idx_deliveries_booking ON deliveries(booking_id);
CREATE INDEX idx_deliveries_vehicle ON deliveries(vehicle_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);

-- =============================================
-- Delivery Items Table
-- =============================================
CREATE TABLE delivery_items (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
    booking_item_id INTEGER REFERENCES booking_items(id),
    plant_name VARCHAR(255) NOT NULL,
    production_id INTEGER REFERENCES productions(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    delivered_quantity INTEGER DEFAULT 0,
    damaged_quantity INTEGER DEFAULT 0,
    returned_quantity INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX idx_delivery_items_booking_item ON delivery_items(booking_item_id);

-- =============================================
-- Delivery Routes Table (for route optimization)
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    route_description TEXT,
    start_location VARCHAR(255),
    waypoints JSONB, -- Array of locations in order
    total_distance_km DECIMAL(10,2),
    estimated_time_hours DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Vehicle Maintenance Log
-- =============================================
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL, -- Service, Repair, Inspection, Fuel, Other
    description TEXT,
    cost DECIMAL(10,2),
    odometer_reading INTEGER,
    next_service_km INTEGER,
    next_service_date DATE,
    vendor_name VARCHAR(255),
    invoice_number VARCHAR(50),
    invoice_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

CREATE INDEX idx_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX idx_maintenance_date ON vehicle_maintenance(maintenance_date);

-- =============================================
-- Delivery Personnel Attendance
-- =============================================
CREATE TABLE IF NOT EXISTS personnel_attendance (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER REFERENCES delivery_personnel(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Present', -- Present, Absent, Half Day, Leave, Holiday
    check_in_time TIME,
    check_out_time TIME,
    total_hours DECIMAL(5,2),
    deliveries_completed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(personnel_id, attendance_date)
);

CREATE INDEX idx_attendance_date ON personnel_attendance(attendance_date);
CREATE INDEX idx_attendance_personnel ON personnel_attendance(personnel_id);

-- =============================================
-- Auto-generate delivery numbers
-- =============================================
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM deliveries
    WHERE delivery_number LIKE 'DEL-' || year_part || '-%';
    
    NEW.delivery_number := 'DEL-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_delivery_number ON deliveries;
CREATE TRIGGER trigger_generate_delivery_number
    BEFORE INSERT ON deliveries
    FOR EACH ROW
    WHEN (NEW.delivery_number IS NULL OR NEW.delivery_number = '')
    EXECUTE FUNCTION generate_delivery_number();

-- =============================================
-- Update booking item delivered quantity
-- =============================================
CREATE OR REPLACE FUNCTION update_booking_item_delivered_qty()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if delivery is marked as "Delivered"
    IF (SELECT status FROM deliveries WHERE id = NEW.delivery_id) = 'Delivered' THEN
        UPDATE booking_items
        SET delivered_quantity = COALESCE(delivered_quantity, 0) + NEW.delivered_quantity
        WHERE id = NEW.booking_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_delivered_qty ON delivery_items;
CREATE TRIGGER trigger_update_delivered_qty
    AFTER INSERT OR UPDATE OF delivered_quantity ON delivery_items
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_item_delivered_qty();

-- =============================================
-- Auto-calculate delivery total expense
-- =============================================
CREATE OR REPLACE FUNCTION calculate_delivery_expense()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_expense := COALESCE(NEW.fuel_cost, 0) + 
                        COALESCE(NEW.toll_charges, 0) + 
                        COALESCE(NEW.other_expenses, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_expense ON deliveries;
CREATE TRIGGER trigger_calculate_expense
    BEFORE INSERT OR UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION calculate_delivery_expense();

-- =============================================
-- Update timestamps
-- =============================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vehicles_timestamp ON vehicles;
CREATE TRIGGER update_vehicles_timestamp
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_personnel_timestamp ON delivery_personnel;
CREATE TRIGGER update_personnel_timestamp
    BEFORE UPDATE ON delivery_personnel
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_deliveries_timestamp ON deliveries;
CREATE TRIGGER update_deliveries_timestamp
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- =============================================
-- Views for reporting
-- =============================================

-- Delivery summary view
CREATE OR REPLACE VIEW v_delivery_summary AS
SELECT 
    d.id,
    d.delivery_number,
    d.delivery_date,
    d.status,
    b.booking_number,
    f.farmer_name,
    f.mobile as farmer_mobile,
    si.invoice_number,
    v.vehicle_number,
    v.vehicle_type,
    dp.name as driver_name,
    dp.mobile as driver_mobile,
    h.name as helper_name,
    d.customer_name,
    d.customer_mobile,
    d.delivery_address,
    COUNT(di.id) as item_count,
    SUM(di.quantity) as total_quantity,
    SUM(di.delivered_quantity) as total_delivered,
    d.total_expense,
    d.distance_km,
    d.rating,
    d.scheduled_time,
    d.actual_start_time,
    d.actual_end_time
FROM deliveries d
LEFT JOIN bookings b ON d.booking_id = b.id
LEFT JOIN farmers f ON b.farmer_id = f.id
LEFT JOIN sales_invoices si ON d.sales_invoice_id = si.id
LEFT JOIN vehicles v ON d.vehicle_id = v.id
LEFT JOIN delivery_personnel dp ON d.driver_id = dp.id
LEFT JOIN delivery_personnel h ON d.helper_id = h.id
LEFT JOIN delivery_items di ON d.id = di.delivery_id
GROUP BY d.id, d.delivery_number, d.delivery_date, d.status, b.booking_number,
         f.farmer_name, f.mobile, si.invoice_number, v.vehicle_number, v.vehicle_type,
         dp.name, dp.mobile, h.name, d.customer_name, d.customer_mobile,
         d.delivery_address, d.total_expense, d.distance_km, d.rating,
         d.scheduled_time, d.actual_start_time, d.actual_end_time;

-- Vehicle utilization view
CREATE OR REPLACE VIEW v_vehicle_utilization AS
SELECT 
    v.id,
    v.vehicle_number,
    v.vehicle_type,
    v.status,
    v.driver_name,
    COUNT(d.id) as total_deliveries,
    COUNT(CASE WHEN d.status = 'Delivered' THEN 1 END) as completed_deliveries,
    SUM(d.distance_km) as total_distance,
    SUM(d.fuel_cost) as total_fuel_cost,
    MAX(d.delivery_date) as last_delivery_date
FROM vehicles v
LEFT JOIN deliveries d ON v.id = d.vehicle_id
GROUP BY v.id, v.vehicle_number, v.vehicle_type, v.status, v.driver_name;

-- Personnel performance view
CREATE OR REPLACE VIEW v_personnel_performance AS
SELECT 
    dp.id,
    dp.employee_code,
    dp.name,
    dp.mobile,
    dp.role,
    dp.status,
    COUNT(d.id) as total_deliveries,
    COUNT(CASE WHEN d.status = 'Delivered' THEN 1 END) as completed_deliveries,
    AVG(d.rating) as avg_rating,
    SUM(CASE WHEN pa.status = 'Present' THEN 1 ELSE 0 END) as days_present,
    SUM(CASE WHEN pa.status = 'Absent' THEN 1 ELSE 0 END) as days_absent
FROM delivery_personnel dp
LEFT JOIN deliveries d ON dp.id = d.driver_id OR dp.id = d.helper_id
LEFT JOIN personnel_attendance pa ON dp.id = pa.personnel_id
    AND pa.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY dp.id, dp.employee_code, dp.name, dp.mobile, dp.role, dp.status;

-- =============================================
-- Sample Data
-- =============================================

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_number, vehicle_type, capacity_kg, driver_name, driver_mobile, status, fuel_type) VALUES
('MH12AB1234', 'Pickup Truck', 1000.00, 'Ramesh Kumar', '9876543210', 'Available', 'Diesel'),
('MH12CD5678', 'Van', 500.00, 'Suresh Patil', '9876543211', 'Available', 'Diesel'),
('MH12EF9012', 'Auto Rickshaw', 200.00, 'Vijay Jadhav', '9876543212', 'Available', 'CNG')
ON CONFLICT (vehicle_number) DO NOTHING;

-- Insert sample delivery personnel
INSERT INTO delivery_personnel (employee_code, name, mobile, role, joining_date, status, salary_amount) VALUES
('EMP001', 'Ramesh Kumar', '9876543210', 'Driver', '2023-01-15', 'Active', 18000.00),
('EMP002', 'Suresh Patil', '9876543211', 'Driver', '2023-03-01', 'Active', 17000.00),
('EMP003', 'Vijay Jadhav', '9876543212', 'Driver', '2023-06-10', 'Active', 15000.00),
('EMP004', 'Raju Singh', '9876543213', 'Delivery Boy', '2024-01-01', 'Active', 12000.00),
('EMP005', 'Prakash Yadav', '9876543214', 'Helper', '2024-02-15', 'Active', 10000.00)
ON CONFLICT (employee_code) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "abhijit.shahane";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "abhijit.shahane";

COMMENT ON TABLE vehicles IS 'Vehicle master for delivery fleet management';
COMMENT ON TABLE delivery_personnel IS 'Delivery staff and drivers master';
COMMENT ON TABLE deliveries IS 'Delivery scheduling and tracking with vehicle and personnel assignment';
COMMENT ON TABLE delivery_items IS 'Items in each delivery with delivered quantities';
COMMENT ON TABLE delivery_routes IS 'Predefined delivery routes for optimization';
COMMENT ON TABLE vehicle_maintenance IS 'Vehicle maintenance and service history';
COMMENT ON TABLE personnel_attendance IS 'Delivery personnel attendance tracking';

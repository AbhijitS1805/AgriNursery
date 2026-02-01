-- =====================================================
-- AGRI-NURSERY ERP - DATABASE SCHEMA
-- Comprehensive schema for agriculture nursery management
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'supervisor', 'worker')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 1: LIVING ASSET & BATCH MANAGEMENT
-- =====================================================

-- Plant Varieties/Species Master
CREATE TABLE IF NOT EXISTS plant_varieties (
    id SERIAL PRIMARY KEY,
    variety_code VARCHAR(50) UNIQUE NOT NULL,
    common_name VARCHAR(100) NOT NULL,
    botanical_name VARCHAR(150),
    category VARCHAR(50), -- Ornamental, Fruit, Vegetable, Medicinal
    default_price DECIMAL(10,2),
    average_growth_days INTEGER, -- Days from seed to sale-ready
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mother Plants Registry (Permanent Assets)
CREATE TABLE IF NOT EXISTS mother_plants (
    id SERIAL PRIMARY KEY,
    plant_variety_id INTEGER REFERENCES plant_varieties(id),
    plant_code VARCHAR(50) UNIQUE NOT NULL,
    acquisition_date DATE NOT NULL,
    acquisition_cost DECIMAL(10,2),
    location VARCHAR(100), -- Where it's planted
    health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'stressed', 'diseased', 'dead')),
    last_propagation_date DATE,
    total_cuttings_taken INTEGER DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Growth Stages Definition
CREATE TABLE IF NOT EXISTS growth_stages (
    id SERIAL PRIMARY KEY,
    stage_name VARCHAR(50) UNIQUE NOT NULL, -- Seed, Germination, Vegetative, Ready, Sold
    stage_order INTEGER NOT NULL,
    value_multiplier DECIMAL(5,2) DEFAULT 1.0, -- For biological asset valuation
    description TEXT
);

-- Production Batches (Living Asset Tracking)
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    plant_variety_id INTEGER REFERENCES plant_varieties(id),
    mother_plant_id INTEGER REFERENCES mother_plants(id), -- NULL if from seeds
    initial_quantity INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL,
    current_stage_id INTEGER REFERENCES growth_stages(id),
    
    -- Dates
    propagation_date DATE NOT NULL,
    expected_ready_date DATE,
    actual_ready_date DATE,
    
    -- Location
    polyhouse_section_id INTEGER, -- Foreign key added later
    
    -- Costing (WIP Accounting)
    seed_cost DECIMAL(10,2) DEFAULT 0,
    consumable_cost DECIMAL(10,2) DEFAULT 0,
    labor_cost DECIMAL(10,2) DEFAULT 0,
    overhead_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (seed_cost + consumable_cost + labor_cost + overhead_cost) STORED,
    cost_per_plant DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN current_quantity > 0 THEN (seed_cost + consumable_cost + labor_cost + overhead_cost) / current_quantity 
        ELSE 0 END
    ) STORED,
    
    current_value DECIMAL(10,2), -- Biological asset valuation
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch History (Track stage transitions and events)
CREATE TABLE IF NOT EXISTS batch_history (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id),
    event_type VARCHAR(30) NOT NULL, -- stage_change, mortality, cost_update, relocation
    old_stage_id INTEGER REFERENCES growth_stages(id),
    new_stage_id INTEGER REFERENCES growth_stages(id),
    quantity_change INTEGER, -- Negative for deaths
    cost_change DECIMAL(10,2),
    event_date DATE NOT NULL,
    notes TEXT,
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mortality & Waste Tracking
CREATE TABLE IF NOT EXISTS mortality_records (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id),
    quantity_lost INTEGER NOT NULL,
    loss_reason VARCHAR(50), -- disease, pest, weather, handling, other
    financial_loss DECIMAL(10,2),
    loss_date DATE NOT NULL,
    description TEXT,
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 2: DUAL-STREAM INVENTORY SYSTEM
-- =====================================================


-- Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL, -- Seeds, Fertilizers, Pesticides, Pots, Soil, Tools
    category_type VARCHAR(20) CHECK (category_type IN ('consumable', 'equipment')),
    description TEXT
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    gstin VARCHAR(15), -- GST Number (India)
    credit_limit DECIMAL(12,2),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items (Consumables & Equipment)
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES inventory_categories(id),
    sku_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL, -- kg, liter, pieces, bags
    
    -- Stock Management
    current_stock DECIMAL(10,2) DEFAULT 0,
    minimum_stock DECIMAL(10,2) DEFAULT 0, -- Low stock alert threshold
    maximum_stock DECIMAL(10,2),
    opening_stock DECIMAL(10,2) DEFAULT 0,
    
    -- Costing
    unit_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    
    -- Tax Information
    gst_included BOOLEAN DEFAULT TRUE,
    gst_percentage DECIMAL(5,2) DEFAULT 18,
    hsn_code VARCHAR(20),
    
    -- Product Details
    product_type VARCHAR(50) DEFAULT 'product', -- product, raw-material, finished-good
    sub_category VARCHAR(100),
    varieties VARCHAR(100),
    
    -- Supplier & Location
    supplier_id INTEGER REFERENCES suppliers(id),
    company VARCHAR(100),
    
    -- For chemicals/seeds
    requires_expiry BOOLEAN DEFAULT FALSE,
    expiry_date DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Batches (For expiry tracking of chemicals/seeds)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id),
    batch_number VARCHAR(50),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    expiry_date DATE,
    supplier_name VARCHAR(100),
    received_date DATE NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Transactions (Stock In/Out)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id),
    inventory_batch_id INTEGER REFERENCES inventory_batches(id), -- NULL if not tracked by batch
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'adjustment', 'return')),
    quantity DECIMAL(10,2) NOT NULL, -- Positive for IN, Negative for OUT
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    
    -- Linking (if consumption)
    batch_id INTEGER REFERENCES batches(id), -- Which plant batch consumed this
    
    reference_number VARCHAR(50), -- PO number, invoice number
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 3: POLYHOUSE & SPATIAL MANAGEMENT
-- =====================================================

-- Nursery Sites
CREATE TABLE IF NOT EXISTS nursery_sites (
    id SERIAL PRIMARY KEY,
    site_name VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(200),
    total_area DECIMAL(10,2), -- in square meters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Polyhouses/Greenhouses
CREATE TABLE IF NOT EXISTS polyhouses (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES nursery_sites(id),
    polyhouse_name VARCHAR(100) NOT NULL,
    polyhouse_code VARCHAR(50) UNIQUE NOT NULL,
    structure_type VARCHAR(50), -- Greenhouse, Shadehouse, Open Field
    area DECIMAL(10,2), -- in square meters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sections within Polyhouses
CREATE TABLE IF NOT EXISTS polyhouse_sections (
    id SERIAL PRIMARY KEY,
    polyhouse_id INTEGER REFERENCES polyhouses(id),
    section_name VARCHAR(100) NOT NULL,
    section_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Capacity
    total_capacity INTEGER, -- Total tray slots or plant positions
    occupied_capacity INTEGER DEFAULT 0,
    available_capacity INTEGER GENERATED ALWAYS AS (total_capacity - occupied_capacity) STORED,
    
    -- Environmental specs
    has_climate_control BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to batches table
ALTER TABLE batches ADD CONSTRAINT fk_batch_section 
    FOREIGN KEY (polyhouse_section_id) REFERENCES polyhouse_sections(id);

-- Environmental Logs (Temperature, Humidity, Light)
CREATE TABLE IF NOT EXISTS environmental_logs (
    id SERIAL PRIMARY KEY,
    polyhouse_section_id INTEGER REFERENCES polyhouse_sections(id),
    log_date DATE NOT NULL,
    log_time TIME NOT NULL,
    temperature DECIMAL(5,2), -- Celsius
    humidity DECIMAL(5,2), -- Percentage
    light_intensity INTEGER, -- Lux
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 4: AGRI-SPECIFIC FINANCIALS & ACCOUNTS
-- =====================================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')),
    parent_account_id INTEGER REFERENCES accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_type VARCHAR(20) CHECK (customer_type IN ('retail', 'wholesale', 'dealer')),
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    gstin VARCHAR(15),
    credit_limit DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    po_date DATE NOT NULL,
    expected_delivery_date DATE,
    total_amount DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'received', 'cancelled')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    item_id INTEGER REFERENCES inventory_items(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2),
    received_quantity DECIMAL(10,2) DEFAULT 0
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    order_date DATE NOT NULL,
    delivery_date DATE,
    
    subtotal DECIMAL(12,2),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    fulfillment_status VARCHAR(20) DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'partial', 'fulfilled')),
    
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
    id SERIAL PRIMARY KEY,
    so_id INTEGER REFERENCES sales_orders(id),
    batch_id INTEGER REFERENCES batches(id), -- Links to plant batch
    plant_variety_id INTEGER REFERENCES plant_varieties(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2),
    cost_price DECIMAL(10,2), -- For profit calculation
    fulfilled_quantity INTEGER DEFAULT 0
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type VARCHAR(20) CHECK (invoice_type IN ('sales', 'purchase')),
    customer_id INTEGER REFERENCES customers(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    so_id INTEGER REFERENCES sales_orders(id), -- Link to sales order
    po_id INTEGER REFERENCES purchase_orders(id), -- Link to purchase order
    
    invoice_date DATE NOT NULL,
    due_date DATE,
    
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2),
    grand_total DECIMAL(12,2) NOT NULL,
    
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2),
    
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
    
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_type VARCHAR(20) CHECK (payment_type IN ('receipt', 'payment')),
    invoice_id INTEGER REFERENCES invoices(id),
    customer_id INTEGER REFERENCES customers(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30), -- Cash, Cheque, Bank Transfer, UPI
    reference_number VARCHAR(50),
    
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries (Double-Entry Accounting)
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(30), -- Manual, Auto (from transactions)
    reference_type VARCHAR(30), -- Invoice, Payment, Purchase, etc.
    reference_id INTEGER,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    account_id INTEGER REFERENCES accounts(id),
    debit_amount DECIMAL(12,2) DEFAULT 0,
    credit_amount DECIMAL(12,2) DEFAULT 0,
    description TEXT
);

-- =====================================================
-- MODULE 5: TASK & WORKFORCE MANAGEMENT
-- =====================================================

-- Task Templates (Recurring task definitions)
CREATE TABLE task_templates (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(30), -- watering, fertilization, spraying, pruning, inspection
    description TEXT,
    default_duration_minutes INTEGER,
    recurrence_pattern VARCHAR(50), -- daily, weekly, bi-weekly, monthly
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (Scheduled & Actual)
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES task_templates(id),
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(30),
    
    -- Assignment
    assigned_to INTEGER REFERENCES users(id), -- Worker
    batch_id INTEGER REFERENCES batches(id),
    polyhouse_section_id INTEGER REFERENCES polyhouse_sections(id),
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    
    -- Execution
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Materials used
    inventory_consumption JSONB, -- Array of {item_id, quantity}
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Labor Time Tracking
CREATE TABLE labor_entries (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES users(id),
    task_id INTEGER REFERENCES tasks(id),
    batch_id INTEGER REFERENCES batches(id), -- Direct link for costing
    
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours_worked DECIMAL(5,2),
    hourly_rate DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    
    notes TEXT,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Active Batches Dashboard View
CREATE VIEW v_active_batches AS
SELECT 
    b.id,
    b.batch_code,
    pv.common_name as plant_variety,
    b.initial_quantity,
    b.current_quantity,
    gs.stage_name as current_stage,
    b.propagation_date,
    b.expected_ready_date,
    ps.section_name as location,
    b.total_cost,
    b.cost_per_plant,
    b.current_value,
    CONCAT(ph.polyhouse_name, ' - ', ps.section_name) as full_location
FROM batches b
JOIN plant_varieties pv ON b.plant_variety_id = pv.id
JOIN growth_stages gs ON b.current_stage_id = gs.id
LEFT JOIN polyhouse_sections ps ON b.polyhouse_section_id = ps.id
LEFT JOIN polyhouses ph ON ps.polyhouse_id = ph.id
WHERE b.status = 'active';

-- Low Stock Inventory Alert View
CREATE VIEW v_low_stock_items AS
SELECT 
    ii.id,
    ii.sku_code,
    ii.item_name,
    ic.category_name,
    ii.current_stock,
    ii.minimum_stock,
    ii.unit_of_measure,
    (ii.minimum_stock - ii.current_stock) as reorder_quantity
FROM inventory_items ii
JOIN inventory_categories ic ON ii.category_id = ic.id
WHERE ii.current_stock <= ii.minimum_stock
AND ii.is_active = TRUE;

-- Expired Inventory View
CREATE VIEW v_expired_inventory AS
SELECT 
    ib.id,
    ii.item_name,
    ib.batch_number,
    ib.quantity,
    ib.expiry_date,
    ib.supplier_name
FROM inventory_batches ib
JOIN inventory_items ii ON ib.item_id = ii.id
WHERE ib.expiry_date < CURRENT_DATE
AND ib.quantity > 0
ORDER BY ib.expiry_date;

-- Polyhouse Capacity Utilization
CREATE VIEW v_polyhouse_utilization AS
SELECT 
    ph.id,
    ph.polyhouse_name,
    ph.polyhouse_code,
    COUNT(ps.id) as total_sections,
    SUM(ps.total_capacity) as total_capacity,
    SUM(ps.occupied_capacity) as occupied_capacity,
    SUM(ps.available_capacity) as available_capacity,
    ROUND((SUM(ps.occupied_capacity)::DECIMAL / NULLIF(SUM(ps.total_capacity), 0) * 100), 2) as utilization_percentage
FROM polyhouses ph
LEFT JOIN polyhouse_sections ps ON ph.id = ps.polyhouse_id
WHERE ph.is_active = TRUE
GROUP BY ph.id, ph.polyhouse_name, ph.polyhouse_code;

-- Profit & Loss by Plant Variety
CREATE VIEW v_profit_by_variety AS
SELECT 
    pv.id,
    pv.common_name,
    pv.variety_code,
    COUNT(DISTINCT soi.so_id) as total_orders,
    SUM(soi.quantity) as total_sold,
    SUM(soi.total_price) as total_revenue,
    SUM(soi.quantity * soi.cost_price) as total_cost,
    SUM(soi.total_price - (soi.quantity * soi.cost_price)) as gross_profit,
    ROUND(((SUM(soi.total_price - (soi.quantity * soi.cost_price)) / NULLIF(SUM(soi.total_price), 0)) * 100), 2) as profit_margin_percentage
FROM plant_varieties pv
LEFT JOIN sales_order_items soi ON pv.id = soi.plant_variety_id
GROUP BY pv.id, pv.common_name, pv.variety_code;

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Batches
CREATE INDEX idx_batches_variety ON batches(plant_variety_id);
CREATE INDEX idx_batches_stage ON batches(current_stage_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_section ON batches(polyhouse_section_id);

-- Inventory
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_batch ON inventory_transactions(batch_id);

-- Sales & Purchases
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_order_items_so ON sales_order_items(so_id);
CREATE INDEX idx_sales_order_items_batch ON sales_order_items(batch_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);

-- Tasks
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_batch ON tasks(batch_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_date ON tasks(scheduled_date);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mother_plants_updated_at BEFORE UPDATE ON mother_plants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_polyhouse_sections_updated_at BEFORE UPDATE ON polyhouse_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatic capacity update when batch is relocated
CREATE OR REPLACE FUNCTION update_section_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease capacity from old section
    IF OLD.polyhouse_section_id IS NOT NULL THEN
        UPDATE polyhouse_sections 
        SET occupied_capacity = occupied_capacity - OLD.current_quantity
        WHERE id = OLD.polyhouse_section_id;
    END IF;
    
    -- Increase capacity in new section
    IF NEW.polyhouse_section_id IS NOT NULL THEN
        UPDATE polyhouse_sections 
        SET occupied_capacity = occupied_capacity + NEW.current_quantity
        WHERE id = NEW.polyhouse_section_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER batch_capacity_update AFTER UPDATE OF polyhouse_section_id ON batches 
FOR EACH ROW EXECUTE FUNCTION update_section_capacity();

-- Update batch current value based on stage (Biological Asset Valuation)
CREATE OR REPLACE FUNCTION calculate_biological_asset_value()
RETURNS TRIGGER AS $$
DECLARE
    stage_multiplier DECIMAL(5,2);
BEGIN
    -- Get the value multiplier for the current stage
    SELECT value_multiplier INTO stage_multiplier
    FROM growth_stages
    WHERE id = NEW.current_stage_id;
    
    -- Calculate current value = total_cost * stage_multiplier
    NEW.current_value = NEW.total_cost * COALESCE(stage_multiplier, 1.0);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER batch_value_calculation BEFORE INSERT OR UPDATE OF current_stage_id, total_cost ON batches
FOR EACH ROW EXECUTE FUNCTION calculate_biological_asset_value();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default growth stages
INSERT INTO growth_stages (stage_name, stage_order, value_multiplier, description) VALUES
('Seed/Cutting', 1, 0.5, 'Initial propagation material'),
('Germination', 2, 0.7, 'Seeds germinating or cuttings rooting'),
('Vegetative', 3, 1.0, 'Active growth phase'),
('Mature/Ready', 4, 1.5, 'Ready for sale'),
('Sold', 5, 0, 'Sold to customer');

-- Insert default inventory categories
INSERT INTO inventory_categories (category_name, category_type, description) VALUES
('Seeds', 'consumable', 'Seeds for propagation'),
('Fertilizers', 'consumable', 'Organic and chemical fertilizers'),
('Pesticides', 'consumable', 'Pest control chemicals'),
('Pots & Containers', 'consumable', 'Planting containers'),
('Growing Media', 'consumable', 'Soil, coco peat, perlite, etc.'),
('Tools & Equipment', 'equipment', 'Gardening tools and equipment'),
('Packaging', 'consumable', 'Packaging materials');

-- Insert default accounts (Chart of Accounts)
INSERT INTO accounts (account_code, account_name, account_type) VALUES
-- Assets
('1000', 'Assets', 'asset'),
('1100', 'Current Assets', 'asset'),
('1110', 'Biological Assets - Plants', 'asset'),
('1120', 'Inventory - Consumables', 'asset'),
('1130', 'Accounts Receivable', 'asset'),
('1140', 'Cash in Hand', 'asset'),
('1150', 'Bank Account', 'asset'),
('1200', 'Fixed Assets', 'asset'),
('1210', 'Mother Plants', 'asset'),
('1220', 'Polyhouse & Infrastructure', 'asset'),
('1230', 'Equipment', 'asset'),

-- Liabilities
('2000', 'Liabilities', 'liability'),
('2100', 'Current Liabilities', 'liability'),
('2110', 'Accounts Payable', 'liability'),
('2120', 'Wages Payable', 'liability'),

-- Equity
('3000', 'Equity', 'equity'),
('3100', 'Owner Equity', 'equity'),
('3200', 'Retained Earnings', 'equity'),

-- Revenue
('4000', 'Revenue', 'revenue'),
('4100', 'Plant Sales - Retail', 'revenue'),
('4200', 'Plant Sales - Wholesale', 'revenue'),

-- Cost of Goods Sold
('5000', 'Cost of Goods Sold', 'cogs'),
('5100', 'Direct Material Cost', 'cogs'),
('5200', 'Direct Labor Cost', 'cogs'),

-- Expenses
('6000', 'Operating Expenses', 'expense'),
('6100', 'Salaries & Wages', 'expense'),
('6200', 'Utilities', 'expense'),
('6300', 'Maintenance', 'expense'),
('6400', 'Administrative Expenses', 'expense');

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@agrinursery.com', '$2a$10$rKzVJx8Q8xY0dUGZZW9x9.KmQ0YqZ1YqZ1YqZ1YqZ1YqZ1YqZ1YqZ1', 'System Administrator', 'admin');

-- Insert sample nursery site
INSERT INTO nursery_sites (site_name, location, total_area) VALUES
('Main Nursery', '123 Farm Road, Agricultural District', 5000.00);

COMMIT;

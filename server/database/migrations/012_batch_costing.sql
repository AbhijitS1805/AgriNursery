-- =====================================================
-- BATCH COSTING & PRODUCTION COSTING SYSTEM
-- =====================================================

-- Material Consumption (track materials used in batches)
CREATE TABLE IF NOT EXISTS batch_material_consumption (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    item_name VARCHAR(255),
    
    -- Consumption Details
    quantity DECIMAL(15,3) NOT NULL,
    unit_of_measure VARCHAR(50),
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    
    -- Transaction Details
    consumption_date DATE DEFAULT CURRENT_DATE,
    consumed_by INTEGER,
    purpose VARCHAR(255), -- e.g., "Sowing", "Fertilizing", "Pest Control"
    
    -- Batch wise costing
    batch_number VARCHAR(100),
    bill_id INTEGER, -- reference to purchase bill if direct issue
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Labor/Task Cost Allocation
CREATE TABLE IF NOT EXISTS batch_labor_cost (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id),
    employee_id INTEGER REFERENCES employees(id),
    
    -- Labor Details
    task_name VARCHAR(255),
    employee_name VARCHAR(255),
    hours_worked DECIMAL(5,2),
    hourly_rate DECIMAL(10,2),
    total_cost DECIMAL(15,2),
    
    -- Date
    work_date DATE DEFAULT CURRENT_DATE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Overhead Allocation (utilities, rent, etc.)
CREATE TABLE IF NOT EXISTS batch_overhead_cost (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Overhead Details
    overhead_type VARCHAR(100), -- 'Electricity', 'Water', 'Rent', 'Depreciation'
    description TEXT,
    allocation_method VARCHAR(50), -- 'Per Plant', 'Per Sqft', 'Percentage', 'Fixed'
    
    -- Cost
    amount DECIMAL(15,2) NOT NULL,
    allocation_date DATE DEFAULT CURRENT_DATE,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch Cost Summary (aggregated costing per batch)
CREATE TABLE IF NOT EXISTS batch_costs (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE UNIQUE,
    batch_number VARCHAR(100),
    
    -- Plant Counts
    initial_quantity INTEGER,
    current_quantity INTEGER,
    sold_quantity INTEGER DEFAULT 0,
    damaged_quantity INTEGER DEFAULT 0,
    
    -- Material Costs
    seed_cost DECIMAL(15,2) DEFAULT 0,
    pot_cost DECIMAL(15,2) DEFAULT 0,
    soil_cost DECIMAL(15,2) DEFAULT 0,
    fertilizer_cost DECIMAL(15,2) DEFAULT 0,
    pesticide_cost DECIMAL(15,2) DEFAULT 0,
    other_material_cost DECIMAL(15,2) DEFAULT 0,
    total_material_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Labor Costs
    sowing_labor_cost DECIMAL(15,2) DEFAULT 0,
    maintenance_labor_cost DECIMAL(15,2) DEFAULT 0,
    harvesting_labor_cost DECIMAL(15,2) DEFAULT 0,
    total_labor_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Overhead Costs
    electricity_cost DECIMAL(15,2) DEFAULT 0,
    water_cost DECIMAL(15,2) DEFAULT 0,
    rent_cost DECIMAL(15,2) DEFAULT 0,
    depreciation_cost DECIMAL(15,2) DEFAULT 0,
    other_overhead_cost DECIMAL(15,2) DEFAULT 0,
    total_overhead_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Total Costs
    total_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Per Unit Costs
    cost_per_plant DECIMAL(15,2) DEFAULT 0,
    cost_per_sold_plant DECIMAL(15,2) DEFAULT 0,
    
    -- Valuation
    inventory_value DECIMAL(15,2) DEFAULT 0, -- current_quantity * cost_per_plant
    
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Yield Tracking
CREATE TABLE IF NOT EXISTS production_yield (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Stage-wise tracking
    stage VARCHAR(50), -- 'Sowing', 'Germination', 'Transplanting', 'Hardening', 'Ready'
    stage_date DATE DEFAULT CURRENT_DATE,
    
    -- Quantities
    input_quantity INTEGER,
    output_quantity INTEGER,
    loss_quantity INTEGER DEFAULT 0,
    loss_percentage DECIMAL(5,2),
    
    -- Quality Metrics
    germination_percentage DECIMAL(5,2),
    survival_rate DECIMAL(5,2),
    quality_grade VARCHAR(10), -- 'A', 'B', 'C'
    
    -- Loss Reasons
    loss_reason TEXT,
    
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waste/Mortality Tracking
CREATE TABLE IF NOT EXISTS batch_waste (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Waste Details
    waste_date DATE DEFAULT CURRENT_DATE,
    quantity INTEGER NOT NULL,
    waste_reason VARCHAR(100), -- 'Disease', 'Pest', 'Weather', 'Poor Quality', 'Handling'
    waste_stage VARCHAR(50),
    
    -- Cost Impact
    unit_cost DECIMAL(15,2),
    total_waste_cost DECIMAL(15,2),
    
    -- Action Taken
    action_taken TEXT,
    preventive_measures TEXT,
    
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch Pricing & Valuation
CREATE TABLE IF NOT EXISTS batch_pricing (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Pricing
    grade VARCHAR(10), -- 'A', 'B', 'C'
    base_price DECIMAL(15,2),
    selling_price DECIMAL(15,2),
    margin_percentage DECIMAL(5,2),
    
    -- Cost Analysis
    cost_price DECIMAL(15,2),
    markup_percentage DECIMAL(5,2),
    
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_batch_material_batch ON batch_material_consumption(batch_id);
CREATE INDEX idx_batch_labor_batch ON batch_labor_cost(batch_id);
CREATE INDEX idx_batch_overhead_batch ON batch_overhead_cost(batch_id);
CREATE INDEX idx_batch_costs_batch ON batch_costs(batch_id);
CREATE INDEX idx_production_yield_batch ON production_yield(batch_id);
CREATE INDEX idx_batch_waste_batch ON batch_waste(batch_id);
CREATE INDEX idx_batch_pricing_batch ON batch_pricing(batch_id);

-- Trigger to auto-update batch costs
CREATE OR REPLACE FUNCTION update_batch_costs()
RETURNS TRIGGER AS $$
BEGIN
    -- Update material cost summary
    UPDATE batch_costs
    SET 
        total_material_cost = (
            SELECT COALESCE(SUM(total_cost), 0)
            FROM batch_material_consumption
            WHERE batch_id = NEW.batch_id
        ),
        total_labor_cost = (
            SELECT COALESCE(SUM(total_cost), 0)
            FROM batch_labor_cost
            WHERE batch_id = NEW.batch_id
        ),
        total_overhead_cost = (
            SELECT COALESCE(SUM(amount), 0)
            FROM batch_overhead_cost
            WHERE batch_id = NEW.batch_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = NEW.batch_id;
    
    -- Calculate totals and per-unit costs
    UPDATE batch_costs bc
    SET 
        total_cost = total_material_cost + total_labor_cost + total_overhead_cost,
        cost_per_plant = CASE 
            WHEN current_quantity > 0 THEN (total_material_cost + total_labor_cost + total_overhead_cost) / current_quantity
            ELSE 0
        END,
        cost_per_sold_plant = CASE 
            WHEN sold_quantity > 0 THEN (total_material_cost + total_labor_cost + total_overhead_cost) / sold_quantity
            ELSE 0
        END,
        inventory_value = CASE 
            WHEN current_quantity > 0 THEN current_quantity * ((total_material_cost + total_labor_cost + total_overhead_cost) / NULLIF(initial_quantity, 0))
            ELSE 0
        END,
        last_calculated_at = CURRENT_TIMESTAMP
    WHERE batch_id = NEW.batch_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_material_cost_update
    AFTER INSERT OR UPDATE OR DELETE ON batch_material_consumption
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_costs();

CREATE TRIGGER batch_labor_cost_update
    AFTER INSERT OR UPDATE OR DELETE ON batch_labor_cost
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_costs();

CREATE TRIGGER batch_overhead_cost_update
    AFTER INSERT OR UPDATE OR DELETE ON batch_overhead_cost
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_costs();

-- Views
CREATE OR REPLACE VIEW v_batch_cost_summary AS
SELECT 
    b.id as batch_id,
    b.batch_number,
    b.crop_type,
    b.variety,
    b.status,
    bc.initial_quantity,
    bc.current_quantity,
    bc.sold_quantity,
    bc.damaged_quantity,
    bc.total_material_cost,
    bc.total_labor_cost,
    bc.total_overhead_cost,
    bc.total_cost,
    bc.cost_per_plant,
    bc.cost_per_sold_plant,
    bc.inventory_value,
    p.polyhouse_name,
    b.sowing_date,
    b.expected_ready_date
FROM batches b
LEFT JOIN batch_costs bc ON b.id = bc.batch_id
LEFT JOIN polyhouses p ON b.polyhouse_id = p.id
ORDER BY b.sowing_date DESC;

CREATE OR REPLACE VIEW v_batch_profitability AS
SELECT 
    b.id as batch_id,
    b.batch_number,
    b.crop_type,
    bc.total_cost,
    bc.sold_quantity,
    bc.cost_per_sold_plant,
    COALESCE(
        (SELECT SUM(total_amount) 
         FROM sales 
         WHERE batch_id = b.id), 0
    ) as total_revenue,
    COALESCE(
        (SELECT SUM(total_amount) 
         FROM sales 
         WHERE batch_id = b.id), 0
    ) - bc.total_cost as gross_profit,
    CASE 
        WHEN bc.total_cost > 0 THEN 
            ((COALESCE(
                (SELECT SUM(total_amount) 
                 FROM sales 
                 WHERE batch_id = b.id), 0
            ) - bc.total_cost) / bc.total_cost * 100)
        ELSE 0
    END as profit_margin_percentage
FROM batches b
LEFT JOIN batch_costs bc ON b.id = bc.batch_id
WHERE bc.sold_quantity > 0
ORDER BY gross_profit DESC;

COMMENT ON TABLE batch_material_consumption IS 'Tracks material consumption per batch';
COMMENT ON TABLE batch_labor_cost IS 'Tracks labor costs allocated to batches';
COMMENT ON TABLE batch_overhead_cost IS 'Tracks overhead costs for batches';
COMMENT ON TABLE batch_costs IS 'Summarized costing per batch with per-unit calculations';
COMMENT ON TABLE production_yield IS 'Stage-wise yield and quality tracking';
COMMENT ON TABLE batch_waste IS 'Mortality and waste tracking with reasons';
COMMENT ON TABLE batch_pricing IS 'Pricing and margin management per batch';

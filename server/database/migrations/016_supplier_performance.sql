-- =====================================================
-- SUPPLIER PERFORMANCE TRACKING SYSTEM
-- Track supplier quality, delivery performance, and ratings
-- =====================================================

-- Supplier Performance Metrics
CREATE TABLE IF NOT EXISTS supplier_performance_metrics (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Time Period
    metric_period VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Delivery Metrics
    total_orders INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    average_delay_days DECIMAL(5,2) DEFAULT 0,
    on_time_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_orders > 0 THEN (on_time_deliveries::DECIMAL / total_orders * 100) ELSE 0 END
    ) STORED,
    
    -- Quality Metrics (for seeds/plants)
    total_seed_batches INTEGER DEFAULT 0,
    total_seeds_ordered INTEGER DEFAULT 0,
    total_seeds_germinated INTEGER DEFAULT 0,
    average_germination_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_seeds_ordered > 0 THEN (total_seeds_germinated::DECIMAL / total_seeds_ordered * 100) ELSE 0 END
    ) STORED,
    
    -- Rejection Metrics
    total_inspections INTEGER DEFAULT 0,
    passed_inspections INTEGER DEFAULT 0,
    failed_inspections INTEGER DEFAULT 0,
    rejection_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_inspections > 0 THEN (failed_inspections::DECIMAL / total_inspections * 100) ELSE 0 END
    ) STORED,
    
    -- Financial Metrics
    total_purchase_value DECIMAL(15,2) DEFAULT 0,
    total_rejected_value DECIMAL(15,2) DEFAULT 0,
    total_debit_notes DECIMAL(15,2) DEFAULT 0,
    
    -- Overall Score (0-100)
    quality_score DECIMAL(5,2) DEFAULT 0,
    delivery_score DECIMAL(5,2) DEFAULT 0,
    overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (quality_score + delivery_score) / 2
    ) STORED,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(supplier_id, period_start, period_end)
);

-- Supplier Ratings & Reviews
CREATE TABLE IF NOT EXISTS supplier_ratings (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Rating
    rating_type VARCHAR(50), -- 'purchase_order', 'quality_inspection', 'general'
    reference_id INTEGER, -- PO ID or Inspection ID
    
    -- Scores (1-5 stars)
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    
    overall_rating DECIMAL(3,2) GENERATED ALWAYS AS (
        (quality_rating + delivery_rating + price_rating + communication_rating)::DECIMAL / 4
    ) STORED,
    
    -- Review
    review_text TEXT,
    reviewer_name VARCHAR(255),
    
    -- Recommendations
    would_recommend BOOLEAN,
    
    rated_by INTEGER REFERENCES users(id),
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Performance Tracking
CREATE TABLE IF NOT EXISTS delivery_performance (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    purchase_order_id INTEGER, -- Reference to PO
    
    -- Order Details
    order_date DATE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    
    -- Performance
    is_on_time BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN actual_delivery_date IS NULL THEN NULL
             WHEN actual_delivery_date <= expected_delivery_date THEN TRUE
             ELSE FALSE END
    ) STORED,
    
    delay_days INTEGER GENERATED ALWAYS AS (
        CASE WHEN actual_delivery_date IS NULL THEN NULL
             ELSE actual_delivery_date - expected_delivery_date END
    ) STORED,
    
    -- Delivery Quality
    delivery_status VARCHAR(50), -- 'on_time', 'late', 'partial', 'cancelled'
    delivery_notes TEXT,
    
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Germination Tracking (per supplier batch)
CREATE TABLE IF NOT EXISTS seed_germination_tracking (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    batch_id INTEGER REFERENCES batches(id),
    
    -- Seed Details
    seed_variety VARCHAR(255),
    supplier_batch_number VARCHAR(100),
    
    -- Quantities
    seeds_ordered INTEGER NOT NULL,
    seeds_sown INTEGER NOT NULL,
    seeds_germinated INTEGER NOT NULL,
    
    germination_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN seeds_sown > 0 THEN (seeds_germinated::DECIMAL / seeds_sown * 100) ELSE 0 END
    ) STORED,
    
    -- Timeline
    order_date DATE,
    sow_date DATE,
    germination_test_date DATE,
    
    -- Quality Assessment
    germination_quality VARCHAR(50), -- 'excellent', 'good', 'average', 'poor'
    notes TEXT,
    
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Scorecards (Aggregated View)
CREATE OR REPLACE VIEW v_supplier_scorecards AS
SELECT 
    s.id as supplier_id,
    s.supplier_code,
    s.supplier_name,
    s.contact_person,
    s.phone,
    s.email,
    
    -- Latest Performance Metrics
    spm.overall_score,
    spm.quality_score,
    spm.delivery_score,
    spm.on_time_percentage,
    spm.average_germination_rate,
    spm.rejection_rate,
    
    -- Average Ratings
    AVG(sr.overall_rating) as avg_overall_rating,
    COUNT(sr.id) as total_reviews,
    
    -- Delivery Stats
    COUNT(dp.id) as total_deliveries,
    SUM(CASE WHEN dp.is_on_time = TRUE THEN 1 ELSE 0 END) as on_time_deliveries_count,
    
    -- Germination Stats
    COUNT(sgt.id) as total_seed_batches,
    AVG(sgt.germination_rate) as avg_germination_rate,
    
    -- Financial
    spm.total_purchase_value,
    spm.total_rejected_value,
    spm.total_debit_notes,
    
    -- Status
    CASE 
        WHEN spm.overall_score >= 80 THEN 'Excellent'
        WHEN spm.overall_score >= 60 THEN 'Good'
        WHEN spm.overall_score >= 40 THEN 'Average'
        ELSE 'Poor'
    END as performance_category
    
FROM suppliers s
LEFT JOIN supplier_performance_metrics spm ON s.id = spm.supplier_id 
    AND spm.period_start = (SELECT MAX(period_start) FROM supplier_performance_metrics WHERE supplier_id = s.id)
LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id
LEFT JOIN delivery_performance dp ON s.id = dp.supplier_id
LEFT JOIN seed_germination_tracking sgt ON s.id = sgt.supplier_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.supplier_code, s.supplier_name, s.contact_person, s.phone, s.email,
         spm.overall_score, spm.quality_score, spm.delivery_score, spm.on_time_percentage,
         spm.average_germination_rate, spm.rejection_rate, spm.total_purchase_value,
         spm.total_rejected_value, spm.total_debit_notes;

-- Top Performing Suppliers View
CREATE OR REPLACE VIEW v_top_suppliers AS
SELECT * FROM v_supplier_scorecards
WHERE overall_score IS NOT NULL
ORDER BY overall_score DESC, avg_overall_rating DESC
LIMIT 10;

-- Underperforming Suppliers View
CREATE OR REPLACE VIEW v_underperforming_suppliers AS
SELECT * FROM v_supplier_scorecards
WHERE overall_score < 40 OR rejection_rate > 20 OR on_time_percentage < 60
ORDER BY overall_score ASC;

-- Indexes for Performance
CREATE INDEX idx_supplier_performance_supplier ON supplier_performance_metrics(supplier_id);
CREATE INDEX idx_supplier_performance_period ON supplier_performance_metrics(period_start, period_end);
CREATE INDEX idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX idx_delivery_performance_supplier ON delivery_performance(supplier_id);
CREATE INDEX idx_delivery_performance_dates ON delivery_performance(expected_delivery_date, actual_delivery_date);
CREATE INDEX idx_seed_germination_supplier ON seed_germination_tracking(supplier_id);
CREATE INDEX idx_seed_germination_item ON seed_germination_tracking(item_id);

-- Triggers
CREATE TRIGGER update_supplier_performance_metrics_updated_at 
    BEFORE UPDATE ON supplier_performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE supplier_performance_metrics IS 'Periodic supplier performance metrics';
COMMENT ON TABLE supplier_ratings IS 'User ratings and reviews for suppliers';
COMMENT ON TABLE delivery_performance IS 'Track delivery timeliness per order';
COMMENT ON TABLE seed_germination_tracking IS 'Track seed quality by supplier batch';
COMMENT ON VIEW v_supplier_scorecards IS 'Comprehensive supplier performance dashboard';

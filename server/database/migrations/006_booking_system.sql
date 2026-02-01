-- Booking System Schema
-- This handles the complete purchase workflow: Bookings -> Invoices -> Payments

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    method_name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default payment methods
INSERT INTO payment_methods (method_name) VALUES 
    ('Cash'),
    ('UPI'),
    ('Bank Transfer'),
    ('Cheque'),
    ('Card')
ON CONFLICT (method_name) DO NOTHING;

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., BK-2025-0001
    farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    
    -- Booking details
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date DATE NOT NULL, -- When farmer needs the plants
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'Pending', 
    -- Pending, Confirmed, Ready, Partially Delivered, Delivered, Cancelled
    
    -- Pricing
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_percent DECIMAL(5, 2) DEFAULT 0, -- GST/Tax percentage
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT, -- Staff notes, not visible to farmer
    
    -- Tracking
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id),
    cancellation_reason TEXT
);

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(booking_date, required_date);
CREATE INDEX IF NOT EXISTS idx_bookings_number ON bookings(booking_number);

-- ============================================================================
-- BOOKING ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_items (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Plant details
    plant_name VARCHAR(255) NOT NULL,
    production_id INTEGER REFERENCES productions(id) ON DELETE SET NULL,
    -- If NULL, means plant is not yet in production (future booking)
    
    -- Quantity
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    delivered_quantity INTEGER DEFAULT 0 CHECK (delivered_quantity >= 0),
    
    -- Pricing
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    
    -- Notes for this specific item
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT check_delivered_quantity CHECK (delivered_quantity <= quantity)
);

-- Indexes for booking items
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_production ON booking_items(production_id);

-- ============================================================================
-- SALES INVOICES TABLE (for farmer sales, different from inventory invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., SI-2025-0001
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    
    -- Invoice details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Amounts (copied from booking for historical record)
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    
    -- Payment tracking
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance_due DECIMAL(12, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    -- Unpaid, Partially Paid, Paid, Overdue, Cancelled
    
    -- Notes
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- Tracking
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sales_invoices
CREATE INDEX IF NOT EXISTS idx_sales_invoices_booking ON sales_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_farmer ON sales_invoices(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_dates ON sales_invoices(invoice_date, due_date);

-- ============================================================================
-- SALES PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_payments (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., RCP-2025-0001
    sales_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    
    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method_id INTEGER REFERENCES payment_methods(id),
    
    -- Payment method specific details
    transaction_reference VARCHAR(255), -- UPI transaction ID, Cheque number, etc.
    bank_name VARCHAR(255),
    
    -- Notes
    notes TEXT,
    
    -- Tracking
    received_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sales_payments
CREATE INDEX IF NOT EXISTS idx_sales_payments_invoice ON sales_payments(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_payments_booking ON sales_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_sales_payments_farmer ON sales_payments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sales_payments_date ON sales_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_sales_payments_receipt ON sales_payments(receipt_number);

-- ============================================================================
-- DELIVERY TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    delivery_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., DEL-2025-0001
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    
    -- Delivery details
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    -- Scheduled, In Transit, Delivered, Failed
    
    -- Recipient details
    received_by_name VARCHAR(255),
    received_by_mobile VARCHAR(15),
    
    -- Notes
    notes TEXT,
    
    -- Tracking
    delivered_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_booking ON deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(delivery_status);

-- ============================================================================
-- DELIVERY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_items (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    booking_item_id INTEGER NOT NULL REFERENCES booking_items(id) ON DELETE RESTRICT,
    
    quantity_delivered INTEGER NOT NULL CHECK (quantity_delivered > 0),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-CALCULATIONS
-- ============================================================================

-- Trigger to update booking totals when items change
CREATE OR REPLACE FUNCTION update_booking_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_id INTEGER;
BEGIN
    -- Get the booking_id (works for INSERT, UPDATE, and DELETE)
    IF TG_OP = 'DELETE' THEN
        v_booking_id := OLD.booking_id;
    ELSE
        v_booking_id := NEW.booking_id;
    END IF;
    
    UPDATE bookings
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM booking_items
            WHERE booking_id = v_booking_id
        ),
        updated_at = NOW()
    WHERE id = v_booking_id;
    
    -- Recalculate discount and tax amounts
    UPDATE bookings
    SET 
        discount_amount = subtotal * (discount_percent / 100),
        tax_amount = (subtotal - discount_amount) * (tax_percent / 100),
        total_amount = subtotal - discount_amount + tax_amount,
        updated_at = NOW()
    WHERE id = v_booking_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booking_totals
AFTER INSERT OR UPDATE OR DELETE ON booking_items
FOR EACH ROW
EXECUTE FUNCTION update_booking_totals();

-- Trigger to update invoice balance when payment is made
CREATE OR REPLACE FUNCTION update_sales_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_invoices
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM sales_payments
            WHERE sales_invoice_id = NEW.sales_invoice_id
        ),
        updated_at = NOW()
    WHERE id = NEW.sales_invoice_id;
    
    -- Update balance and status
    UPDATE sales_invoices
    SET 
        balance_due = total_amount - paid_amount,
        status = CASE
            WHEN paid_amount >= total_amount THEN 'Paid'
            WHEN paid_amount > 0 THEN 'Partially Paid'
            WHEN due_date < CURRENT_DATE THEN 'Overdue'
            ELSE 'Unpaid'
        END,
        updated_at = NOW()
    WHERE id = NEW.sales_invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_invoice_balance
AFTER INSERT OR UPDATE ON sales_payments
FOR EACH ROW
EXECUTE FUNCTION update_sales_invoice_balance();

-- Trigger to update delivered quantity in booking items
CREATE OR REPLACE FUNCTION update_booking_item_delivered_qty()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE booking_items
    SET 
        delivered_quantity = delivered_quantity + NEW.quantity_delivered,
        updated_at = NOW()
    WHERE id = NEW.booking_item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivered_qty
AFTER INSERT ON delivery_items
FOR EACH ROW
EXECUTE FUNCTION update_booking_item_delivered_qty();

-- ============================================================================
-- FUNCTIONS FOR GENERATING UNIQUE NUMBERS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM bookings
    WHERE booking_number LIKE 'BK-' || year_part || '-%';
    
    RETURN 'BK-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_sales_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM sales_invoices
    WHERE invoice_number LIKE 'SI-' || year_part || '-%';
    
    RETURN 'SI-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_num
    FROM sales_payments
    WHERE receipt_number LIKE 'RCP-' || year_part || '-%';
    
    RETURN 'RCP-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_num
    FROM deliveries
    WHERE delivery_number LIKE 'DEL-' || year_part || '-%';
    
    RETURN 'DEL-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View for booking summary with farmer details
CREATE OR REPLACE VIEW v_booking_summary AS
SELECT 
    b.id,
    b.booking_number,
    b.booking_date,
    b.required_date,
    b.status,
    b.total_amount,
    f.id as farmer_id,
    f.farmer_name,
    f.mobile as farmer_mobile,
    (SELECT COUNT(*) FROM booking_items WHERE booking_id = b.id) as item_count,
    (SELECT COALESCE(SUM(quantity), 0) FROM booking_items WHERE booking_id = b.id) as total_quantity,
    si.invoice_number,
    si.paid_amount,
    si.balance_due,
    si.status as invoice_status
FROM bookings b
JOIN farmers f ON b.farmer_id = f.id
LEFT JOIN sales_invoices si ON b.id = si.booking_id
ORDER BY b.booking_date DESC, b.id DESC;

-- View for payment summary
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT 
    p.id,
    p.receipt_number,
    p.payment_date,
    p.amount,
    pm.method_name as payment_method,
    p.transaction_reference,
    f.farmer_name,
    f.mobile as farmer_mobile,
    b.booking_number,
    si.invoice_number,
    si.balance_due as remaining_balance
FROM sales_payments p
JOIN farmers f ON p.farmer_id = f.id
JOIN bookings b ON p.booking_id = b.id
JOIN sales_invoices si ON p.sales_invoice_id = si.id
LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
ORDER BY p.payment_date DESC, p.id DESC;

-- View for outstanding invoices
CREATE OR REPLACE VIEW v_outstanding_invoices AS
SELECT 
    si.id,
    si.invoice_number,
    si.invoice_date,
    si.due_date,
    si.total_amount,
    si.paid_amount,
    si.balance_due,
    si.status,
    f.farmer_name,
    f.mobile as farmer_mobile,
    b.booking_number,
    CURRENT_DATE - si.due_date as days_overdue
FROM sales_invoices si
JOIN farmers f ON si.farmer_id = f.id
JOIN bookings b ON si.booking_id = b.id
WHERE si.balance_due > 0
ORDER BY si.due_date ASC;

COMMENT ON TABLE bookings IS 'Main table for plant bookings from farmers';
COMMENT ON TABLE booking_items IS 'Line items for each booking (plants and quantities)';
COMMENT ON TABLE sales_invoices IS 'Sales invoices generated for farmer bookings (separate from inventory purchase invoices)';
COMMENT ON TABLE sales_payments IS 'Payment records for sales invoices from farmers';
COMMENT ON TABLE deliveries IS 'Delivery tracking for bookings';

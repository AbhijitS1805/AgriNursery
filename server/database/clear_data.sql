-- =====================================================
-- CLEAR ALL DUMMY DATA
-- =====================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Clear transaction/operational data (keep master data)
TRUNCATE TABLE deliveries CASCADE;
TRUNCATE TABLE delivery_personnel CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE sales_items CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE production_batches CASCADE;
TRUNCATE TABLE ready_crops CASCADE;
TRUNCATE TABLE batches CASCADE;
TRUNCATE TABLE batch_plants CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE leave_applications CASCADE;
TRUNCATE TABLE purchases CASCADE;
TRUNCATE TABLE purchase_items CASCADE;
TRUNCATE TABLE inventory_transactions CASCADE;
TRUNCATE TABLE voucher_entries CASCADE;
TRUNCATE TABLE vouchers CASCADE;
TRUNCATE TABLE payment_receipts CASCADE;
TRUNCATE TABLE payment_allocations CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE expense_breakup CASCADE;
TRUNCATE TABLE payroll_runs CASCADE;
TRUNCATE TABLE salary_slips CASCADE;
TRUNCATE TABLE employee_loans CASCADE;
TRUNCATE TABLE salary_advances CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE goods_receipt_notes CASCADE;
TRUNCATE TABLE grn_items CASCADE;

-- Clear employee data (optional - uncomment if you want to remove employees too)
-- TRUNCATE TABLE employees CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Show confirmation
SELECT 'All dummy data deleted successfully! Master data preserved.' as status;

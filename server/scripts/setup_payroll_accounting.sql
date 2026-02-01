-- Setup accounting structure for payroll

-- 1. Create account groups
INSERT INTO account_groups (group_code, group_name, nature, is_system, display_order) VALUES
('EXP-01', 'Direct Expenses', 'Expense', true, 1),
('AST-01', 'Current Assets', 'Asset', true, 1),
('LIA-01', 'Current Liabilities', 'Liability', true, 1);

-- 2. Create ledgers for payroll
INSERT INTO ledgers (ledger_code, ledger_name, account_group_id, is_default) VALUES
('SAL-001', 'Salary Expense', (SELECT id FROM account_groups WHERE group_code = 'EXP-01'), false),
('SAL-002', 'PF Payable', (SELECT id FROM account_groups WHERE group_code = 'LIA-01'), false),
('SAL-003', 'TDS Payable', (SELECT id FROM account_groups WHERE group_code = 'LIA-01'), false),
('SAL-004', 'PT Payable', (SELECT id FROM account_groups WHERE group_code = 'LIA-01'), false),
('SAL-005', 'ESI Payable', (SELECT id FROM account_groups WHERE group_code = 'LIA-01'), false),
('CASH-001', 'Cash in Hand', (SELECT id FROM account_groups WHERE group_code = 'AST-01'), true);

-- 3. Create voucher type for payroll
INSERT INTO voucher_types (type_code, type_name, prefix, affects_inventory, is_system) VALUES
('PAY', 'Payroll Voucher', 'PAY', false, true)
ON CONFLICT DO NOTHING;

SELECT 'Payroll accounting setup completed!' as message;

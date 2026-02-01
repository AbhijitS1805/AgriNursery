-- Seed data for employees and HRMS testing

-- Insert some employees with manual employee codes to avoid function issues
INSERT INTO employees (
  employee_code, first_name, last_name, mobile, email, department_id, designation_id, 
  employment_type, date_of_joining, status, created_at, updated_at
) VALUES
  ('EMP-2024-0001', 'Ramesh', 'Kumar', '9876543210', 'ramesh@nursery.com', 1, 1, 'Permanent', '2024-01-15', 'Active', NOW(), NOW()),
  ('EMP-2024-0002', 'Suresh', 'Patil', '9876543211', 'suresh@nursery.com', 3, 5, 'Permanent', '2024-03-01', 'Active', NOW(), NOW()),
  ('EMP-2024-0003', 'Priya', 'Sharma', '9876543212', 'priya@nursery.com', 2, 3, 'Permanent', '2024-02-10', 'Active', NOW(), NOW()),
  ('EMP-2025-0001', 'Vijay', 'Singh', '9876543213', 'vijay@nursery.com', 4, 6, 'Contract', '2025-01-01', 'Active', NOW(), NOW()),
  ('EMP-2024-0004', 'Anjali', 'Deshmukh', '9876543214', 'anjali@nursery.com', 5, 7, 'Permanent', '2024-04-20', 'Active', NOW(), NOW()),
  ('EMP-2024-0005', 'Rajesh', 'Rao', '9876543215', 'rajesh@nursery.com', 6, 9, 'Permanent', '2024-06-01', 'Active', NOW(), NOW()),
  ('EMP-2024-0006', 'Meena', 'Kulkarni', '9876543216', 'meena@nursery.com', 3, 4, 'Permanent', '2024-07-15', 'Active', NOW(), NOW()),
  ('EMP-2025-0002', 'Prakash', 'Joshi', '9876543217', 'prakash@nursery.com', 2, 2, 'Contract', '2025-06-01', 'Active', NOW(), NOW())
ON CONFLICT (employee_code) DO NOTHING;

-- Initialize leave balances for all employees for year 2026
INSERT INTO employee_leave_balance (employee_id, leave_type_id, year, allocated_days, used_days)
SELECT 
  e.id,
  lt.id,
  2026,
  lt.default_days_per_year,
  0
FROM employees e
CROSS JOIN leave_types lt
WHERE lt.is_active = true
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

-- Assign salary components to all employees  
INSERT INTO employee_salaries (employee_id, salary_component_id, amount, effective_from)
SELECT 
  e.id,
  1, -- Basic Salary component
  35000,
  e.date_of_joining
FROM employees e;

-- Add some HRA (40% of basic = 14000)
INSERT INTO employee_salaries (employee_id, salary_component_id, amount, effective_from)
SELECT 
  e.id,
  2, -- HRA
  14000,
  e.date_of_joining
FROM employees e;

SELECT 'Employees seeded successfully!' as message;
SELECT COUNT(*) as employee_count FROM employees;
SELECT COUNT(*) as leave_balance_count FROM employee_leave_balance;

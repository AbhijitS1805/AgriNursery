# Employee Salary & Accounting Integration

## Overview
Employee salaries directly impact your nursery's accounting through:
- **Payroll Expenses** - Monthly salary payments
- **Statutory Liabilities** - PF, ESI, TDS deductions
- **Cash Flow** - Salary disbursements
- **Department-wise Costing** - Labor cost per department

---

## Salary Components

### Earnings (Taxable & Non-Taxable)
1. **Basic Salary** - Base pay (Taxable)
2. **HRA** - House Rent Allowance (Taxable, calculated as % of Basic)
3. **Dearness Allowance (DA)** - Inflation adjustment (Taxable)
4. **Conveyance Allowance** - Transport costs (Non-taxable up to limit)
5. **Medical Allowance** - Healthcare costs (Non-taxable up to limit)
6. **Special Allowance** - Additional benefits (Taxable)

### Deductions
1. **Provident Fund (PF)** - 12% of Basic (Employee + Employer contribution)
2. **Professional Tax (PT)** - State-level tax
3. **TDS** - Income tax deducted at source
4. **ESI** - Employee State Insurance (for salaries below threshold)

---

## Accounting Flow

### Monthly Payroll Processing

```
Step 1: Generate Payroll
   ↓
Step 2: Calculate Components
   ├── Earnings: Basic + HRA + DA + Allowances = Gross Salary
   └── Deductions: PF + PT + TDS + ESI = Total Deductions
   ↓
Step 3: Net Salary = Gross Salary - Total Deductions
   ↓
Step 4: Approve Payroll
   ↓
Step 5: Create Accounting Entry (Journal Voucher)
```

### Journal Entry for Salary Payment

**Example: Employee salary ₹30,000**

| Account | Debit (₹) | Credit (₹) |
|---------|-----------|------------|
| **Salary Expense** | 30,000 | - |
| **PF Payable** | - | 3,600 |
| **TDS Payable** | - | 2,000 |
| **PT Payable** | - | 200 |
| **Cash/Bank** | - | 24,200 |

**Explanation:**
- **Debit Salary Expense**: Total gross salary (increases expense)
- **Credit PF Payable**: Amount withheld for PF (liability until deposited)
- **Credit TDS Payable**: Tax withheld (liability until paid to govt)
- **Credit PT Payable**: Professional tax (liability)
- **Credit Cash/Bank**: Net amount paid to employee

---

## API Endpoints

### Salary Components (Master Data)
```
GET    /api/master/salary-components          # List all components
POST   /api/master/salary-components          # Create new component
PUT    /api/master/salary-components/:id      # Update component
DELETE /api/master/salary-components/:id      # Deactivate component
```

### Employee Salary Assignment
```
GET  /api/payroll/employee-salary/:employee_id   # Get employee's salary structure
POST /api/payroll/employee-salary                # Assign/update salary
```

**Request Body:**
```json
{
  "employee_id": 1,
  "effective_from": "2026-01-01",
  "components": [
    {
      "component_id": 1,
      "component_type": "Earning",
      "amount": 15000,
      "percentage": null
    },
    {
      "component_id": 2,
      "component_type": "Earning",
      "amount": 6000,
      "percentage": 40
    },
    {
      "component_id": 7,
      "component_type": "Deduction",
      "amount": 1800,
      "percentage": 12
    }
  ]
}
```

### Payroll Processing
```
POST /api/payroll/generate              # Generate monthly payroll
GET  /api/payroll/list                  # List payroll records
GET  /api/payroll/details/:id           # Get payroll details
PUT  /api/payroll/approve/:id           # Approve & create accounting entry
```

**Generate Payroll:**
```json
{
  "month": 1,
  "year": 2026,
  "department_id": 2  // Optional: specific department
}
```

---

## Database Schema

### salary_components
```sql
- id (PK)
- component_name (e.g., "Basic Salary")
- component_type (Earning/Deduction)
- is_fixed (true/false)
- calculation_type (Flat/Percentage)
- is_taxable (true/false)
- display_order
```

### employee_salaries
```sql
- id (PK)
- employee_id (FK → employees)
- effective_from (date)
- ctc (decimal) -- Cost to Company
- is_active (boolean)
```

### employee_salary_components
```sql
- id (PK)
- employee_salary_id (FK → employee_salaries)
- component_id (FK → salary_components)
- component_type (Earning/Deduction)
- amount (decimal)
- percentage (decimal, nullable)
```

### payroll
```sql
- id (PK)
- employee_id (FK → employees)
- month, year
- gross_salary
- total_earnings
- total_deductions
- net_salary
- status (Pending/Approved/Paid)
- payment_date
```

### payroll_details
```sql
- id (PK)
- payroll_id (FK → payroll)
- salary_component_id (FK → salary_components)
- amount
```

---

## Integration with Accounting Module

### Chart of Accounts (Required Accounts)

**Expense Accounts:**
- **Salary Expense** (Account Code: 6000)
- **PF Employer Contribution** (Account Code: 6010)
- **ESI Employer Contribution** (Account Code: 6011)

**Liability Accounts:**
- **PF Payable** (Account Code: 2100)
- **TDS Payable** (Account Code: 2101)
- **Professional Tax Payable** (Account Code: 2102)
- **ESI Payable** (Account Code: 2103)

**Asset Accounts:**
- **Cash** (Account Code: 1000)
- **Bank** (Account Code: 1001)

### Journal Voucher Creation

When payroll is **approved**, the system automatically:

1. Creates a **Journal Voucher** with:
   - Voucher Number: `JV-YYYYMMDD-XXXX`
   - Description: `Salary Payment - [Employee Name] - MM/YYYY`
   - Total Debit = Total Credit (balanced entry)

2. Creates **Journal Entries**:
   - **Dr.** Salary Expense (Gross Salary)
   - **Cr.** Cash/Bank (Net Salary paid)
   - **Cr.** PF Payable (PF deductions)
   - **Cr.** TDS Payable (Tax deductions)
   - **Cr.** Other Statutory Payables

3. Updates account balances in real-time

---

## Workflow Example

### Adding New Employee with Salary

1. **Create Employee** (via Employees page)
   ```
   - Full Name: John Doe
   - Department: Production
   - Designation: Supervisor
   - Date of Joining: 2026-01-15
   ```

2. **Assign Salary Structure**
   ```
   Components:
   - Basic Salary: ₹20,000
   - HRA (40% of Basic): ₹8,000
   - DA (10% of Basic): ₹2,000
   - Conveyance: ₹1,600
   - Medical: ₹1,250
   ───────────────────────
   Gross Salary: ₹32,850
   
   Deductions:
   - PF (12% of Basic): ₹2,400
   - PT: ₹200
   - TDS: ₹3,000
   ───────────────────────
   Total Deductions: ₹5,600
   
   Net Salary: ₹27,250
   CTC: ₹32,850
   ```

3. **Month-End Payroll**
   ```
   POST /api/payroll/generate
   {
     "month": 1,
     "year": 2026
   }
   ```
   - System processes all active employees
   - Calculates earnings & deductions
   - Creates payroll records

4. **Review & Approve**
   ```
   GET /api/payroll/list?month=1&year=2026
   
   Review each employee's payroll
   
   PUT /api/payroll/approve/:id
   ```
   - Status changes to "Approved"
   - Journal voucher created automatically
   - Accounting entries posted

5. **View Financial Impact**
   ```
   Navigate to: Accounting → Journal Vouchers
   
   Filter by: January 2026, Voucher Type = Payroll
   
   See all salary-related accounting entries
   ```

---

## Reports Available

### Payroll Reports
1. **Monthly Payroll Summary**
   - Total employees processed
   - Gross salary total
   - Net salary total
   - Department-wise breakdown

2. **Salary Register**
   - Employee-wise details
   - Component-wise breakdown
   - YTD calculations

3. **Statutory Reports**
   - PF Statement (Form 12A)
   - ESI Statement
   - TDS Statement (Form 16)
   - Professional Tax Statement

### Accounting Reports
1. **Expense Analysis**
   - Salary expense by department
   - Month-over-month comparison
   - Budget vs Actual

2. **Liability Tracking**
   - Outstanding PF payments
   - TDS to be deposited
   - Due dates for statutory payments

---

## Benefits

### For Operations
✅ Automated salary calculations
✅ Error-free statutory compliance
✅ Employee-wise cost tracking
✅ Department-wise labor cost analysis

### For Accounting
✅ Real-time financial impact visibility
✅ Automatic journal entries (no manual posting)
✅ Accurate liability tracking
✅ Audit trail for all salary payments

### For Management
✅ Labor cost reports by department
✅ Salary vs revenue analysis
✅ Budget control
✅ Cash flow planning

---

## Next Steps

1. ✅ **Salary components created** (10 default components)
2. ✅ **API endpoints ready** (salary assignment, payroll processing)
3. ✅ **Accounting integration** (auto journal entries)
4. 🔄 **Frontend UI** (salary management in Employee page)
5. ⏳ **Bulk payroll generation UI**
6. ⏳ **Payroll approval workflow**
7. ⏳ **Salary slip generation**

---

## Default Salary Components Created

| ID | Component Name | Type | Calculation | Taxable |
|----|---------------|------|-------------|---------|
| 1 | Basic Salary | Earning | Flat | Yes |
| 2 | HRA | Earning | Percentage | Yes |
| 3 | Dearness Allowance | Earning | Percentage | Yes |
| 4 | Conveyance Allowance | Earning | Flat | No |
| 5 | Medical Allowance | Earning | Flat | No |
| 6 | Special Allowance | Earning | Flat | Yes |
| 7 | Provident Fund | Deduction | Percentage | No |
| 8 | Professional Tax | Deduction | Flat | No |
| 9 | TDS | Deduction | Percentage | No |
| 10 | ESI | Deduction | Percentage | No |

---

## Testing the Integration

### 1. Verify Salary Components
```bash
curl http://localhost:5000/api/master/salary-components
```

### 2. Assign Salary to Employee
```bash
curl -X POST http://localhost:5000/api/payroll/employee-salary \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "effective_from": "2026-01-01",
    "components": [
      {"component_id": 1, "component_type": "Earning", "amount": 20000},
      {"component_id": 2, "component_type": "Earning", "amount": 8000, "percentage": 40}
    ]
  }'
```

### 3. Generate Payroll
```bash
curl -X POST http://localhost:5000/api/payroll/generate \
  -H "Content-Type: application/json" \
  -d '{
    "month": 1,
    "year": 2026
  }'
```

### 4. Check Accounting Entry
```bash
curl http://localhost:5000/api/accounting/journal-vouchers?month=1&year=2026
```

---

**Your employee salaries now automatically create proper accounting entries! 💰📊**

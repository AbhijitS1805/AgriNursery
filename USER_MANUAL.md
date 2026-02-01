# AgriNursery ERP - Complete User Manual

**Version**: 2.0  
**Last Updated**: January 26, 2026  
**Application URL**: http://localhost:3000

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Procurement Module](#procurement-module)
4. [Production Module](#production-module)
5. [Sales & Orders Module](#sales--orders-module)
6. [Delivery & Logistics Module](#delivery--logistics-module)
7. [HR & Payroll Module](#hr--payroll-module)
8. [Accounting & Finance Module](#accounting--finance-module)
9. [Reports Module](#reports-module)
10. [Common Workflows](#common-workflows)
11. [Offline Mode](#offline-mode)
12. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Accessing the Application

1. Open your web browser (Chrome, Firefox, Safari, or Edge)
2. Navigate to: **http://localhost:3000**
3. The dashboard will load automatically

### Navigation

The application uses a **sidebar navigation** with grouped menu items:

- **Overview**: Dashboard
- **Procurement**: Purchase Bills, Inventory, Supplier Performance, Quality Inspection
- **Production**: Production, Polyhouses, Ready Crops, Tasks
- **Sales & Orders**: Farmers, Bookings, Sales
- **Delivery & Logistics**: Vehicles, Deliveries, Shipping Management
- **HR & Payroll**: Employees, Attendance, Leave, Payroll
- **Accounting & Finance**: Voucher Entry, Payments, Expenses, Trial Balance, Day Book
- **Reports**: Business Intelligence Reports

### Interface Elements

- **Search Bars**: Filter data by typing keywords
- **Filter Dropdowns**: Refine lists by status, date, or category
- **Action Buttons**: 
  - 🔵 Blue buttons = Create/Add new
  - 🟢 Green buttons = Approve/Confirm
  - 🔴 Red buttons = Reject/Delete
  - ⚪ Gray buttons = View/Edit
- **Modal Windows**: Pop-up forms for data entry
- **Tabs**: Switch between different views of related data

---

## Dashboard Overview

**Access**: Click on "Dashboard" in the sidebar

### What You'll See

The dashboard provides a **real-time snapshot** of your nursery operations:

#### Key Metrics (Top Row)
- 📦 **Total Batches**: Number of active production batches
- 🏭 **Active Polyhouses**: Polyhouses currently in use
- 📋 **Pending Bookings**: Orders awaiting fulfillment
- 🚚 **Today's Deliveries**: Scheduled deliveries for today

#### Charts & Graphs
1. **Production Overview**: Batch counts by stage (Germination, Hardening, Ready)
2. **Sales Trends**: Monthly revenue visualization
3. **Inventory Status**: Stock levels and alerts
4. **Polyhouse Utilization**: Capacity usage percentage

#### Quick Actions
- Create new batch
- Record sale
- View pending tasks

**Tip**: The dashboard auto-refreshes every 5 minutes. Click the refresh icon for manual updates.

---

## Procurement Module

### 1. Purchase Bills

**Access**: Procurement → Purchase Bills

#### Creating a Purchase Bill

1. Click **+ New Purchase Bill** button
2. Fill in the form:
   - **Supplier**: Select from dropdown (or create new supplier)
   - **Bill Number**: Enter supplier's invoice number
   - **Bill Date**: Select date from calendar
   - **Payment Terms**: Choose payment duration (15/30/45/60 days)
   - **Payment Method**: Cash, Bank Transfer, Cheque, Credit
3. **Add Items**:
   - Click "+ Add Item"
   - Select inventory item from dropdown
   - Enter quantity and rate
   - Tax amount calculates automatically
   - Total amount updates in real-time
4. Click **Create Purchase Bill**

#### Managing Purchase Bills

- **View Details**: Click on any bill row to see full details
- **Search**: Use search bar to find bills by number or supplier
- **Filter by Status**: 
  - Pending: Not yet paid
  - Partially Paid: Some payment received
  - Paid: Fully settled
- **Record Payment**: Click "Record Payment" button on unpaid bills

**Workflow**: Purchase Bill → Quality Inspection → Inventory Update → Payment

---

### 2. Inventory Management

**Access**: Procurement → Inventory

#### Viewing Inventory

The inventory page shows:
- **Item Name**: Product description
- **Category**: Seeds, Fertilizers, Pots, Tools, etc.
- **Current Stock**: Available quantity
- **Unit**: Kg, Ltr, Pcs, Bags
- **Reorder Level**: Minimum stock threshold
- **Last Updated**: Recent stock movement date

#### Adding New Inventory Items

1. Click **+ Add Item**
2. Enter:
   - Item Name (e.g., "Tomato Seeds - Hybrid")
   - Category (select from dropdown)
   - Unit of Measurement
   - Reorder Level (triggers low stock alert)
   - Initial Stock Quantity
   - Rate per Unit
3. Click **Save**

#### Stock Alerts

- 🟡 **Yellow Badge**: Stock below reorder level
- 🔴 **Red Badge**: Stock critically low (< 50% of reorder level)
- Green checkmark: Adequate stock

**Tips**:
- Set reorder levels to 1-2 weeks of average consumption
- Review stock weekly to prevent shortages
- Use search to quickly find items

---

### 3. Supplier Performance Tracking 🆕

**Access**: Procurement → Supplier Performance

This feature tracks supplier quality metrics and helps identify top vendors.

#### Viewing Supplier Scorecards

**Main Tab: Supplier Scorecards**

The scorecard table displays:
- **Supplier Name**
- **Overall Score** (0-100, color-coded):
  - 🟢 Green: 80-100 (Excellent)
  - 🔵 Blue: 60-79 (Good)
  - 🟡 Yellow: 40-59 (Fair)
  - 🔴 Red: <40 (Poor)
- **Quality Score**: Product quality rating
- **Delivery Score**: On-time delivery performance
- **Price Competitiveness**: Pricing vs market average
- **Communication**: Responsiveness and clarity
- **Germination Rate**: Seed quality (for seed suppliers)

#### Top Performers Tab

View your best suppliers ranked by overall score. This helps with:
- Vendor selection for critical orders
- Performance-based incentives
- Supplier relationship management

#### Underperforming Suppliers Tab

Lists suppliers with scores below 60. Action items:
- Schedule quality improvement meetings
- Issue corrective action requests
- Consider alternative suppliers

#### Viewing Supplier Details

1. Click on any supplier row
2. Modal shows:
   - **Performance Metrics History**: 12-month trend chart
   - **Germination Tracking**: Batch-wise seed quality data
   - **Delivery Performance**: On-time vs delayed shipments
   - **Quality Ratings**: Historical ratings with comments

#### Recording Supplier Ratings

1. Navigate to a supplier's detail page
2. Click "Add Rating"
3. Rate on 5-star scale:
   - ⭐ 1 star: Very Poor
   - ⭐⭐ 2 stars: Poor
   - ⭐⭐⭐ 3 stars: Average
   - ⭐⭐⭐⭐ 4 stars: Good
   - ⭐⭐⭐⭐⭐ 5 stars: Excellent
4. Add comments (optional)
5. Save

**Best Practices**:
- Rate suppliers after each delivery
- Review underperformers monthly
- Update germination rates after batch testing

---

### 4. Quality Inspection Workflow 🆕

**Access**: Procurement → Quality Inspection

This is your **QC gate** for incoming materials. Every purchase should go through quality inspection before inventory is updated.

#### Creating a Quality Inspection

1. Click **+ New Inspection**
2. Fill inspection form:
   - **Supplier**: Auto-populated from purchase bill
   - **PO/Bill Number**: Link to purchase order
   - **Inspection Date**: Today's date (default)
   - **Inspector Name**: QC person conducting inspection
3. **Add Inspection Items**:
   - Click "+ Add Item"
   - Select item from dropdown
   - Enter:
     - **Ordered Quantity**: From PO
     - **Received Quantity**: Actual delivery
     - **Unit Price**: For debit note calculation
4. Click **Create Inspection**

#### Conducting Quality Inspection

After creating inspection:

1. Click **View Details** on the inspection
2. For each item, review:
   - Physical condition
   - Specifications match
   - Quantity accuracy
   - Packaging quality
3. Record findings:
   - **Accepted Quantity**: Passed items
   - **Rejected Quantity**: Failed items
   - **Defect Description**: Document issues

#### Approving Inspections

1. Click **Approve** button (green)
2. Confirm action
3. System automatically:
   - Updates inventory with accepted quantities
   - Marks inspection as "Approved"
   - Links to purchase bill

**Result**: Accepted items added to stock

#### Rejecting Inspections

1. Click **Reject** button (red)
2. Enter **Rejection Reason** (required)
3. Choose: **Create Debit Note?** (Yes/No)
4. Confirm

**If Debit Note Created**:
- System auto-generates debit note number (DN-YYYYMMDD-XXXX)
- Captures rejected items and values
- Sends to supplier for credit/replacement
- View in "Debit Notes" tab

#### Debit Notes Tab

View all debit notes:
- **DN Number**: Unique identifier
- **Supplier**: Vendor name
- **Amount**: Total debit value
- **Reason**: Rejection cause
- **Status**: Pending, Accepted, Settled

**Workflow**:
```
Purchase Bill Created
       ↓
Quality Inspection Created
       ↓
Items Inspected (Accepted/Rejected split)
       ↓
APPROVE → Stock Updated | REJECT → Debit Note Generated
```

**Tips**:
- Inspect within 24 hours of delivery
- Photo document defects
- Keep rejection rate <5% (good suppliers)
- Follow up on debit notes within 1 week

---

## Production Module

### 1. Production Management

**Access**: Production → Production

#### Creating a New Production Batch

1. Click **+ New Batch**
2. Enter batch details:
   - **Batch Number**: Auto-generated (or custom)
   - **Crop/Plant Type**: Select from dropdown
   - **Variety**: Specific cultivar
   - **Quantity**: Number of seedlings/plants
   - **Sowing/Planting Date**: Start date
   - **Polyhouse**: Assign growing location
   - **Expected Maturity Date**: Auto-calculated based on crop duration
3. **Add Inputs** (seeds, fertilizers, growing media):
   - Click "+ Add Input"
   - Select item from inventory
   - Enter quantity used
   - System deducts from inventory
4. Click **Create Batch**

#### Batch Stages

Batches progress through stages:
1. 🌱 **Germination**: Seeds sprouting (5-15 days)
2. 🌿 **Hardening**: Seedlings strengthening (7-21 days)
3. ✅ **Ready**: Ready for sale
4. 📦 **Sold**: Delivered to customer
5. ❌ **Closed**: Batch completed/discarded

#### Updating Batch Status

1. Navigate to batch details
2. Click **Update Status** dropdown
3. Select new stage
4. Add notes (optional): mortality rate, growth issues, etc.
5. Save

#### Recording Batch Activities

Track daily tasks:
- Watering schedules
- Fertilizer applications
- Pest control treatments
- Temperature/humidity logs

Click **+ Add Activity** on batch detail page.

**Best Practices**:
- Update stage within 24 hours of change
- Record all input consumption for costing
- Monitor germination rate (should be >80%)
- Transfer to Ready when 90% mature

---

### 2. Polyhouses

**Access**: Production → Polyhouses

#### Managing Polyhouse Infrastructure

View all your greenhouse structures:
- **Polyhouse Name**: Identifier (e.g., "PH-1", "Shade House A")
- **Type**: Naturally Ventilated, Fan & Pad, Climate Controlled
- **Capacity**: Square footage or bed count
- **Current Utilization**: % occupied
- **Active Batches**: Currently growing

#### Adding a Polyhouse

1. Click **+ Add Polyhouse**
2. Enter:
   - Name/Number
   - Type (select from options)
   - Total Capacity (sq ft or beds)
   - Location on farm
   - Construction date
3. Save

#### Monitoring Utilization

- 🟢 Green: <70% utilized (space available)
- 🟡 Yellow: 70-90% utilized (nearly full)
- 🔴 Red: >90% utilized (at capacity)

**Tip**: Keep 10-15% buffer for replanting and maintenance.

---

### 3. Ready Crops

**Access**: Production → Ready Crops

View all batches in "Ready" status available for sale:

- **Batch Number**: Production identifier
- **Crop Type**: Plant variety
- **Quantity Available**: Sellable units
- **Days in Ready Status**: Time waiting for sale
- **Polyhouse**: Current location
- **Actions**:
  - Mark as sold
  - Move to cold storage
  - Discard (wastage)

**Alerts**:
- 🔔 Batches ready >7 days: Review for quality degradation
- 🔔 Overstocked items: Consider promotions

**Workflow**: Ready Crops → Booking → Sale → Delivery

---

### 4. Production Tasks

**Access**: Production → Tasks

#### Task Management

View and assign daily production activities:

**Task Types**:
- 💧 Watering schedule
- 🌱 Transplanting
- 🧪 Fertilizer application
- 🐛 Pest control
- 🌡️ Climate monitoring
- 📊 Quality inspection

#### Creating Tasks

1. Click **+ New Task**
2. Fill form:
   - **Task Title**: Brief description
   - **Assigned To**: Employee/Team
   - **Priority**: High, Medium, Low
   - **Due Date**: Deadline
   - **Related Batch** (optional): Link to production batch
   - **Description**: Detailed instructions
3. Save

#### Task Status

- ⏳ **Pending**: Not started
- 🔄 **In Progress**: Work underway
- ✅ **Completed**: Finished
- ❌ **Cancelled**: No longer needed

#### Completing Tasks

1. Click on task
2. Add completion notes
3. Update actual time spent
4. Mark as complete

**Best Practices**:
- Review task list daily (morning)
- Assign tasks 1 day in advance
- Use recurring tasks for regular activities
- Track time for labor costing

---

## Sales & Orders Module

### 1. Farmers (Customers)

**Access**: Sales & Orders → Farmers

#### Customer Database

Manage your customer information:
- **Farmer Name**: Full name
- **Contact**: Phone number
- **Village/Location**: Address
- **Total Orders**: Lifetime order count
- **Outstanding Balance**: Pending payments
- **Last Order Date**: Recent activity

#### Adding New Customers

1. Click **+ Add Farmer**
2. Enter:
   - Name
   - Contact number (10 digits)
   - Email (optional)
   - Address (village, taluka, district)
   - GSTIN (if applicable)
   - Payment terms (default: 30 days)
3. Save

#### Customer Profile

Click on farmer name to view:
- Contact details
- Order history
- Payment records
- Outstanding invoices
- Credit limit

**Tips**:
- Verify phone number before saving
- Update address for delivery planning
- Set credit limits for new customers

---

### 2. Bookings (Orders)

**Access**: Sales & Orders → Bookings

#### Creating a Booking

1. Click **+ New Booking**
2. Select:
   - **Customer**: From dropdown
   - **Booking Date**: Order date
   - **Required Date**: Delivery date (must be future)
3. **Add Items**:
   - Click "+ Add Item"
   - Select crop from ready crops
   - Enter quantity
   - Rate auto-fills (editable)
   - Discount % (optional)
4. **Review Total**:
   - Subtotal
   - GST (18% default)
   - Grand Total
5. Click **Create Booking**

#### Booking Status

- 📝 **Pending**: Order placed, not confirmed
- ✅ **Confirmed**: Order accepted
- 📦 **Ready for Delivery**: Items packed
- 🚚 **Dispatched**: En route to customer
- ✔️ **Delivered**: Successfully completed
- ❌ **Cancelled**: Order cancelled

#### Managing Bookings

**Actions**:
- **Confirm**: Accept order
- **Edit**: Modify quantities/items
- **Cancel**: Void order
- **Create Delivery**: Generate delivery challan

**Search & Filter**:
- Search by booking number or farmer name
- Filter by status
- Sort by date or amount

**Workflow**: Booking → Confirmation → Packing → Delivery → Invoice

---

### 3. Sales & Invoices

**Access**: Sales & Orders → Sales

#### Invoice Overview

Dashboard shows:
- 💰 **Total Sales**: Revenue (current period)
- 💵 **Paid Amount**: Received payments
- ⏰ **Outstanding**: Pending collections
- 📄 **Total Invoices**: Invoice count

#### Creating Sales Invoice

**Option 1: From Booking**
1. Open confirmed booking
2. Click "Generate Invoice"
3. Review and save (invoice auto-populated)

**Option 2: Direct Invoice**
1. Click **+ New Invoice**
2. Select customer
3. Add items manually
4. Save

#### Payment Collection

Recording payments against invoices:

1. Click on unpaid invoice
2. Click **Record Payment**
3. Enter:
   - **Payment Date**
   - **Amount**: Full or partial
   - **Payment Method**: Cash, Bank, Cheque, UPI
   - **Reference Number**: Transaction ID
   - **Notes** (optional)
4. Save

**Payment Status Updates**:
- Full payment → Status: "Paid"
- Partial payment → Status: "Partially Paid"
- Overdue (past due date) → Status: "Overdue" (red)

#### Invoice Actions

- **📄 View**: See full invoice details
- **🖨️ Print**: Generate PDF
- **💰 Record Payment**: Add payment entry
- **📧 Send**: Email to customer (if configured)

**Tips**:
- Generate invoices on delivery day
- Follow up on overdue invoices weekly
- Offer early payment discounts
- Record payments same day

#### Offline Sales 🆕

When internet connection is lost:

1. 🟡 **Yellow banner** appears: "Offline Mode - sales will be queued"
2. Create sales normally
3. Sales saved to local device (IndexedDB)
4. When online:
   - 🔵 **Blue banner**: "X sales pending sync" with progress bar
   - Click **Sync Now** for immediate upload
   - Auto-syncs every 30 seconds
5. 🟢 **Green banner**: "Sync Complete - X sales synced"

**See full details in**: [Offline Mode](#offline-mode) section

---

## Delivery & Logistics Module

### 1. Vehicles

**Access**: Delivery & Logistics → Vehicles

#### Fleet Management

Track your delivery vehicles:
- **Vehicle Number**: Registration number
- **Type**: Tempo, Truck, Van, Two-Wheeler
- **Capacity**: Load capacity (kg or cubic ft)
- **Driver**: Assigned driver name
- **Status**: Available, In Use, Maintenance
- **Last Service Date**: Maintenance tracking

#### Adding Vehicles

1. Click **+ Add Vehicle**
2. Enter:
   - Vehicle registration number
   - Type/model
   - Load capacity
   - Insurance expiry
   - Fitness certificate expiry
   - Assigned driver (optional)
3. Save

#### Vehicle Availability

- 🟢 **Available**: Ready for dispatch
- 🔵 **In Use**: Currently on delivery
- 🔴 **Maintenance**: Under repair

**Tips**:
- Schedule maintenance every 3 months
- Track fuel consumption per trip
- Assign vehicles based on load size

---

### 2. Deliveries

**Access**: Delivery & Logistics → Deliveries

#### Creating Delivery Challans

1. Click **+ New Delivery**
2. Link to:
   - **Booking Number**: Select from confirmed bookings
   - OR **Invoice Number**: Direct delivery
3. Enter:
   - **Delivery Date**: Scheduled date
   - **Vehicle**: Select from available fleet
   - **Driver**: Select driver
   - **Route**: Delivery route/area
4. **Verify Items**: Auto-populated from booking
5. Click **Create Delivery**

#### Delivery Status

- 📋 **Scheduled**: Planned delivery
- 🚚 **In Transit**: Out for delivery
- ✅ **Delivered**: Successfully completed
- ⚠️ **Partially Delivered**: Some items delivered
- ❌ **Failed**: Delivery unsuccessful

#### Updating Delivery Status

1. Click on delivery challan
2. Update status:
   - **Mark as In Transit**: When vehicle departs
   - **Mark as Delivered**: On successful delivery
   - **Record Delivery Issues**: If problems occur
3. Capture:
   - Delivery time
   - Receiver name
   - Signature (if using mobile app)
   - Notes

#### Today's Deliveries

Dashboard widget shows:
- Total deliveries scheduled today
- Completed count
- Pending/in-transit count
- Failed deliveries (for retry)

**Workflow**: Booking → Delivery Challan → Dispatch → In Transit → Delivered → Invoice (if not created)

**Tips**:
- Plan deliveries by route (optimize fuel)
- Update status in real-time
- Confirm delivery with customer call
- Collect POD (proof of delivery) photos

---

### 3. Shipping Management 🆕

**Access**: Delivery & Logistics → Shipping Management

For **courier/logistics partner** shipments (outside your own fleet).

#### Dashboard Stats

- 📦 **Total Shipments**: All shipments created
- 🟣 **In Transit**: Currently being shipped
- 🟡 **Pending Pickup**: Awaiting courier collection
- 🟢 **Delivered**: Successfully delivered

#### Creating a Shipment

1. Click **+ Create Shipment**
2. **Customer Information**:
   - Select customer (or enter new recipient)
   - Delivery address (full details)
   - Contact phone number
3. **Package Details**:
   - **Weight** (kg): Actual package weight
   - **Dimensions** (cm): Length × Width × Height
   - Service calculates volumetric weight automatically
4. **Carrier Selection**:
   - Choose courier (Delhivery, BlueDart, DTDC, etc.)
   - Select service type:
     - 🚀 **Express**: 1-2 days
     - 📦 **Standard**: 3-5 days
     - 💰 **Economy**: 5-7 days
5. **Rate Calculator**:
   - Click **Calculate Shipping Rate**
   - System shows estimated cost
   - Formula: `Base Rate + Weight Charge + Zone Charge + Fragile Markup`
6. Click **Create Shipment**

#### Shipment Status Flow

```
Created → Label Printed → Picked Up → In Transit → Out for Delivery → Delivered
```

#### Tracking Shipments

**Active Tab**: Shows all in-transit shipments

Click **Details** on any shipment to view:
- **Tracking Number**: Courier AWB number
- **Destination**: Full delivery address
- **Status**: Current shipment status
- **Tracking Timeline**:
  - Pickup scan
  - Hub arrivals
  - In-transit updates
  - Out for delivery
  - Delivery confirmation

#### Shipment Actions

**For "Created" Status**:
- 🖨️ **Print Label**: Generate shipping label (PDF)
- ✅ **Mark Picked Up**: After courier collection

**For "Picked Up" Status**:
- 📍 **Update to In Transit**: When shipment leaves local hub

**For "In Transit" Status**:
- 🚚 **Out for Delivery**: When reached destination hub

**For "Out for Delivery" Status**:
- ✅ **Mark Delivered**: On successful delivery

#### Shipping Rates

**Manage Carriers**: Add/edit courier services
1. Navigate to Carriers section
2. Add carrier details:
   - Carrier name
   - Contact information
   - Services offered
   - Rate card (per kg, per zone)

**Zone-Based Pricing**:
- **Local** (same city): Base rate
- **Metro** (major cities): Base + 20%
- **Regional** (same state): Base + 40%
- **National**: Base + 60%

**Volumetric Weight Formula**:
```
Volumetric Weight = (Length × Width × Height) / 5000
Chargeable Weight = Max(Actual Weight, Volumetric Weight)
```

**Fragile Handling** (for live plants):
- Automatic +15% markup
- Special packaging instructions
- Priority handling flag

#### Pending Pickups Tab

Shows shipments awaiting courier collection:
- Shipment number
- Customer name
- Created date (aging)
- Scheduled pickup time

**Action**: Coordinate with courier for pickup

#### Delivery Performance Tab

Carrier performance metrics:
- Average delivery time
- On-time delivery %
- Failed delivery rate
- Cost per shipment

**Use for**: Carrier selection and negotiation

**Tips**:
- Print labels immediately after creation
- Schedule pickups in batches (cost saving)
- Track high-value shipments closely
- Compare carrier rates before selection
- Add insurance for expensive orders

---

## HR & Payroll Module

### 1. Employees

**Access**: HR & Payroll → Employees

#### Employee Database

View all staff members:
- **Employee ID**: Unique identifier
- **Name**: Full name
- **Department**: Production, Sales, Admin, etc.
- **Designation**: Job role
- **Contact**: Phone number
- **Status**: Active, On Leave, Resigned

#### Adding Employees

1. Click **+ Add Employee**
2. **Personal Details**:
   - Full name
   - Date of birth
   - Gender
   - Contact number
   - Email
   - Address
3. **Employment Details**:
   - Employee ID (auto-generated)
   - Department
   - Designation
   - Joining date
   - Employment type (Permanent/Contract/Daily Wage)
4. **Salary Information**:
   - Basic salary
   - HRA (House Rent Allowance)
   - Other allowances
   - PF deduction
   - ESI deduction
5. **Documents**:
   - Aadhaar number
   - PAN number
   - Bank account details
6. Save

#### Employee Profile

Click on employee to view:
- Personal & employment details
- Attendance summary
- Leave balance
- Salary slips
- Performance notes

---

### 2. Attendance

**Access**: HR & Payroll → Attendance

#### Recording Daily Attendance

**Option 1: Bulk Mark Attendance**
1. Select date
2. View employee list
3. Mark each employee:
   - ✅ **Present**
   - ❌ **Absent**
   - 🏥 **On Leave**
   - 🏠 **Work from Home**
   - ⏰ **Half Day**
4. Click **Save Attendance**

**Option 2: Individual Entry**
1. Click on employee
2. Select date
3. Choose status
4. Add notes (if needed)
5. Save

#### Attendance Reports

View monthly attendance summary:
- Total working days
- Days present
- Days absent
- Leaves taken
- Attendance percentage

**Generate Reports**:
- Daily attendance sheet
- Monthly summary (all employees)
- Department-wise attendance
- Individual attendance record

**Tips**:
- Mark attendance before 11 AM daily
- Set up biometric integration for automation
- Review absence patterns monthly
- Handle leave requests in Leave module

---

### 3. Leave Management

**Access**: HR & Payroll → Leave

#### Leave Types

- 📅 **Casual Leave (CL)**: 12 days/year
- 🏥 **Sick Leave (SL)**: 12 days/year
- 🌴 **Earned Leave (EL)**: 15 days/year
- 🎉 **Comp Off**: Compensatory leave
- ⏰ **LWP**: Leave Without Pay

#### Employee Leave Application

1. Click **+ Apply Leave**
2. Enter:
   - **Leave Type**: Select from dropdown
   - **From Date**: Start date
   - **To Date**: End date
   - **Reason**: Brief description
   - **Contact During Leave**: Phone/email
3. Click **Submit**

#### Manager Leave Approval

**Pending Approvals** tab shows:
- Employee name
- Leave type
- Duration
- Reason

**Actions**:
- ✅ **Approve**: Accept leave request
- ❌ **Reject**: Deny with reason
- 💬 **Request Clarification**

#### Leave Balance Tracking

View for each employee:
- **Opening Balance**: Start of year
- **Accrued**: Earned during year
- **Taken**: Leaves consumed
- **Balance**: Available leaves

**Auto-calculations**:
- Casual/Sick: 1 day per month
- Earned Leave: 1.25 days per month

**Tips**:
- Submit leave applications 3 days in advance
- Approve/reject within 24 hours
- Carry forward unused EL (max 30 days)
- LWP affects salary automatically

---

### 4. Payroll

**Access**: HR & Payroll → Payroll

#### Monthly Salary Processing

**Step 1: Select Month**
1. Choose salary month
2. Select department (or All)

**Step 2: Fetch Attendance**
- System auto-pulls attendance data
- Shows:
  - Days present
  - Days absent (deductions apply)
  - Leaves taken

**Step 3: Calculate Salaries**
1. Click **Calculate Salaries**
2. System computes for each employee:
   - **Earnings**:
     - Basic salary (per day × days present)
     - HRA
     - Allowances
     - Overtime (if any)
   - **Deductions**:
     - PF (12% of basic)
     - ESI (0.75% of gross)
     - Professional Tax
     - Absent days deduction
     - Advances
   - **Net Salary**: Total earnings - Total deductions

**Step 4: Review & Approve**
- Review salary sheet
- Verify deductions
- Make manual adjustments (if needed)
- Click **Approve Payroll**

**Step 5: Generate Salary Slips**
- Click **Generate Slips**
- PDF created for each employee
- Email or print

**Step 6: Process Payment**
- Bank transfer file generated
- Or mark as paid (cash/cheque)

#### Salary Components

**Standard Structure**:
```
Basic Salary: 50%
HRA: 20%
Conveyance: 5%
Special Allowance: 25%
---
Gross Salary: 100%
Less: PF (12%)
Less: ESI (0.75%)
Less: PT (as applicable)
---
Net Salary
```

#### Salary Slips

Each slip contains:
- Employee details
- Attendance summary
- Earnings breakdown
- Deductions breakdown
- Net payable
- Payment mode
- Company seal & signature

**Tips**:
- Process payroll by 5th of next month
- Reconcile attendance before calculation
- Keep payroll records for 7 years (compliance)
- Set up salary advances as separate deductions
- Review salary structure annually

---

## Accounting & Finance Module

### 1. Voucher Entry

**Access**: Accounting & Finance → Voucher Entry

#### Accounting Vouchers

Record all financial transactions:

**Voucher Types**:
- 💰 **Payment**: Cash/Bank payments
- 💵 **Receipt**: Cash/Bank receipts
- 📝 **Journal**: Adjustments/corrections
- 💸 **Contra**: Bank-to-bank transfers

#### Creating a Payment Voucher

1. Click **+ New Payment**
2. Enter:
   - **Date**: Transaction date
   - **Payment Mode**: Cash or Bank
   - **Account**: Bank account (if bank payment)
   - **Paid To**: Party name
   - **Amount**: Payment amount
   - **Narration**: Description (e.g., "Fertilizer purchase from ABC Traders")
3. **Add Ledger Entries**:
   - Debit account (expense/asset)
   - Credit account (cash/bank)
4. Save

#### Creating a Receipt Voucher

1. Click **+ New Receipt**
2. Enter:
   - **Date**: Receipt date
   - **Receipt Mode**: Cash or Bank
   - **Received From**: Party name
   - **Amount**: Receipt amount
   - **Narration**: Description
3. **Add Ledger Entries**:
   - Debit: Cash/Bank
   - Credit: Sales/Debtor
4. Save

#### Journal Voucher

For non-cash transactions:
- Depreciation
- Bad debts write-off
- Expense accruals
- Corrections

**Format**:
```
Debit: Account Name    ₹XXX
Credit: Account Name   ₹XXX
```

**Rule**: Total Debits = Total Credits (always)

---

### 2. Payment Entry

**Access**: Accounting & Finance → Payments

#### Supplier Payments

Process payments to vendors:

1. Click **+ New Payment**
2. **Select Purchase Bill** (optional): Links to bill
3. Enter:
   - **Supplier**: Vendor name
   - **Payment Date**: Date of payment
   - **Amount**: Full or partial
   - **Payment Method**:
     - 💵 Cash
     - 🏦 Bank Transfer
     - 📜 Cheque
     - 💳 Online (UPI/NEFT/RTGS)
   - **Reference Number**: Cheque no./UTR
   - **Bank Account** (if applicable)
4. **Adjust Against Bills**:
   - System shows outstanding bills
   - Allocate payment to specific bills
5. Click **Save Payment**

#### Payment Status

- ✅ **Paid**: Payment completed
- ⏳ **Pending**: Cheque issued, not cleared
- ❌ **Failed**: Payment unsuccessful

#### Payment Reports

- Payments made today
- Supplier-wise payment summary
- Bank-wise payment summary
- Pending payments (due this week)

**Tips**:
- Schedule supplier payments weekly
- Maintain payment terms (15/30/45 days)
- Track cheque clearances
- Reconcile bank statements monthly

---

### 3. Expense Management

**Access**: Accounting & Finance → Expenses

#### Recording Expenses

Track all business expenses:

**Expense Categories**:
- 💡 Electricity
- 💧 Water
- 🔧 Maintenance
- 🚛 Transport
- 📞 Telephone/Internet
- 🏢 Rent
- 📝 Stationery
- 🍽️ Staff welfare
- 🔬 Lab testing
- 💼 Professional fees

#### Adding an Expense

1. Click **+ Add Expense**
2. Fill form:
   - **Date**: Expense date
   - **Category**: Select from list
   - **Amount**: Total expense
   - **Vendor**: Who was paid
   - **Payment Mode**: Cash/Bank/Credit Card
   - **Bill Number**: Vendor bill reference
   - **Description**: Brief details
   - **Department**: Which dept (if applicable)
3. **Upload Bill** (optional): Attach image/PDF
4. Save

#### Expense Approval Workflow

For amounts >₹5,000:
1. Employee submits expense
2. Manager reviews
3. Manager approves/rejects
4. Accounts processes payment

#### Expense Reports

- **Monthly Expenses**: Category-wise breakdown
- **Department-wise**: Expense allocation
- **Trend Analysis**: Compare with previous months
- **Budget vs Actual**: Variance analysis

**Tips**:
- Collect bills for all expenses
- Categorize accurately for reporting
- Set monthly budgets by category
- Review expenses weekly
- Identify cost-saving opportunities

---

### 4. Trial Balance

**Access**: Accounting & Finance → Trial Balance

#### What is Trial Balance?

A **statement of all ledger balances** to verify accounting accuracy:
- Lists all accounts
- Shows debit and credit balances
- Total debits = Total credits (if books are correct)

#### Generating Trial Balance

1. Select **Date Range**:
   - Financial year (Apr-Mar)
   - Quarter
   - Month
   - Custom date range
2. Click **Generate**

#### Trial Balance Format

| Account Name | Debit (₹) | Credit (₹) |
|--------------|-----------|------------|
| Cash | 50,000 | - |
| Bank | 2,00,000 | - |
| Debtors | 1,50,000 | - |
| Stock | 3,00,000 | - |
| Creditors | - | 2,00,000 |
| Sales | - | 8,00,000 |
| Purchases | 5,00,000 | - |
| Expenses | 2,00,000 | - |
| **Total** | **13,00,000** | **13,00,000** |

#### Using Trial Balance

**Purpose**:
- Verify accounting accuracy
- Prepare financial statements
- Year-end closing
- Auditor requirements

**If Debits ≠ Credits**:
- Check for missing entries
- Verify voucher postings
- Review journal entries
- Correct errors

**Export Options**:
- PDF report
- Excel spreadsheet
- Print

---

### 5. Day Book

**Access**: Accounting & Finance → Day Book

#### Daily Transaction Register

The Day Book is a **chronological record** of all financial transactions:

#### Viewing Day Book

1. Select **Date**: Choose specific date or range
2. View all transactions:
   - **Voucher Type**: Payment/Receipt/Journal/Contra
   - **Voucher Number**: Reference ID
   - **Particulars**: Description
   - **Debit Amount**: Money out
   - **Credit Amount**: Money in
   - **Balance**: Running balance

#### Day Book Uses

**Daily Checks**:
- Verify all transactions recorded
- Cross-check cash book
- Identify errors immediately

**Month-End**:
- Reconcile with bank statements
- Prepare monthly reports
- Audit trail

**Filters**:
- Filter by voucher type
- Filter by account
- Search by amount
- Search by narration

**Export**:
- PDF daily summary
- Excel export
- Email report

**Tips**:
- Review day book daily (before close)
- Verify opening & closing balances
- Match with physical cash count
- Reconcile bank transactions weekly

---

## Reports Module

**Access**: Reports → Reports

### Business Intelligence Dashboards

#### 1. Sales Reports

**Monthly Sales**:
- Revenue by month (chart)
- Top selling crops
- Sales by customer
- Payment collection status

**Filters**: Date range, customer, crop type

#### 2. Production Reports

**Batch Performance**:
- Germination rates by crop
- Harvest readiness timeline
- Polyhouse utilization
- Input consumption analysis

**Filters**: Date range, crop type, polyhouse

#### 3. Inventory Reports

**Stock Status**:
- Current stock levels
- Items below reorder level
- Dead stock (no movement >90 days)
- Stock valuation

**Export**: PDF, Excel

#### 4. Financial Reports

**Profit & Loss**:
- Revenue vs Expenses
- Gross profit margin
- Net profit
- Period comparison

**Balance Sheet**:
- Assets
- Liabilities
- Net worth

**Cash Flow**:
- Opening balance
- Receipts
- Payments
- Closing balance

**Filters**: Financial year, quarter, month

#### 5. Customer Reports

**Customer Analytics**:
- Top customers by revenue
- Customer order frequency
- Payment behavior analysis
- Outstanding receivables

**Aging Report**:
- 0-30 days
- 31-60 days
- 61-90 days
- >90 days (high risk)

#### 6. Supplier Reports

**Supplier Performance** (see Supplier Performance page):
- Scorecard summary
- Delivery performance
- Quality metrics
- Germination rates

#### 7. HR Reports

**Attendance**:
- Department-wise attendance
- Leave utilization
- Absenteeism rate

**Payroll**:
- Monthly salary summary
- Department-wise cost
- Statutory deductions

---

## Common Workflows

### Workflow 1: Purchase to Inventory

```
1. Create Purchase Bill (Procurement → Purchase Bills)
   ↓
2. Goods Delivered by Supplier
   ↓
3. Create Quality Inspection (Procurement → Quality Inspection)
   ↓
4. Inspect Items (Accept/Reject)
   ↓
5. Approve Inspection
   ↓
6. Stock Auto-Updated (Procurement → Inventory)
   ↓
7. Record Payment (Accounting → Payments)
```

**Timeline**: 1-3 days

---

### Workflow 2: Production Cycle

```
1. Create Production Batch (Production → Production)
   - Add seeds/inputs from inventory
   ↓
2. Assign to Polyhouse (Production → Polyhouses)
   ↓
3. Update Stage: Germination (5-15 days)
   ↓
4. Update Stage: Hardening (7-21 days)
   ↓
5. Update Stage: Ready (when 90% mature)
   ↓
6. View in Ready Crops (Production → Ready Crops)
   ↓
7. Available for Sale
```

**Timeline**: 3-8 weeks (crop dependent)

---

### Workflow 3: Order to Delivery

```
1. Customer Inquiry
   ↓
2. Create Booking (Sales → Bookings)
   - Select crop from Ready Crops
   ↓
3. Confirm Booking (status: Confirmed)
   ↓
4. Prepare for Delivery
   ↓
5. Create Delivery Challan (Logistics → Deliveries)
   - Assign vehicle & driver
   ↓
6. Dispatch (status: In Transit)
   ↓
7. Deliver to Customer (status: Delivered)
   ↓
8. Generate Invoice (Sales → Sales)
   ↓
9. Collect Payment (Sales → Record Payment)
```

**Timeline**: 1-7 days

---

### Workflow 4: Shipping Order (Courier)

```
1. Confirmed Order (Customer outside delivery range)
   ↓
2. Create Shipment (Logistics → Shipping Management)
   - Enter destination & package details
   ↓
3. Calculate Rate (click Calculate Rate)
   ↓
4. Confirm Shipment Creation
   ↓
5. Print Shipping Label (click Print Label)
   ↓
6. Schedule Pickup with Courier
   ↓
7. Mark as Picked Up (when courier collects)
   ↓
8. Track Shipment (view tracking timeline)
   ↓
9. Mark as Delivered (on confirmation)
   ↓
10. Generate Invoice
```

**Timeline**: 1-7 days (service type dependent)

---

### Workflow 5: Monthly Payroll

```
1. Mark Daily Attendance (HR → Attendance)
   - Throughout the month
   ↓
2. Process Leave Applications (HR → Leave)
   ↓
3. Month End: Navigate to Payroll (HR → Payroll)
   ↓
4. Select Month
   ↓
5. Fetch Attendance Data
   ↓
6. Calculate Salaries
   ↓
7. Review & Adjust
   ↓
8. Approve Payroll
   ↓
9. Generate Salary Slips
   ↓
10. Process Payments (Bank Transfer/Cash)
```

**Timeline**: 1-5 of next month

---

## Offline Mode

### What is Offline Mode?

The application works even when **internet connection is lost**, specifically for the Sales module.

### How It Works

#### 1. When You Go Offline

- 🟡 **Yellow banner** appears at top:
  > ⚠️ **Offline Mode**: You're offline. Sales will be queued and synced when connection is restored.

- You can continue working normally:
  - View existing data (cached)
  - Create new sales
  - Record transactions

#### 2. Creating Sales Offline

1. Navigate to **Sales → Sales**
2. Create invoice as usual
3. Instead of sending to server immediately:
   - Sale saved to **local storage** (IndexedDB)
   - Status: "Pending Sync"
   - No internet connection needed

#### 3. Pending Sales Queue

- 🔵 **Blue banner** shows when sales are pending:
  > ☁️ **3 sales pending sync** [Sync Progress Bar] [Sync Now Button]

- Counter updates as you create more sales
- Data safe on your device until synced

#### 4. When Connection Restored

**Automatic Sync**:
- System detects internet connection
- Auto-syncs every **30 seconds**
- Progress bar shows upload status
- Success: "Synced 2/3 sales"

**Manual Sync**:
- Click **Sync Now** button
- Immediate upload attempt
- Real-time progress feedback

#### 5. Sync Complete

- 🟢 **Green banner** appears:
  > ✅ **Sync Complete**: 3 sales synced successfully

- Banner auto-hides after 5 seconds
- All data now in server database
- Local queue cleared

### Offline Architecture

**Technologies Used**:
- **Service Worker**: Background sync
- **IndexedDB**: Local database
- **Sync Queue**: Auto-upload manager

**Data Cached Offline**:
- ✅ Products/inventory (for dropdown)
- ✅ Customers (for selection)
- ✅ Pending sales (until synced)
- ✅ Application UI

**Limitations**:
- Only **Sales module** works offline
- Other modules require internet
- Offline period: Up to 7 days (storage limit)
- Large transactions (>100 items) may sync slower

### Testing Offline Mode

**Method 1: Browser DevTools**
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Check **Offline** checkbox
4. Create a sale
5. Uncheck **Offline** to restore connection
6. Watch auto-sync

**Method 2: Airplane Mode**
1. Enable airplane mode on device
2. Use application
3. Disable airplane mode
4. Sync happens automatically

### Troubleshooting Offline Mode

**Problem**: Sales not syncing
- **Solution**: Check internet connection
- Click "Sync Now" manually
- Refresh page

**Problem**: Old data showing
- **Solution**: Clear browser cache
- Force refresh (Ctrl+Shift+R)

**Problem**: Sync failed
- **Solution**: Check error message
- Verify transaction data
- Retry sync
- Contact support if persists

**Best Practices**:
- ✅ Sync at least once daily
- ✅ Don't let queue exceed 50 sales
- ✅ Test internet before large transactions
- ✅ Keep browser open during sync
- ✅ Note transaction details manually (backup)

---

## Tips & Best Practices

### Data Entry

✅ **Do's**:
- Enter data daily (don't accumulate)
- Double-check quantities and amounts
- Use consistent naming conventions
- Add notes/descriptions for clarity
- Save drafts frequently

❌ **Don'ts**:
- Don't skip required fields
- Don't use special characters in names
- Don't delete records (mark inactive instead)
- Don't share login credentials

### Inventory Management

- Conduct **physical stock verification** monthly
- Set reorder levels to 10-15 days consumption
- Use **FIFO** (First In, First Out) for perishables
- Track **batch-wise** for seeds (germination tracking)
- Review **dead stock** quarterly (no movement >90 days)

### Sales & Customer Management

- Update customer contact info regularly
- Follow up on **overdue invoices** weekly
- Offer **early payment discounts** (2% for 7 days)
- Maintain **credit limits** for new customers
- Send **payment reminders** 3 days before due date

### Production Optimization

- Plan production based on **sales forecasts**
- Maintain **10-15% buffer** capacity in polyhouses
- Track **germination rates** by seed lot
- Record **batch costs** for pricing decisions
- Schedule **hardening** to match delivery dates

### Financial Discipline

- Reconcile **bank statements** weekly
- Review **Trial Balance** monthly
- Generate **P&L reports** monthly
- Keep **all bills/invoices** for 7 years
- Separate **personal** and **business** transactions

### HR & Payroll

- Mark attendance before **11 AM daily**
- Process payroll by **5th of next month**
- Maintain **leave balance** records
- Conduct **performance reviews** quarterly
- Keep employee records **updated**

### System Maintenance

- **Backup database** daily (automated)
- Clear **browser cache** weekly
- Update **master data** regularly
- Review **system logs** for errors
- Train staff on **new features**

### Security

- Change passwords **every 90 days**
- Use **strong passwords** (min 8 characters)
- Log out when leaving workstation
- Restrict **user access** by role
- Review **user activity logs** monthly

### Reporting

- Generate **monthly reports** by 7th
- Share with **management/stakeholders**
- Compare **actual vs budget**
- Identify **trends and patterns**
- Act on **insights/anomalies**

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save current form |
| `Ctrl + F` | Focus search box |
| `Esc` | Close modal/dialog |
| `Ctrl + P` | Print current page |
| `Ctrl + /` | Show shortcuts help |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + D` | Go to Dashboard |
| `Alt + I` | Go to Inventory |
| `Alt + P` | Go to Production |
| `Alt + S` | Go to Sales |
| `Alt + R` | Go to Reports |

### Form Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Next field |
| `Shift + Tab` | Previous field |
| `Enter` | Submit form (in text field) |
| `Ctrl + Enter` | Force submit |

---

## Support & Help

### Getting Help

**In-App Help**:
- Click **?** icon (top-right) for help
- Hover over field labels for tooltips
- Check validation messages for errors

**Documentation**:
- This user manual
- Video tutorials (coming soon)
- FAQ section

**Technical Support**:
- Email: support@agrinursery.com
- Phone: +91-XXXX-XXXXXX
- Live chat: Available 9 AM - 6 PM

**Training**:
- Schedule training sessions
- Request module-specific training
- Watch tutorial videos

### Reporting Issues

When reporting bugs:
1. Describe the problem clearly
2. Mention which page/module
3. Provide steps to reproduce
4. Include screenshots (if possible)
5. Note error messages

### Feature Requests

Submit suggestions for:
- New features
- UI improvements
- Report additions
- Integration requests

---

## Glossary

**Batch**: A group of plants grown together from same sowing date

**Booking**: Customer order/reservation for plants

**Challan**: Delivery document (without price)

**Crop**: Plant type being cultivated

**Debit Note**: Document claiming refund/credit from supplier

**ERP**: Enterprise Resource Planning (integrated business software)

**Germination**: Seed sprouting stage

**Hardening**: Strengthening seedlings before sale

**Invoice**: Sales document with payment details

**LWP**: Leave Without Pay

**Polyhouse**: Greenhouse/protected cultivation structure

**PO**: Purchase Order

**Ready Crops**: Plants ready for sale

**Reorder Level**: Minimum stock threshold

**Tray**: Container for seedling production

**Trial Balance**: Accounting statement verifying ledger accuracy

**Voucher**: Accounting transaction document

---

## Appendix

### Date Formats

- Display: **DD/MM/YYYY** (26/01/2026)
- Input: **YYYY-MM-DD** (2026-01-26)

### Number Formats

- Currency: **₹1,23,456.78** (Indian format)
- Quantity: **1,234** (with comma separator)
- Percentage: **12.5%**

### Status Color Codes

- 🟢 **Green**: Approved, Delivered, Active, Good
- 🔵 **Blue**: In Progress, Confirmed
- 🟡 **Yellow**: Pending, Warning, Fair
- 🔴 **Red**: Rejected, Failed, Critical, Poor
- ⚫ **Gray**: Inactive, Cancelled

### File Upload Limits

- Image files: Max 5 MB
- PDF files: Max 10 MB
- Supported formats: JPG, PNG, PDF

### Browser Compatibility

**Recommended**:
- ✅ Google Chrome (latest)
- ✅ Mozilla Firefox (latest)
- ✅ Microsoft Edge (latest)
- ✅ Safari (latest)

**Not Supported**:
- ❌ Internet Explorer

---

**End of User Manual**

*For latest updates and announcements, check the Dashboard notifications.*

*Version 2.0 - January 2026*

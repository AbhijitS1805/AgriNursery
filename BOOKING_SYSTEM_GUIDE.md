# Plant Booking System - Implementation Summary

## Overview
Complete booking, invoicing, and payment system for AgriNursery ERP where farmers can book plants (ready now or future production), generate invoices, track payments, and manage deliveries.

## Database Schema

### Core Tables Created

#### 1. `payment_methods`
- Stores available payment methods (Cash, UPI, Bank Transfer, Cheque, Card)
- Pre-populated with 5 default methods

#### 2. `bookings`
Main table for plant orders from farmers
- **Key Fields**:
  - `booking_number`: Auto-generated (BK-2025-0001)
  - `farmer_id`: Link to farmers table
  - `booking_date`, `required_date`: Timeline tracking
  - `status`: Pending → Confirmed → Ready → Delivered workflow
  - `subtotal`, `discount_amount`, `tax_amount`, `total_amount`: Pricing
  - `notes`, `internal_notes`: Communication
  
#### 3. `booking_items`
Line items for each booking
- Plant name, quantity, unit price
- Links to `production_id` for inventory reservation
- Tracks `delivered_quantity` separately

#### 4. `sales_invoices`
Sales invoices for farmers (separate from inventory purchase invoices)
- **Key Fields**:
  - `invoice_number`: Auto-generated (SI-2025-0001)
  - `booking_id`, `farmer_id`: References
  - `invoice_date`, `due_date`: Payment terms
  - `paid_amount`, `balance_due`: Payment tracking
  - `status`: Unpaid → Partially Paid → Paid (auto-updated by trigger)

#### 5. `sales_payments`
Payment records from farmers
- **Key Fields**:
  - `receipt_number`: Auto-generated (RCP-2025-0001)
  - `sales_invoice_id`, `booking_id`, `farmer_id`: Multi-level tracking
  - `amount`, `payment_method_id`: Payment details
  - `transaction_reference`, `bank_name`: Method-specific data
  
#### 6. `deliveries` & `delivery_items`
Delivery tracking (foundation for future enhancement)
- `delivery_number`: Auto-generated (DEL-2025-0001)
- Tracks delivery status and received by details

### Database Features

#### Auto-Generated Numbers
Functions created for sequential numbering:
- `generate_booking_number()` → BK-YYYY-0001
- `generate_sales_invoice_number()` → SI-YYYY-0001
- `generate_receipt_number()` → RCP-YYYY-0001
- `generate_delivery_number()` → DEL-YYYY-0001

#### Automated Triggers
1. **update_booking_totals()**: Automatically recalculates booking totals when items change
2. **update_sales_invoice_balance()**: Updates invoice balance and status when payments recorded
3. **update_booking_item_delivered_qty()**: Tracks delivered quantities

#### Useful Views
1. **v_booking_summary**: Complete booking overview with farmer and invoice details
2. **v_payment_summary**: Payment history with all related information
3. **v_outstanding_invoices**: Overdue and pending invoices with days overdue

## Backend APIs

### Bookings API (`/api/bookings`)

#### Endpoints:
- `GET /api/bookings` - Get all bookings (filters: farmer_id, status, start_date, end_date)
- `GET /api/bookings/stats` - Booking statistics dashboard
- `GET /api/bookings/available-plants` - List plants available for booking
- `GET /api/bookings/:id` - Get single booking with items
- `POST /api/bookings` - Create new booking (with inventory reservation)
- `PATCH /api/bookings/:id/status` - Update booking status
- `PATCH /api/bookings/:id/cancel` - Cancel booking (restores inventory)

#### Key Features:
- **Inventory Reservation**: When booking created with `production_id`, automatically reduces available quantity
- **Transaction Safety**: All operations wrapped in database transactions
- **Validation**: Checks sufficient quantity before reservation
- **Cancellation**: Restores inventory when booking cancelled

### Sales Invoices API (`/api/sales-invoices`)

#### Endpoints:
- `GET /api/sales-invoices` - Get all invoices (filters: farmer_id, status, dates)
- `GET /api/sales-invoices/stats` - Invoice statistics
- `GET /api/sales-invoices/outstanding` - Overdue/pending invoices
- `GET /api/sales-invoices/:id` - Get invoice with items and payments
- `POST /api/sales-invoices` - Generate invoice for a booking

#### Key Features:
- **One Invoice Per Booking**: Validation prevents duplicate invoices
- **Automatic Number Generation**: Sequential invoice numbers per year
- **Due Date Calculation**: Configurable payment terms (default 30 days)
- **Historical Record**: Copies amounts from booking for audit trail

### Sales Payments API (`/api/sales-payments`)

#### Endpoints:
- `GET /api/sales-payments` - Get all payments (filters: farmer_id, dates, payment_method)
- `GET /api/sales-payments/stats` - Payment statistics (total, last 30 days, today)
- `GET /api/sales-payments/methods` - Available payment methods
- `GET /api/sales-payments/invoice/:invoice_id` - Payments for specific invoice
- `GET /api/sales-payments/:id` - Single payment details
- `POST /api/sales-payments` - Record new payment

#### Key Features:
- **Balance Validation**: Cannot pay more than balance due
- **Auto Status Update**: Trigger updates invoice status (Unpaid → Partially Paid → Paid)
- **Multi-Method Support**: Cash, UPI, Bank Transfer, Cheque, Card
- **Transaction Details**: Stores reference numbers, bank names

## Frontend Implementation

### Bookings Page (`/bookings`)

#### Features Implemented:
1. **Dashboard Stats Cards**:
   - Total Bookings
   - Confirmed Bookings
   - Pending Bookings
   - Total Booking Value

2. **Filters**:
   - Search by booking number or farmer name
   - Filter by status (Pending, Confirmed, Ready, etc.)

3. **Bookings Table**:
   - Booking Number
   - Farmer (name + mobile)
   - Booking Date & Required Date
   - Item Count (plants count)
   - Total Amount
   - Status Badge (color-coded)
   - Actions (View, Generate Invoice)

4. **Create Booking Modal**:
   - Farmer selection dropdown
   - Required date picker
   - Discount % and Tax/GST %
   - Notes and Internal Notes
   - **Multi-Item Support**:
     - Plant selection from available inventory
     - Quantity input with availability check
     - Unit price (auto-filled from suggested price)
     - Line total calculation
   - **Real-time Totals**:
     - Subtotal
     - Discount calculation
     - Tax calculation
     - Grand Total

5. **View Booking Modal**:
   - Read-only view of booking details
   - Shows all items with prices
   - Displays calculated totals

6. **Quick Actions**:
   - Generate Invoice button (for confirmed bookings)
   - View booking details
   - Shows invoice number if already generated

## Business Workflow

### Typical Flow:

```
1. Farmer visits nursery with plant requirement
   ↓
2. Staff creates booking:
   - Selects farmer
   - Sets required date
   - Adds plants (from ready crops or future production)
   - Applies discount/tax
   ↓
3. System reserves inventory (if plants available)
   Status: Pending
   ↓
4. Staff confirms booking
   Status: Confirmed
   ↓
5. Generate invoice
   Creates sales_invoice record
   Status: Unpaid
   ↓
6. Record payment(s)
   - Full or partial payments
   - Multiple payment methods supported
   - Invoice status auto-updates
   ↓
7. Mark as Ready when plants prepared
   Status: Ready
   ↓
8. Deliver to farmer
   Status: Delivered
```

### Status Workflow:
- **Pending**: New booking, awaiting confirmation
- **Confirmed**: Booking confirmed, inventory reserved
- **Ready**: Plants prepared and ready for pickup/delivery
- **Partially Delivered**: Some items delivered
- **Delivered**: All items delivered, booking complete
- **Cancelled**: Booking cancelled, inventory restored

## Key Business Features

### 1. Inventory Management
- ✅ Automatic reservation when booking created
- ✅ Prevents overbooking (validates quantity)
- ✅ Restores inventory on cancellation
- ✅ Tracks available vs. booked quantities

### 2. Flexible Booking
- ✅ Book ready plants (from "In Polyhouse" productions)
- ✅ Book future plants (without production_id)
- ✅ Multiple plants per booking
- ✅ Custom pricing per line item

### 3. Financial Tracking
- ✅ Discount support (percentage-based)
- ✅ Tax/GST calculation
- ✅ Multiple payment methods
- ✅ Partial payments
- ✅ Outstanding balance tracking
- ✅ Overdue invoice identification

### 4. Accounting Features
- ✅ Sequential numbering (bookings, invoices, receipts)
- ✅ Historical price tracking (copied to invoice)
- ✅ Payment audit trail
- ✅ Transaction references for digital payments
- ✅ Views for financial reporting

## Future Enhancements (Recommended)

### 1. Invoice Management Page
- Print-friendly invoice format
- PDF generation
- Email/WhatsApp sending
- Invoice templates

### 2. Payment Tracking Page
- Payment dashboard
- Outstanding receivables report
- Payment reminders
- Receipt printing

### 3. Delivery Management
- Delivery scheduling
- Vehicle assignment
- Delivery notes
- POD (Proof of Delivery)

### 4. Advanced Features
- WhatsApp notifications to farmers
- SMS alerts for payments due
- Online payment integration (Razorpay/Paytm)
- Farmer self-service portal
- Loyalty/Credit system
- Bulk booking upload
- Booking analytics & trends

### 5. Reporting
- Sales by plant type
- Farmer purchase history
- Revenue forecasting
- Outstanding aging report
- Payment collection efficiency

## API Testing Examples

### Create a Booking:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "farmer_id": 1,
    "required_date": "2025-01-15",
    "discount_percent": 5,
    "tax_percent": 18,
    "notes": "Urgent delivery required",
    "items": [
      {
        "plant_name": "Chilli",
        "production_id": 4,
        "quantity": 50,
        "unit_price": 55
      }
    ]
  }'
```

### Generate Invoice:
```bash
curl -X POST http://localhost:5000/api/sales-invoices \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "due_days": 30,
    "notes": "Payment due within 30 days"
  }'
```

### Record Payment:
```bash
curl -X POST http://localhost:5000/api/sales-payments \
  -H "Content-Type: application/json" \
  -d '{
    "sales_invoice_id": 1,
    "amount": 1500,
    "payment_method_id": 1,
    "notes": "Partial payment received"
  }'
```

## Files Created

### Backend:
- `/server/database/migrations/006_booking_system.sql` - Complete schema
- `/server/controllers/bookings.controller.js` - Booking business logic
- `/server/controllers/sales-invoices.controller.js` - Invoice management
- `/server/controllers/sales-payments.controller.js` - Payment processing
- `/server/routes/bookings.routes.js` - Booking endpoints
- `/server/routes/sales-invoices.routes.js` - Invoice endpoints
- `/server/routes/sales-payments.routes.js` - Payment endpoints

### Frontend:
- `/client/src/pages/Bookings.jsx` - Complete booking management UI

### Updated:
- `/server/index.js` - Registered new API routes
- `/client/src/App.jsx` - Added Bookings route
- `/client/src/components/Layout.jsx` - Added Bookings navigation

## Navigation
Access the Bookings page at: **http://localhost:3000/bookings**

## Summary
✅ Complete booking system with database, backend APIs, and frontend UI
✅ Inventory reservation and tracking
✅ Invoice generation and payment processing
✅ Multi-status workflow support
✅ Financial calculations (discount, tax)
✅ Automated triggers and sequential numbering
✅ Ready for production use!

Next steps: Build Invoice Management and Payment Tracking pages for complete accounting workflow.

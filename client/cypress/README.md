# AgriNursery ERP - End-to-End Testing

## Overview
Comprehensive Cypress test suite covering all modules of the AgriNursery ERP system.

## Test Structure

### Test Files (8 Complete E2E Test Suites)

1. **01-inventory.cy.js** - Inventory Management
   - Display inventory with stats
   - Material list with search/filter
   - Add new materials
   - Update stock levels
   - Low stock alerts

2. **02-production.cy.js** - Production Management
   - Production dashboard with stats
   - Batch list and filtering
   - Create new production batch
   - Update batch status
   - Track batch progress

3. **03-booking.cy.js** - Booking System
   - Booking list with stats
   - Create complete booking flow
   - Add new farmer
   - Add multiple booking items
   - Confirm bookings
   - Search and filter bookings

4. **04-sales-invoice.cy.js** - Sales & Invoices
   - Invoice list with stats
   - Generate invoice from booking
   - View invoice details
   - Search and filter invoices
   - Track payment status

5. **05-payments.cy.js** - Payment Recording
   - Record payments (partial/full)
   - Multiple payment methods (Cash, UPI, Bank Transfer, Cheque, Card)
   - Generate receipt numbers
   - Payment history tracking
   - Amount validation

6. **06-delivery.cy.js** - Delivery Management
   - Delivery dashboard with stats
   - Schedule delivery from invoice
   - Assign vehicle and driver
   - Update delivery status
   - Complete delivery with details
   - Track deliveries by date

7. **07-hrms.cy.js** - HR Management System
   - **Employee Management:**
     - Employee list with search/filter
     - Add new employees
     - View employee details
     - Department/designation filtering
   
   - **Attendance Management:**
     - Today's attendance dashboard
     - Mark present/absent/half-day
     - Bulk mark all present
     - Filter by date
   
   - **Leave Management:**
     - Apply for leave
     - View leave balance
     - Approve/reject leave applications

8. **08-complete-journey.cy.js** - Complete User Journey
   - End-to-end flow testing entire system
   - Steps:
     1. Check inventory stock
     2. Verify production ready crops
     3. Create booking with new farmer
     4. Add multiple items to booking
     5. Confirm booking
     6. Generate invoice
     7. Record partial payment (UPI)
     8. Record final payment (Cash)
     9. Schedule delivery with vehicle/driver
     10. Start delivery (mark in-transit)
     11. Complete delivery
   - Verification across all modules

## Custom Cypress Commands

Located in `cypress/support/commands.js`:

- `cy.fillByLabel(label, value)` - Fill input by label text
- `cy.selectByLabel(label, value)` - Select dropdown by label
- `cy.clickButton(text)` - Click button by text
- `cy.waitForApi(alias)` - Wait for API with 200 status
- `cy.tableContains(text)` - Verify table contains text
- `cy.apiUrl(endpoint)` - Get full API URL
- `cy.verifySuccess(message)` - Verify success message
- `cy.verifyError(message)` - Verify error message

## Configuration

**cypress.config.js:**
- Base URL: http://localhost:3000
- API URL: http://localhost:5000/api
- Viewport: 1280x720
- Timeouts: 10000ms
- Video recording: Disabled
- Screenshots: On failure only

## Running Tests

### Prerequisites
1. Backend server running on port 5000
2. Frontend dev server running on port 3000
3. PostgreSQL database populated with seed data

### Commands

```bash
# Open Cypress Test Runner (Interactive)
npm run cypress:open

# Run all tests in headless mode
npm run cypress:run

# Run specific test file
npx cypress run --spec "cypress/e2e/08-complete-journey.cy.js"

# Run tests with specific browser
npx cypress run --browser chrome

# Run and generate video
npx cypress run --config video=true
```

## Test Coverage

### Modules Tested
✅ Inventory Management (7 tests)
✅ Production Management (6 tests)
✅ Booking System (7 tests)
✅ Sales & Invoices (6 tests)
✅ Payment Recording (6 tests)
✅ Delivery Management (6 tests)
✅ HRMS - Employees (6 tests)
✅ HRMS - Attendance (6 tests)
✅ HRMS - Leave (5 tests)
✅ Complete E2E Journey (2 comprehensive tests)

**Total: 57+ test cases**

### Features Tested
- CRUD operations for all entities
- Search and filtering
- Form validation
- Status workflows
- Multi-step processes
- Payment methods
- Receipt generation
- Auto-numbering (BK-YYYY-0001, SI-YYYY-0001, etc.)
- Date handling
- Stats calculations
- Modal interactions
- Bulk operations
- Complete user journeys

## Test Data

Tests use dynamic data generation:
- Timestamps for unique names
- Auto-generated booking/invoice numbers
- Multiple payment methods
- Various statuses and workflows

## Known Issues

Some tests may need adjustment based on:
1. Actual UI element selectors (labels, button text)
2. Modal implementations (if not yet built)
3. Form field names and IDs
4. API response times (adjust waits if needed)

## Debugging

If tests fail:
1. Check backend/frontend are running
2. Verify database has seed data
3. Check console for API errors
4. Review screenshots in `cypress/screenshots`
5. Check network tab for API calls
6. Use `cy.pause()` to debug interactively

## Next Steps

1. Run tests to identify missing UI components
2. Implement any missing modals/forms
3. Add visual regression testing
4. Set up CI/CD pipeline
5. Add API contract testing
6. Performance testing with large datasets

## Maintenance

- Update selectors if UI changes
- Add new tests for new features
- Keep custom commands DRY
- Document any test-specific setup
- Review and update after major changes

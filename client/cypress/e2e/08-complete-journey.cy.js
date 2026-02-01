/// <reference types="cypress" />

describe('Complete End-to-End User Journey', () => {
  let farmerName;
  let bookingNumber;
  let invoiceNumber;
  let deliveryNumber;

  it('Complete Flow: Inventory → Production → Booking → Invoice → Payment → Delivery', () => {
    // ===== STEP 1: CHECK INVENTORY =====
    cy.visit('/inventory');
    cy.contains('h1', 'Inventory').should('be.visible');
    
    // Verify we have materials in stock
    cy.get('table tbody tr').should('have.length.at.least', 1);
    cy.contains('In Stock').should('be.visible');
    
    // ===== STEP 2: CHECK PRODUCTION =====
    cy.visit('/production');
    cy.contains('h1', 'Production').should('be.visible');
    
    // Verify we have ready crops
    cy.get('select').first().select('Ready');
    cy.wait(500);
    cy.get('table tbody tr').should('have.length.at.least', 1);
    
    // ===== STEP 3: CREATE BOOKING =====
    cy.visit('/bookings');
    cy.clickButton('New Booking');
    
    // Add new farmer
    cy.clickButton('Add New Farmer');
    farmerName = `E2E Farmer ${Date.now()}`;
    cy.fillByLabel('Name', farmerName);
    cy.fillByLabel('Mobile', '9999888877');
    cy.fillByLabel('Village', 'E2E Test Village');
    cy.fillByLabel('District', 'Test District');
    cy.clickButton('Save');
    
    cy.wait(1000);
    
    // Select farmer
    cy.get('table tbody tr').first().within(() => {
      cy.clickButton('Select');
    });
    
    // Add booking items
    cy.clickButton('Add Item');
    cy.selectByLabel('Crop', 'Tomato');
    cy.fillByLabel('Quantity', '150');
    cy.fillByLabel('Rate', '12');
    cy.clickButton('Add');
    
    // Add another item
    cy.clickButton('Add Item');
    cy.selectByLabel('Crop', 'Chilli');
    cy.fillByLabel('Quantity', '50');
    cy.fillByLabel('Rate', '20');
    cy.clickButton('Add');
    
    // Set booking details
    cy.fillByLabel('Expected Delivery Date', '2025-02-01');
    cy.fillByLabel('Advance Amount', '1000');
    cy.fillByLabel('Special Instructions', 'E2E Test Booking - Handle with care');
    
    // Create booking
    cy.clickButton('Create Booking');
    cy.verifySuccess('Booking created successfully');
    
    // Capture booking number
    cy.wait(1000);
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').first().invoke('text').then((text) => {
        bookingNumber = text.trim();
        cy.log(`Created Booking: ${bookingNumber}`);
      });
    });
    
    // ===== STEP 4: CONFIRM BOOKING =====
    cy.wait(500);
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Confirm').click();
    });
    cy.verifySuccess('Booking confirmed');
    
    // ===== STEP 5: GENERATE INVOICE =====
    cy.wait(1000);
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Generate Invoice').click();
    });
    cy.verifySuccess('Invoice generated successfully');
    
    // Go to sales page
    cy.visit('/sales');
    cy.wait(500);
    
    // Capture invoice number
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').first().invoke('text').then((text) => {
        invoiceNumber = text.trim();
        cy.log(`Generated Invoice: ${invoiceNumber}`);
      });
    });
    
    // Verify invoice details
    cy.get('table tbody tr').first().within(() => {
      cy.should('contain', farmerName);
      cy.contains('button', 'View').click();
    });
    
    cy.contains('Invoice Details').should('be.visible');
    cy.contains(invoiceNumber).should('be.visible');
    cy.contains('Tomato').should('be.visible');
    cy.contains('Chilli').should('be.visible');
    
    // Close modal
    cy.get('body').type('{esc}');
    
    // ===== STEP 6: RECORD PARTIAL PAYMENT =====
    cy.wait(500);
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Add Payment').click();
    });
    
    cy.fillByLabel('Amount', '1500');
    cy.selectByLabel('Payment Method', 'UPI');
    cy.fillByLabel('Transaction Reference', 'E2E-UPI-12345');
    cy.fillByLabel('Remarks', 'E2E Test - Partial Payment');
    cy.clickButton('Save Payment');
    
    cy.contains('RCP-').should('be.visible');
    cy.verifySuccess('Payment recorded successfully');
    
    // ===== STEP 7: RECORD REMAINING PAYMENT =====
    cy.wait(1000);
    cy.reload();
    cy.wait(500);
    
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Add Payment').click();
    });
    
    // Pay remaining balance
    cy.fillByLabel('Amount', '1300');
    cy.selectByLabel('Payment Method', 'Cash');
    cy.fillByLabel('Remarks', 'E2E Test - Final Payment');
    cy.clickButton('Save Payment');
    
    cy.verifySuccess('Payment recorded successfully');
    
    // Verify invoice is now Paid
    cy.wait(1000);
    cy.reload();
    cy.wait(500);
    cy.get('table tbody tr').first().should('contain', 'Paid');
    
    // ===== STEP 8: SCHEDULE DELIVERY =====
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Schedule Delivery').click();
    });
    
    cy.selectByLabel('Vehicle', 'Tata Ace');
    cy.selectByLabel('Driver', 'Ramesh Kumar');
    cy.fillByLabel('Scheduled Date', '2025-01-20');
    cy.fillByLabel('Delivery Address', 'E2E Test Village, Test District, PIN: 123456');
    cy.fillByLabel('Remarks', 'E2E Test Delivery');
    
    cy.clickButton('Schedule');
    cy.verifySuccess('Delivery scheduled successfully');
    
    // ===== STEP 9: TRACK DELIVERY =====
    cy.visit('/deliveries');
    cy.wait(500);
    
    // Verify delivery appears
    cy.get('table tbody tr').first().should('contain', invoiceNumber);
    cy.get('table tbody tr').first().should('contain', farmerName);
    
    // Capture delivery number
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').first().invoke('text').then((text) => {
        deliveryNumber = text.trim();
        cy.log(`Created Delivery: ${deliveryNumber}`);
      });
    });
    
    // ===== STEP 10: START DELIVERY =====
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Start Delivery').click();
    });
    cy.verifySuccess('Delivery status updated');
    
    // ===== STEP 11: COMPLETE DELIVERY =====
    cy.wait(1000);
    cy.reload();
    cy.wait(500);
    
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Complete').click();
    });
    
    cy.fillByLabel('Delivered Date', '2025-01-20');
    cy.fillByLabel('Receiver Name', farmerName);
    cy.fillByLabel('Remarks', 'E2E Test - Delivery completed successfully');
    cy.clickButton('Complete Delivery');
    
    cy.verifySuccess('Delivery completed successfully');
    
    // ===== VERIFICATION =====
    cy.wait(1000);
    cy.reload();
    cy.wait(500);
    
    // Verify delivery is completed
    cy.get('table tbody tr').first().should('contain', 'Delivered');
    
    // Final success message
    cy.log('✅ Complete E2E Journey Successful!');
    cy.log(`Booking: ${bookingNumber}`);
    cy.log(`Invoice: ${invoiceNumber}`);
    cy.log(`Delivery: ${deliveryNumber}`);
  });

  it('should verify complete transaction in all modules', () => {
    // Check booking exists
    cy.visit('/bookings');
    cy.get('input[type="text"]').first().type(bookingNumber || 'BK-2025');
    cy.wait(500);
    cy.get('table tbody tr').should('have.length.at.least', 1);
    
    // Check invoice exists
    cy.visit('/sales');
    cy.get('input[type="text"]').first().type(invoiceNumber || 'SI-2025');
    cy.wait(500);
    cy.get('table tbody tr').should('have.length.at.least', 1);
    cy.get('table tbody tr').first().should('contain', 'Paid');
    
    // Check delivery exists
    cy.visit('/deliveries');
    cy.get('input[type="text"]').first().type(deliveryNumber || 'DEL-2025');
    cy.wait(500);
    cy.get('table tbody tr').should('have.length.at.least', 1);
    cy.get('table tbody tr').first().should('contain', 'Delivered');
  });
});

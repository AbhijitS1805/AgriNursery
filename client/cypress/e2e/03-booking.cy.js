/// <reference types="cypress" />

describe('Booking System Flow', () => {
  let bookingNumber;
  
  beforeEach(() => {
    cy.visit('/bookings');
  });

  it('should display bookings page with stats', () => {
    cy.contains('h1', 'Bookings').should('be.visible');
    
    // Check stats cards
    cy.contains('Total Bookings').should('be.visible');
    cy.contains('Pending').should('be.visible');
    cy.contains('Confirmed').should('be.visible');
  });

  it('should show booking list', () => {
    cy.get('table').should('be.visible');
    
    // Check headers
    cy.get('table thead').within(() => {
      cy.contains('Booking').should('be.visible');
      cy.contains('Farmer').should('be.visible');
      cy.contains('Date').should('be.visible');
      cy.contains('Amount').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });

  it('should create new booking end-to-end', () => {
    // Click New Booking
    cy.clickButton('New Booking');
    
    // Step 1: Select/Add Farmer
    cy.contains('Select Farmer').should('be.visible');
    
    // Add new farmer
    cy.clickButton('Add New Farmer');
    cy.fillByLabel('Name', `Test Farmer ${Date.now()}`);
    cy.fillByLabel('Mobile', '9876543210');
    cy.fillByLabel('Village', 'Test Village');
    cy.clickButton('Save');
    
    cy.wait(1000);
    
    // Select the farmer
    cy.get('table tbody tr').first().within(() => {
      cy.clickButton('Select');
    });
    
    // Step 2: Add Booking Items
    cy.clickButton('Add Item');
    
    cy.selectByLabel('Crop', 'Tomato');
    cy.fillByLabel('Quantity', '100');
    cy.fillByLabel('Rate', '15');
    
    cy.clickButton('Add');
    
    // Verify item added
    cy.tableContains('Tomato');
    cy.tableContains('100');
    
    // Step 3: Set booking details
    cy.fillByLabel('Expected Delivery Date', '2025-02-15');
    cy.fillByLabel('Advance Amount', '500');
    
    // Step 4: Create booking
    cy.clickButton('Create Booking');
    
    // Verify success
    cy.verifySuccess('Booking created successfully');
    
    // Capture booking number for next tests
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').first().invoke('text').then((text) => {
        bookingNumber = text.trim();
      });
    });
  });

  it('should search bookings by number', () => {
    cy.get('input[type="text"]').first().type('BK-2025');
    
    cy.wait(500);
    
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('should filter by status', () => {
    cy.get('select').first().select('Confirmed');
    
    cy.wait(500);
    
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'Confirmed');
    });
  });

  it('should view booking details', () => {
    // Click first View button
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'View').click();
    });
    
    // Check modal displays details
    cy.contains('Booking Details').should('be.visible');
    cy.contains('Farmer Information').should('be.visible');
    cy.contains('Booking Items').should('be.visible');
  });

  it('should confirm booking', () => {
    // Find a pending booking
    cy.get('select').first().select('Pending');
    cy.wait(500);
    
    // Click confirm on first pending
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Confirm').click();
    });
    
    // Verify success
    cy.verifySuccess('Booking confirmed');
  });
});

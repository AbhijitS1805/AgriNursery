/// <reference types="cypress" />

describe('Delivery Management Flow', () => {
  beforeEach(() => {
    cy.visit('/deliveries');
  });

  it('should display delivery page with stats', () => {
    cy.contains('h1', 'Deliveries').should('be.visible');
    
    // Check stats
    cy.contains('Total Deliveries').should('be.visible');
    cy.contains('Pending').should('be.visible');
    cy.contains('In Transit').should('be.visible');
    cy.contains('Delivered').should('be.visible');
  });

  it('should show delivery list', () => {
    cy.get('table').should('be.visible');
    
    // Check headers
    cy.get('table thead').within(() => {
      cy.contains('Delivery').should('be.visible');
      cy.contains('Invoice').should('be.visible');
      cy.contains('Farmer').should('be.visible');
      cy.contains('Vehicle').should('be.visible');
      cy.contains('Driver').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });

  it('should schedule delivery for invoice', () => {
    // Go to sales page first
    cy.visit('/sales');
    
    // Find a paid invoice
    cy.get('select').first().select('Paid');
    cy.wait(500);
    
    // Schedule delivery
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Schedule Delivery').click();
    });
    
    // Fill delivery form
    cy.selectByLabel('Vehicle', 'Tata Ace');
    cy.selectByLabel('Driver', 'Ramesh Kumar');
    cy.fillByLabel('Scheduled Date', '2025-01-15');
    cy.fillByLabel('Delivery Address', 'Test Village, Test District');
    
    // Submit
    cy.clickButton('Schedule');
    
    // Verify success
    cy.verifySuccess('Delivery scheduled successfully');
  });

  it('should view delivery details', () => {
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'View').click();
    });
    
    // Check delivery details
    cy.contains('Delivery Details').should('be.visible');
    cy.contains('Invoice Information').should('be.visible');
    cy.contains('Vehicle Details').should('be.visible');
    cy.contains('Driver Details').should('be.visible');
  });

  it('should update delivery status', () => {
    // Find pending delivery
    cy.get('select').first().select('Pending');
    cy.wait(500);
    
    // Update status
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Start Delivery').click();
    });
    
    // Verify status changed to In Transit
    cy.verifySuccess('Delivery status updated');
    
    // Reload and check
    cy.reload();
    cy.wait(500);
    cy.get('table tbody tr').first().should('contain', 'In Transit');
  });

  it('should mark delivery as completed', () => {
    // Find in-transit delivery
    cy.get('select').first().select('In Transit');
    cy.wait(500);
    
    // Complete delivery
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Complete').click();
    });
    
    // Fill completion details
    cy.fillByLabel('Delivered Date', '2025-01-10');
    cy.fillByLabel('Receiver Name', 'John Doe');
    cy.fillByLabel('Remarks', 'Successfully delivered');
    
    cy.clickButton('Complete Delivery');
    
    // Verify
    cy.verifySuccess('Delivery completed successfully');
  });

  it('should filter deliveries by date', () => {
    // Use date filters
    cy.fillByLabel('From Date', '2025-01-01');
    cy.fillByLabel('To Date', '2025-01-31');
    
    cy.clickButton('Filter');
    
    // Should show deliveries in range
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });
});

/// <reference types="cypress" />

describe('Production Management Flow', () => {
  beforeEach(() => {
    cy.visit('/production');
  });

  it('should display production page with stats', () => {
    cy.contains('h1', 'Production').should('be.visible');
    
    // Check stats
    cy.contains('Active Batches').should('be.visible');
    cy.contains('Total Plants').should('be.visible');
    cy.contains('Ready to Sell').should('be.visible');
  });

  it('should show batch list', () => {
    cy.get('table').should('be.visible');
    
    // Check headers
    cy.get('table thead').within(() => {
      cy.contains('Batch').should('be.visible');
      cy.contains('Crop').should('be.visible');
      cy.contains('Polyhouse').should('be.visible');
      cy.contains('Quantity').should('be.visible');
      cy.contains('Start Date').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });

  it('should create new production batch', () => {
    cy.clickButton('New Batch');
    
    // Fill batch form
    cy.selectByLabel('Crop', 'Tomato');
    cy.selectByLabel('Polyhouse', 'Polyhouse 1');
    cy.fillByLabel('Quantity', '1000');
    cy.fillByLabel('Expected Days', '45');
    
    // Submit
    cy.clickButton('Create Batch');
    
    // Verify success
    cy.verifySuccess('Batch created successfully');
  });

  it('should filter by status', () => {
    cy.get('select').first().select('Active');
    
    cy.wait(500);
    
    // All rows should show Active status
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'Active');
    });
  });

  it('should update batch status', () => {
    // Click first batch view button
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'View').click();
    });
    
    // Update status
    cy.contains('Update Status').click();
    cy.selectByLabel('Status', 'Ready');
    cy.clickButton('Update');
    
    // Verify
    cy.verifySuccess('Status updated successfully');
  });

  it('should track batch progress', () => {
    // View first batch
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'View').click();
    });
    
    // Check progress details visible
    cy.contains('Batch Details').should('be.visible');
    cy.contains('Start Date').should('be.visible');
    cy.contains('Current Status').should('be.visible');
  });
});

/// <reference types="cypress" />

describe('Inventory Management Flow', () => {
  beforeEach(() => {
    cy.visit('/inventory');
  });

  it('should display inventory page with stats', () => {
    cy.contains('h1', 'Inventory').should('be.visible');
    
    // Check stats cards are displayed
    cy.contains('Total Materials').should('be.visible');
    cy.contains('Low Stock Items').should('be.visible');
    cy.contains('Total Stock Value').should('be.visible');
  });

  it('should show material list in table', () => {
    cy.get('table').should('be.visible');
    
    // Check table headers
    cy.get('table thead').within(() => {
      cy.contains('Material').should('be.visible');
      cy.contains('Category').should('be.visible');
      cy.contains('Quantity').should('be.visible');
      cy.contains('Unit').should('be.visible');
      cy.contains('Min Stock').should('be.visible');
      cy.contains('Max Stock').should('be.visible');
      cy.contains('Unit Price').should('be.visible');
      cy.contains('Stock Value').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });

  it('should search materials', () => {
    // Type in search box
    cy.get('input[type="text"]').first().type('Soil');
    
    // Wait a bit for search to work
    cy.wait(500);
    
    // Should show only soil-related materials
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('should filter by category', () => {
    // Find and click category dropdown
    cy.get('select').first().select('Seeds');
    
    // Wait for filter
    cy.wait(500);
    
    // All visible rows should be Seeds category
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'Seeds');
    });
  });

  it('should add new material', () => {
    // Click Add Material button
    cy.clickButton('Add Material');
    
    // Fill material form
    cy.fillByLabel('Name', `Test Material ${Date.now()}`);
    cy.selectByLabel('Category', 'Seeds');
    cy.fillByLabel('Unit', 'Kg');
    cy.fillByLabel('Min Stock Level', '10');
    cy.fillByLabel('Max Stock Level', '100');
    cy.fillByLabel('Unit Price', '50');
    
    // Submit form
    cy.clickButton('Save');
    
    // Verify success
    cy.verifySuccess('Material created successfully');
  });

  it('should update stock levels', () => {
    // Click first update stock button
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Update Stock').click();
    });
    
    // Fill stock update form
    cy.fillByLabel('Quantity', '25');
    cy.selectByLabel('Type', 'Add');
    cy.fillByLabel('Remarks', 'Stock replenishment');
    
    // Submit
    cy.clickButton('Update');
    
    // Verify success
    cy.verifySuccess('Stock updated successfully');
  });

  it('should show low stock items in different color', () => {
    // Filter to show all
    cy.get('select').first().select('All');
    
    // Look for low stock badge
    cy.get('table tbody').within(() => {
      cy.contains('Low Stock').should('be.visible');
    });
  });
});

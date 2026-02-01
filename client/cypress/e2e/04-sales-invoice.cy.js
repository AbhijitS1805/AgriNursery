/// <reference types="cypress" />

describe('Sales and Invoice Flow', () => {
  let invoiceNumber;
  
  beforeEach(() => {
    cy.visit('/sales');
  });

  it('should display sales page with stats', () => {
    cy.contains('h1', 'Sales & Invoices').should('be.visible');
    
    // Check stats
    cy.contains('Total Invoices').should('be.visible');
    cy.contains('Total Sales').should('be.visible');
    cy.contains('Paid').should('be.visible');
    cy.contains('Pending').should('be.visible');
  });

  it('should show invoice list', () => {
    cy.get('table').should('be.visible');
    
    // Check headers
    cy.get('table thead').within(() => {
      cy.contains('Invoice').should('be.visible');
      cy.contains('Booking').should('be.visible');
      cy.contains('Farmer').should('be.visible');
      cy.contains('Date').should('be.visible');
      cy.contains('Total').should('be.visible');
      cy.contains('Paid').should('be.visible');
      cy.contains('Balance').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });

  it('should generate invoice from booking', () => {
    // Go to bookings first
    cy.visit('/bookings');
    
    // Find a confirmed booking
    cy.get('select').first().select('Confirmed');
    cy.wait(500);
    
    // Generate invoice
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Generate Invoice').click();
    });
    
    // Verify success
    cy.verifySuccess('Invoice generated successfully');
    
    // Go back to sales
    cy.visit('/sales');
    
    // Verify new invoice appears
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('should view invoice details', () => {
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'View').click();
    });
    
    // Check invoice modal
    cy.contains('Invoice Details').should('be.visible');
    cy.contains('Invoice Number:').should('be.visible');
    cy.contains('Farmer Details').should('be.visible');
    cy.contains('Items').should('be.visible');
    cy.contains('Payment Summary').should('be.visible');
    
    // Capture invoice number
    cy.get('body').invoke('text').then((text) => {
      const match = text.match(/SI-\d{4}-\d{4}/);
      if (match) invoiceNumber = match[0];
    });
  });

  it('should search invoices', () => {
    cy.get('input[type="text"]').first().type('SI-2025');
    
    cy.wait(500);
    
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('should filter by payment status', () => {
    cy.get('select').first().select('Paid');
    
    cy.wait(500);
    
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'Paid');
    });
  });

  it('should show invoice with pending balance', () => {
    cy.get('select').first().select('Partial');
    cy.wait(500);
    
    // Should show invoices with balance
    cy.get('table tbody').within(() => {
      cy.contains('Partial').should('be.visible');
    });
  });
});

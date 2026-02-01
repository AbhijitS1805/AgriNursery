/// <reference types="cypress" />

describe('Payment Recording Flow', () => {
  beforeEach(() => {
    cy.visit('/sales');
  });

  it('should record payment for invoice', () => {
    // Find an invoice with pending balance
    cy.get('select').first().select('Partial');
    cy.wait(500);
    
    // Click Add Payment on first invoice
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Add Payment').click();
    });
    
    // Fill payment form
    cy.fillByLabel('Amount', '1000');
    cy.selectByLabel('Payment Method', 'Cash');
    cy.fillByLabel('Payment Date', '2025-01-10');
    cy.fillByLabel('Remarks', 'Part payment received');
    
    // Submit
    cy.clickButton('Save Payment');
    
    // Verify success with receipt number
    cy.contains('RCP-').should('be.visible');
    cy.verifySuccess('Payment recorded successfully');
  });

  it('should support different payment methods', () => {
    // Open payment modal
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Add Payment').click();
    });
    
    // Check all payment methods available
    cy.get('select').contains('option', 'Cash').should('exist');
    cy.get('select').contains('option', 'UPI').should('exist');
    cy.get('select').contains('option', 'Bank Transfer').should('exist');
    cy.get('select').contains('option', 'Cheque').should('exist');
    cy.get('select').contains('option', 'Card').should('exist');
  });

  it('should record full payment', () => {
    // Filter pending invoices
    cy.get('select').first().select('Pending');
    cy.wait(500);
    
    // Get invoice total amount
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').eq(4).invoke('text').then((total) => {
        const amount = total.replace('₹', '').replace(',', '').trim();
        
        // Click Add Payment
        cy.contains('button', 'Add Payment').click();
        
        // Outside within, fill the form
        cy.get('body').within(() => {
          cy.fillByLabel('Amount', amount);
          cy.selectByLabel('Payment Method', 'UPI');
          cy.fillByLabel('Transaction Reference', 'UPI123456789');
          cy.clickButton('Save Payment');
        });
      });
    });
    
    // Verify payment success
    cy.verifySuccess('Payment recorded successfully');
    
    // Invoice should now be Paid
    cy.reload();
    cy.wait(500);
    cy.get('table tbody tr').first().should('contain', 'Paid');
  });

  it('should view payment history in invoice', () => {
    // Open invoice details
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'View').click();
    });
    
    // Check payment history section
    cy.contains('Payment History').should('be.visible');
    
    // Should show payment details
    cy.contains('Receipt No').should('be.visible');
    cy.contains('Amount').should('be.visible');
    cy.contains('Method').should('be.visible');
  });

  it('should validate payment amount', () => {
    // Open payment modal
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Add Payment').click();
    });
    
    // Try to enter more than balance
    cy.fillByLabel('Amount', '999999');
    cy.selectByLabel('Payment Method', 'Cash');
    cy.clickButton('Save Payment');
    
    // Should show error or prevent
    cy.get('body').should('contain.text', 'amount');
  });

  it('should generate receipt with number', () => {
    // Record a payment
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', 'Add Payment').click();
    });
    
    cy.fillByLabel('Amount', '500');
    cy.selectByLabel('Payment Method', 'Cash');
    cy.clickButton('Save Payment');
    
    // Verify receipt number format
    cy.contains(/RCP-\d{4}-\d{4}/).should('be.visible');
  });
});

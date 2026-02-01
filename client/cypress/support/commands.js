// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to fill input by label
Cypress.Commands.add('fillByLabel', (label, value) => {
  cy.contains('label', label)
    .parent()
    .find('input, select, textarea')
    .clear()
    .type(value);
});

// Custom command to select from dropdown by label
Cypress.Commands.add('selectByLabel', (label, value) => {
  cy.contains('label', label)
    .parent()
    .find('select')
    .select(value);
});

// Custom command to click button by text
Cypress.Commands.add('clickButton', (text) => {
  cy.contains('button', text).click();
});

// Custom command to wait for API response
Cypress.Commands.add('waitForApi', (alias) => {
  cy.wait(alias).its('response.statusCode').should('eq', 200);
});

// Custom command to check table contains text
Cypress.Commands.add('tableContains', (text) => {
  cy.get('table').contains(text).should('be.visible');
});

// Custom command to get API URL
Cypress.Commands.add('apiUrl', (endpoint) => {
  return `${Cypress.env('apiUrl')}${endpoint}`;
});

// Custom command to verify success message
Cypress.Commands.add('verifySuccess', (message) => {
  cy.contains(message).should('be.visible');
});

// Custom command to verify error message
Cypress.Commands.add('verifyError', (message) => {
  cy.contains(message).should('be.visible');
});

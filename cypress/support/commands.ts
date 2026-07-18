/// <reference types="cypress" />

Cypress.Commands.add('loginAs', (username: string, password: string) => {
  cy.visit('/login');
  cy.get('input[formControlName="username"]').clear().type(username);
  cy.get('input[formControlName="password"]').clear().type(password);
  cy.contains('button', 'Ingresar').click();
  cy.url().should('include', '/summary');
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(username: string, password: string): Chainable<void>;
    }
  }
}

export {};


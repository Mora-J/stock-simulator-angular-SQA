describe('CP-20: Escenario de Aceptación - Transferencia de Acciones', () => {
  it('Debe permitir a investor01 transferir 5 MSFT a usuario_admin', () => {
    cy.loginAs('investor01', 'Password123');

    // Precondición: investor01 ya tiene MSFT
    cy.contains('.item', 'Consulta de Acciones').click();
    cy.url().should('include', '/summary');
    cy.get('mat-tab-group [role="tab"]').contains('Acciones Adquiridas').click();
    cy.contains('MSFT').should('exist');

    // Ir a transferencia
    cy.contains('.item', 'Transferencia de Acciones').click();
    cy.url().should('include', '/transfer');
    cy.contains('Transferencia de Acciones').should('be.visible');

    cy.get('input[formControlName="ticker"]')
      .scrollIntoView()
      .click()
      .type('MSFT');

    cy.get('input[formControlName="amount"]')
      .scrollIntoView()
      .click()
      .type('5');

    cy.get('input[formControlName="receptor"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click();

    cy.get('input[formControlName="receptor"]')
      .type('investor02')
      .blur();

    cy.get('input[formControlName="receptor"]').should('have.value', 'investor02');

    cy.intercept('POST', 'http://localhost:8080/api/transaction/transfer').as('transfer');
    cy.contains('button', 'Continuar').should('not.be.disabled').click();

    cy.contains('button', 'Transferir').should('be.visible').click();
    cy.wait('@transfer').its('response.statusCode').should('eq', 200);

    cy.contains('¡Su operación ha sido exitosa!').should('be.visible');

    cy.contains('.item', 'Consulta de Acciones').click();
    cy.url().should('include', '/summary');
    cy.get('mat-tab-group [role="tab"]').contains('Transacciones').click();

    cy.contains('Transferencia').should('be.visible');
    cy.contains('MSFT').should('exist');
    cy.contains('investor02').should('exist');
  });
});
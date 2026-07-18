describe('CP-23: Sobregiro bursátil', () => {
  it('Muestra error al intentar vender más acciones de las que posee', () => {
    cy.loginAs('investor01', 'Password123');

    cy.contains('.item', 'Venta de Acciones').click();
    cy.url().should('include', '/sell');

    cy.get('input[formControlName="ticker"]').type('MSFT');
    cy.get('input[formControlName="amount"]').type('500');
    cy.get('input[formControlName="email"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click()
      .type('investor01@example.com');

    cy.contains('button', 'Continuar').should('be.disabled');
    cy.contains('No posee suficientes acciones').should('be.visible');
    
  });
});
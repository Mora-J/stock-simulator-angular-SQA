describe('CP-17: Rechazo exacto por CVC incorrecto', () => {
  it('Muestra validación de CVC y no deja continuar', () => {
    cy.loginAs('investor01', 'Password123');

    cy.contains('.item', 'Compra de Acciones').click();
    cy.url().should('include', '/buy');

    cy.get('input[formControlName="ticker"]').type('MSFT');
    cy.get('input[formControlName="amount"]').type('1');

    cy.get('input[formControlName="cardNumber"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click()
      .type('4111111111111111');

    cy.get('input[formControlName="expirationDate"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click()
      .type('12/28');

    cy.get('input[formControlName="cvc"]').type('12');
    cy.get('body').click(0, 0);
    cy.contains('El CVC debe contener 3 dígitos', { timeout: 10000 }).should('be.visible');

    cy.contains('button', 'Continuar').should('be.disabled');
  });
});
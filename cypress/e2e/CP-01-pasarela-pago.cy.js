describe('CP-01: Validar pasarela de pago VISA vs Amex/Mastercard', () => {
  it('Rechaza tarjeta no-VISA y muestra error de validación', () => {
    cy.loginAs('investor01', 'Password123');

    cy.contains('.item', 'Compra de Acciones').click();
    cy.url().should('include', '/buy');

    cy.get('input[formControlName="ticker"]').type('MSFT');
    cy.get('input[formControlName="amount"]').type('1');

    cy.get('input[formControlName="cardNumber"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click()
      .type('5111111111111111');

    cy.get('input[formControlName="expirationDate"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click()
      .type('12/28');

    cy.get('input[formControlName="cvc"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click()
      .type('123');

    cy.contains('button', 'Continuar').click();

    cy.contains('Tarjeta VISA inválida').should('be.visible');
  });
});
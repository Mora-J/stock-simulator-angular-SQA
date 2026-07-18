describe('CP-03: Bloqueo por rol Unverified', () => {
  it('No permite operar a un usuario no verificado en /buy', () => {
    cy.loginAs('unverified01', 'Password123');

    cy.contains('.item', 'Compra de Acciones').click();
    cy.url().should('include', '/buy');

    cy.contains('El usuario no ha sido verificado, por favor revise su correo electrónico')
      .should('be.visible');
  });

  it('No permite operar a un usuario no verificado en /sell', () => {
    cy.loginAs('unverified01', 'Password123');

    cy.contains('.item', 'Venta de Acciones').click();
    cy.url().should('include', '/sell');

    cy.contains('El usuario no ha sido verificado, por favor revise su correo electrónico')
      .should('be.visible');
  });
});
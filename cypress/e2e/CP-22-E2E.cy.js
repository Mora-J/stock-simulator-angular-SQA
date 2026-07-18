describe('CP-22: Escenario End-to-End Bursátil', () => {

  it('Debe iniciar sesión, comprar MSFT, vender 5 y consultar historial', () => {
    // 1. LOGIN
    cy.visit('http://localhost:4200/login');

    cy.get('input[formControlName="username"]').type('investor01');
    cy.get('input[formControlName="password"]').type('Password123');
    cy.intercept('POST', 'http://localhost:8080/api/user/login').as('login');
    cy.contains('button', 'Ingresar').click();

    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.url().should('include', '/summary');
    cy.contains('Consulta de Acciones').should('be.visible');
    cy.contains('Bienvenido,').should('be.visible');

    // 2. COMPRA DE ACCIONES
    cy.contains('.item', 'Compra de Acciones').click();
    cy.url().should('include', '/buy');
    cy.contains('Compra de Acciones').should('be.visible');

    cy.get('input[formControlName="ticker"]').type('MSFT');
    cy.get('input[formControlName="amount"]').type('10');
    cy.get('input[formControlName="cardNumber"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click();

    cy.get('input[formControlName="cardNumber"]')
      .type('4111111111111111');

    cy.get('input[formControlName="expirationDate"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click();

    cy.get('input[formControlName="expirationDate"]')
      .type('12/28');

    cy.get('input[formControlName="cvc"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click();

    cy.get('input[formControlName="cvc"]')
      .type('123');
    cy.contains('button', 'Continuar').click();

    cy.contains('button', 'Comprar').should('be.visible').click();
    cy.contains('¡Su operación ha sido exitosa!').should('be.visible');

    // 3. VENTA DE ACCIONES
    cy.contains('.item', 'Venta de Acciones').click();
    cy.url().should('include', '/sell');
    cy.contains('Venta de Acciones').should('be.visible');

    cy.get('input[formControlName="ticker"]').type('MSFT');
    cy.get('input[formControlName="amount"]').type('5');
    cy.get('input[formControlName="email"]')
      .scrollIntoView()
      .parents('mat-form-field')
      .click();

    cy.get('input[formControlName="email"]')
      .type('admin@example.com');
    cy.contains('button', 'Continuar').click();

    cy.contains('button', 'Vender').should('be.visible').click();
    cy.contains('¡Su operación ha sido exitosa!').should('be.visible');

    // 4. CONSULTAR HISTORIAL
    cy.contains('.item', 'Consulta de Acciones').click();
    cy.url().should('include', '/summary');
    cy.contains('Consulta de Acciones').should('be.visible');

    cy.get('mat-tab-group [role="tab"]').eq(2).click();

    cy.contains('Ticker').should('be.visible');
    cy.contains('MSFT').should('exist');
  });
});
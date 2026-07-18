import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    viewportWidth: 1280, // Ajustado para resolución WHD+
    viewportHeight: 720,
    baseUrl: 'http://localhost:4200', // URL base de Angular
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
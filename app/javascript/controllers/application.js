import { Application } from "@hotwired/stimulus";

// Create the Stimulus application instance (without starting it)
// The application will be started in index.js after all controllers are registered
const application = new Application();

// Configure application
application.debug = false;
window.Stimulus = application;

export { application };

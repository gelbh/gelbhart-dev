import { Application } from "@hotwired/stimulus";

// Create application instance but don't start it yet
// It will be started in index.js after all controllers are registered
const application = new Application();

// Configure Stimulus development experience
application.debug = false;

window.Stimulus = application;

export { application };

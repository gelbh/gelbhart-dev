import { Application } from "@hotwired/stimulus";

const application = Application.start();

// Configure Stimulus development experience
application.debug = false;

// Disable automatic lazy-loading - all controllers are eagerly loaded in index.js
application.loadDefinitionsFromContext = false;

window.Stimulus = application;

export { application };

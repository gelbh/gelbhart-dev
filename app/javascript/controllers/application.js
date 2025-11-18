import { Application } from "@hotwired/stimulus";

const application = Application.start();

application.debug = false;

// Override Stimulus lazy-loading to prevent 404 errors
// All controllers are eagerly loaded and registered in index.js
// This prevents Stimulus from attempting to fetch controllers via HTTP
if (application.load) {
  const originalLoad = application.load.bind(application);
  application.load = function (identifier) {
    // Check if controller is already registered
    const registered = this.router.modules?.get(identifier);
    if (registered) {
      return Promise.resolve(registered);
    }
    // Prevent lazy-loading - return null instead of fetching
    console.warn(
      `Stimulus controller "${identifier}" not found. Ensure it's registered in controllers/index.js`
    );
    return Promise.resolve(null);
  };
}

window.Stimulus = application;

export { application };

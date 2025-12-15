const path = require("path");
const fs = require("fs");

// Find the compiled CSS file with fingerprint
function findCompiledCSS() {
  const assetsDir = path.join(__dirname, "..", "public", "assets");
  if (!fs.existsSync(assetsDir)) {
    return [];
  }
  const files = fs
    .readdirSync(assetsDir)
    .filter(
      (file) =>
        file.startsWith("application-") &&
        file.endsWith(".css") &&
        !file.endsWith(".backup")
    )
    .map((file) => path.join(assetsDir, file));
  return files;
}

const cssFiles = findCompiledCSS();

// If no files found, use glob pattern (for initial setup)
const cssConfig =
  cssFiles.length > 0 ? cssFiles : ["./public/assets/application-*.css"];

module.exports = {
  content: [
    "./app/views/**/*.html.erb",
    "./app/views/**/*.erb",
    "./app/helpers/**/*.rb",
    "./app/javascript/**/*.js",
    "./app/assets/stylesheets/**/*.scss",
    "./config/importmap.rb",
  ],
  css: cssConfig,
  defaultExtractor: (content) =>
    content.match(/[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g) || [],
  safelist: [
    // Classes dynamically added via JavaScript that can't be detected in static files
    "visible", // Added by scroll_controller.js
    "show", // Added by scroll-top-button.js
    "active", // Toggled by game_controller.js, ui_manager.js
    "navbar-stuck", // Added by sticky-navbar.js
    "error", // Added by ui_manager.js
    "muted", // Toggled by ui_manager.js
    // Bootstrap utility classes that are toggled dynamically
    "d-none", // Toggled by theme_controller.js, lazy_iframe_controller.js
    // Icon classes (dynamically inserted)
    // Note: Boxicons subset (~6KB) is included in application.css with only used icons
    // No need to safelist all bx- classes - only safelist if icons are dynamically added via JS
    /^bi-/, // Bootstrap Icons
    /^fi-/, // Flag icons
    // Custom project classes that are dynamically generated
    /^fade-in-view/, // Animation classes
    /^delay-/, // Animation delay classes
    /^nasa-exoplanet-explorer-/, // Project-specific classes
    /^hevy-tracker-/, // Project-specific classes
    /^video-captioner-/, // Project-specific classes
    /^pacman-/, // Pacman game classes (many dynamically added)
    /^btn-scroll-top/, // Scroll to top button
    // Pacman game state classes (dynamically added)
    "flip-horizontal",
    "frightened",
    "eaten",
    "collected",
    "fade-out",
    "unlocking",
    "powered",
    "speed-boost",
    "slow-down",
    "shielded",
    "frozen",
    "double-points",
    "pacman-game-active",
    "pacman-hover",
    "boundary-flash",
  ],
  blocklist: [
    // Exclude development-only classes
    /^debug-/,
    /^rails-/,
    // Exclude test-specific classes
    /^test-/,
    /^spec-/,
    // Exclude print media queries (if not needed)
    // Uncomment if you want to exclude print styles:
    // /@media print/,
  ],
  fontFace: true,
  keyframes: true,
  variables: true,
};

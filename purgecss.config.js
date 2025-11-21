const path = require("path");
const fs = require("fs");

// Find the compiled CSS file with fingerprint
function findCompiledCSS() {
  const assetsDir = path.join(__dirname, "public", "assets");
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
    // Bootstrap classes that might be dynamically added
    /^btn-/,
    /^alert-/,
    /^badge-/,
    /^bg-/,
    /^text-/,
    /^border-/,
    /^shadow-/,
    /^rounded-/,
    /^d-/,
    /^flex-/,
    /^justify-content-/,
    /^align-items-/,
    /^gap-/,
    /^m[tyblr]?-/,
    /^p[tyblr]?-/,
    /^w-/,
    /^h-/,
    /^position-/,
    /^top-/,
    /^start-/,
    /^end-/,
    /^bottom-/,
    /^translate-/,
    /^zindex-/,
    /^opacity-/,
    /^fs-/,
    /^lh-/,
    /^fw-/,
    // Turbo/Stimulus attributes
    /^data-/,
    /^aria-/,
    // Custom classes that might be dynamically generated
    /^fade-in-view/,
    /^delay-/,
    /^nasa-exoplanet-explorer-/,
    /^hevy-tracker-/,
    /^video-captioner-/,
    /^pacman-/,
    /^btn-scroll-top/,
    // Icon classes
    /^bx-/,
    /^bi-/,
    // Flag icons
    /^fi-/,
    // Theme classes
    /^theme-/,
    /^dark-/,
    /^light-/,
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

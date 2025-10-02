# Asset version for cache busting
Rails.application.config.assets.version = "1.0"

# Configure asset pipeline behavior
Rails.application.config.assets.digest = true

# Add asset paths grouped by type
Rails.application.config.assets.paths += [
  # Application assets
  Rails.root.join("app/javascript"),
  Rails.root.join("app/assets/fonts"),
  Rails.root.join("app/assets/builds"),
  Rails.root.join("app/assets/json"),

  # NPM package assets
  Rails.root.join("node_modules"),
  Rails.root.join("node_modules/bootstrap/scss")
]

# Precompile rules grouped by type
Rails.application.config.assets.precompile += [
  # Font files
  ".eot",
  ".woff",
  ".woff2",
  ".ttf",

  # Image files
  ".svg",
  ".png",
  ".jpg",
  ".gif",

  # Audio files
  ".wav",
  ".mp3",
  ".ogg",

  # JavaScript files
  "application.js",
  "bootstrap.min.js",
  "theme/*.js",

  # CSS files
  "*.css",
  "application.bootstrap.css"
].flatten

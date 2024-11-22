# Version of your assets
Rails.application.config.assets.version = "1.0"

# Add asset paths
Rails.application.config.assets.paths << Rails.root.join("node_modules")
Rails.application.config.assets.paths << Rails.root.join("app/assets/fonts")
Rails.application.config.assets.paths << Rails.root.join("vendor/javascripts")
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/stylesheets")
Rails.application.config.assets.paths << Rails.root.join("app/assets/builds")
Rails.application.config.assets.paths << Rails.root.join("app/javascript")

# Precompile additional assets
Rails.application.config.assets.precompile += %w[
  .svg .eot .woff .ttf .woff2 .png .jpg .gif
  application.js
  bootstrap.min.js
  theme/*.js
  *.css
  application.bootstrap.css
]

# Allow non-digest files for fonts
Rails.application.config.assets.compile = true
Rails.application.config.assets.digest = true

# Specify node_modules as additional sprockets load path
Rails.application.config.assets.paths << Rails.root.join("node_modules/bootstrap/scss")

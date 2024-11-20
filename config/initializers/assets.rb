Rails.application.config.assets.paths << Rails.root.join("node_modules")
Rails.application.config.assets.paths << Rails.root.join("app/assets/fonts")
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/javascripts")
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/stylesheets")

# Add additional assets to precompile
Rails.application.config.assets.precompile += %w[
  .svg .eot .woff .woff2 .ttf
  *.js
]

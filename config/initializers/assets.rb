Rails.application.config.assets.paths << Rails.root.join("node_modules")
Rails.application.config.assets.paths << Rails.root.join("app/assets/fonts")
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/javascripts")
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/stylesheets")

# Add additional assets to precompile
Rails.application.config.assets.precompile += %w[ .svg .eot .woff .ttf .woff2 .png .jpg .gif ]
Rails.application.config.assets.precompile += %w[ application.js bootstrap.min.js ]

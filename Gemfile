# frozen_string_literal: true

source "https://rubygems.org"

# Core framework
gem "rails", "~> 8.1.0"

# Server
gem "puma", ">= 5.0"
gem "webrick"

# Database
gem "pg"

# Asset pipeline
gem "bootstrap", "~> 5.3.0"
gem "dartsass-rails"
gem "importmap-rails"
gem "sprockets-rails"
gem "stimulus-rails"
gem "terser"
gem "turbo-rails"

# API & JSON
gem "jbuilder"
gem "rack-cors"

# External services
gem "google-analytics-data"
gem "googleauth"

# Utilities
gem "bootsnap", require: false
gem "email_address", "~> 0.2"
gem "image_processing", "~> 1.2"
gem "mini_racer"
gem "rack-attack", "~> 6.6"
gem "rexml"
gem "sitemap_generator", "~> 6.1"

# Platform-specific
gem "tzinfo-data", platforms: %i[windows jruby]

group :development, :test do
  gem "brakeman", require: false
  gem "debug", platforms: %i[mri windows], require: "debug/prelude"
  gem "rubocop-rails-omakase", require: false
end

group :development do
  gem "dotenv-rails"
  gem "error_highlight", ">= 0.4.0", platforms: [ :ruby ]
  gem "htmlbeautifier"
  gem "hotwire-livereload"
  gem "solargraph"
  gem "web-console"
end

group :test do
  gem "capybara"
  gem "factory_bot_rails"
  gem "faker"
  gem "mocha"
  gem "selenium-webdriver"
  gem "shoulda-matchers"
  gem "simplecov", require: false
  gem "webmock"
end

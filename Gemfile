source "https://rubygems.org"

gem "rails", "~> 8.1.0"
gem "sprockets-rails"
gem "sassc-rails"
gem "bootstrap", "~> 5.3.0"
gem "terser"
gem "pg"
gem "puma", ">= 5.0"
gem "importmap-rails"
gem "turbo-rails"
gem "stimulus-rails"
gem "jbuilder"
gem "rack-cors"
gem "google-analytics-data"
gem "googleauth"
gem "webrick"
gem "image_processing", "~> 1.2"
gem "sitemap_generator", "~> 6.1"

gem "mini_racer"

gem "tzinfo-data", platforms: %i[ windows jruby ]
gem "bootsnap", require: false

group :development, :test do
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"
  gem "brakeman", require: false
  gem "rubocop-rails-omakase", require: false
  gem "dotenv-rails"
end

group :development do
  gem "web-console"
  gem "error_highlight", ">= 0.4.0", platforms: [ :ruby ]
  gem "solargraph"
  gem "htmlbeautifier"
end

group :test do
  gem "capybara"
  gem "selenium-webdriver"
  gem "simplecov", require: false
  gem "factory_bot_rails"
  gem "faker"
  gem "shoulda-matchers"
  gem "webmock"
  gem "mocha"
end

gem "email_address", "~> 0.2"

gem "rack-attack", "~> 6.6"

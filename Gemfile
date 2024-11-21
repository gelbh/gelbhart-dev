source "https://rubygems.org"

gem "rails", "~> 8.0.0"
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

gem "tzinfo-data", platforms: %i[ windows jruby ]

# gem "solid_cache"
# gem "solid_queue"
# gem "solid_cable"
#
gem "bootsnap", require: false
gem "dockerfile-rails", ">= 1.6", group: :development

gem "kamal", require: false

gem "thruster", require: false

group :development, :test do
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"

  gem "brakeman", require: false

  gem "rubocop-rails-omakase", require: false
end

group :development do
  gem "web-console"
  gem "error_highlight", ">= 0.4.0", platforms: [ :ruby ]
end

group :test do
  gem "capybara"
  gem "selenium-webdriver"
end

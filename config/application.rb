require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module GelbhartDev
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Configuration for the application, engines, and railties goes here.
    config.autoloader = :zeitwerk

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Use Sprockets for asset pipeline
    config.assets.initialize_on_precompile = false

    # Use Ruby schema format (Rails default)
    # Optional PostgreSQL extensions are handled conditionally in migrations
    config.active_record.schema_format = :ruby

    config.exceptions_app = self.routes

    config.action_dispatch.default_headers.merge!(
      "X-Frame-Options" => "DENY",
      "X-Content-Type-Options" => "nosniff",
      "X-XSS-Protection" => "1; mode=block",
      "Referrer-Policy" => "strict-origin-when-cross-origin"
    )

    # Add Rack::Attack middleware
    config.middleware.use Rack::Attack
  end
end

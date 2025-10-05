require "ipaddr"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot. This eager loads most of Rails and
  # your application in memory, allowing both threaded web servers
  # and those relying on copy on write to perform better.
  # Rake tasks automatically ignore this option for performance.
  config.eager_load = true

  # Full error reports are disabled and caching is turned on.
  config.consider_all_requests_local = false
  config.action_controller.perform_caching = true

  # Ensures that a master key has been made available in ENV["RAILS_MASTER_KEY"], config/master.key, or an environment
  # key such as config/credentials/production.key. This key is used to decrypt credentials (and other encrypted files).
  # config.require_master_key = true

  # Disable serving static files from `public/`, relying on nginx/apache to do so instead.
  config.public_file_server.enabled = true

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Specifies the header that your server uses for sending files.
  # config.action_dispatch.x_sendfile_header = "X-Sendfile" # for Apache
  # config.action_dispatch.x_sendfile_header = "X-Accel-Redirect" # for NGINX

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  # Can be used together with config.force_ssl for Strict-Transport-Security and secure cookies.
  # config.assume_ssl = true

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # Log to STDOUT by default
  config.logger = ActiveSupport::Logger.new(STDOUT)
    .tap  { |logger| logger.formatter = ::Logger::Formatter.new }
    .then { |logger| ActiveSupport::TaggedLogging.new(logger) }

  # Prepend all log lines with the following tags.
  config.log_tags = [ :request_id ]

  # Info include generic and useful information about system operation, but avoids logging too much
  # information to avoid inadvertent exposure of personally identifiable information (PII). If you
  # want to log everything, set the level to "debug".
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Use a different cache store in production.
  # config.cache_store = :mem_cache_store

  # Use a real queuing backend for Active Job (and separate queues per environment).
  # config.active_job.queue_adapter = :resque
  # config.active_job.queue_name_prefix = "gelbhart_dev_production"

  # Store uploaded files on the local file system (see config/storage.yml for options).
  config.active_storage.service = :local

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Enable DNS rebinding protection and other `Host` header attacks.
  config.hosts = [
    "gelbhart.dev",
    "www.gelbhart.dev",
    /.*\.render\.com\z/,
    /.*\.onrender\.com\z/
  ]

  # Asset pipeline configuration
  # Enable compilation as fallback for importmap JavaScript files
  config.assets.compile = true
  config.assets.css_compressor = :sass
  
  # Configure Terser to support modern ES6+ syntax
  config.assets.js_compressor = Terser.new(
    compress: {
      ecma: 2015,  # Support ES6/ES2015 syntax
      warnings: false
    },
    mangle: {
      eval: true
    },
    output: {
      ecma: 2015,  # Support ES6/ES2015 syntax in output
      comments: false
    }
  )
  
  config.assets.digest = true
  config.assets.version = "1.0"
  config.assets.debug = false
  config.assets.quiet = true

  config.public_file_server.headers = {
    "Cache-Control" => "public, max-age=31536000, immutable",
    "Expires" => 1.year.from_now.to_formatted_s(:rfc822),
    "Access-Control-Allow-Origin" => "*",
    "Access-Control-Allow-Methods" => "GET",
    "Access-Control-Allow-Headers" => "x-requested-with",
    "Connection" => "keep-alive",
    "Keep-Alive" => "timeout=5, max=100"
  }

  # Add CORS headers for font files
  config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins "gelbhart.dev", "www.gelbhart.dev", /https:\/\/.*\.render\.com\z/, /https:\/\/.*\.onrender\.com\z/
      resource "/assets/*",
        headers: :any,
        methods: [ :get ]
    end
  end

  # Enable asset host for CDN support
  # Use CDN for assets to reduce load on the main server
  config.asset_host = ENV['ASSET_HOST'] if ENV['ASSET_HOST'].present?

  # Alternative: Use the main domain with Cloudflare caching
  # Cloudflare will automatically cache /assets/* paths
  # No additional configuration needed if using Cloudflare as your DNS

  # Enable Rack::Cache to put a simple HTTP cache in front of your application
  # Add `rack-cache` to your Gemfile before enabling this.
  # For large-scale production use, consider using a caching reverse proxy like
  # NGINX, varnish or squid.
  # config.action_dispatch.rack_cache = true

  # Enable Action Cable broadcasting
  # config.action_cable.allowed_request_origins = [ 'http://example.com', /http:\/\/example.*/ ]
  # config.action_cable.url = 'wss://example.com/cable'
  # config.action_cable.mount_path = nil

  # Disable Action Mailer's delivery method setting
  # Configure Action Mailer for production
  config.action_mailer.delivery_method = :smtp
  config.action_mailer.perform_deliveries = true
  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.default_url_options = { host: "gelbhart.dev", protocol: "https" }
  
  # SMTP settings - configure via environment variables
  # Set these in your Render dashboard or hosting platform:
  # SMTP_ADDRESS, SMTP_PORT, SMTP_DOMAIN, SMTP_USERNAME (or SMTP_USER), SMTP_PASSWORD (or SMTP_PASS)
  config.action_mailer.smtp_settings = {
    address: ENV.fetch("SMTP_ADDRESS", "smtp.gmail.com"),
    port: ENV.fetch("SMTP_PORT", 587).to_i,
    domain: ENV.fetch("SMTP_DOMAIN", "gelbhart.dev"),
    user_name: ENV["SMTP_USERNAME"] || ENV["SMTP_USER"],
    password: ENV["SMTP_PASSWORD"] || ENV["SMTP_PASS"],
    authentication: :plain,
    enable_starttls_auto: true
  }
end

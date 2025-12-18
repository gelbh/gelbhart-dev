require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Core Settings
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false

  # Caching
  config.action_controller.perform_caching = true
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }

  # Storage
  config.active_storage.service = :local

  # Security
  config.hosts = [
    "gelbhart.dev",
    "www.gelbhart.dev",
    /.*\.render\.com\z/,
    /.*\.onrender\.com\z/
  ]

  # Logging
  config.log_tags = [ :request_id ]
  config.logger = ActiveSupport::TaggedLogging.logger(STDOUT)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.silence_healthcheck_path = "/up"
  config.active_support.report_deprecations = false

  # Mailer
  config.action_mailer.default_url_options = {
    host: "gelbhart.dev",
    protocol: "https"
  }

  # Internationalization
  config.i18n.fallbacks = true

  # Database
  config.active_record.dump_schema_after_migration = false
  config.active_record.attributes_for_inspect = [ :id ]

  # Asset Pipeline
  # Disable runtime compilation - all assets should be precompiled during build
  # This reduces memory usage by preventing on-demand asset compilation
  config.assets.compile = false

  # Configure Terser to support modern ES6+ syntax
  # Note: dartsass-rails handles CSS compilation separately, no css_compressor needed
  config.assets.js_compressor = Terser.new(
    compress: {
      ecma: 2015,
      warnings: false
    },
    mangle: {
      eval: true
    },
    output: {
      ecma: 2015,
      comments: false
    }
  )

  config.assets.digest = true
  config.assets.version = "1.0"
  config.assets.debug = false
end

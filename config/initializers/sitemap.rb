Rails.configuration.after_initialize do
  # Only run in production
  if Rails.env.production? && defined?(Rails::Server)
    # Run in a background thread to not block server startup
    Thread.new do
      # Give the server time to fully initialize
      sleep 10
      begin
        SitemapService.new.generate
        Rails.logger.info "Sitemap generated successfully on startup"
      rescue StandardError => e
        Rails.logger.error "Failed to generate sitemap on startup: #{e.message}"
      end
    end
  end
end

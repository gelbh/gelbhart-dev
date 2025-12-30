# lib/tasks/analytics.rake
namespace :analytics do
  desc "Check Google Analytics credentials status"
  task status: :environment do
    puts "=" * 60
    puts "GOOGLE ANALYTICS CREDENTIALS STATUS"
    puts "=" * 60

    credentials = Rails.application.credentials
    property_id = credentials.ga4_property_id
    client_id = credentials.dig(:google_oauth, :client_id)
    client_secret = credentials.dig(:google_oauth, :client_secret)
    refresh_token = credentials.dig(:google_oauth, :refresh_token)

    puts "\nRails Credentials:"
    puts "  ga4_property_id:           #{property_id.present? ? '✓ SET' : '✗ MISSING'}"
    puts "  google_oauth.client_id:    #{client_id.present? ? '✓ SET' : '✗ MISSING'}"
    puts "  google_oauth.client_secret:#{client_secret.present? ? '✓ SET' : '✗ MISSING'}"
    puts "  google_oauth.refresh_token:#{refresh_token.present? ? '✓ SET' : '✗ MISSING'}"

    puts "\nDatabase Cache:"
    if defined?(AnalyticsCacheRecord) && AnalyticsCacheRecord.table_exists?
      record = AnalyticsCacheRecord.find_by(key: GoogleAnalyticsService::CACHE_KEY)
      if record
        puts "  Last cached: #{record.fetched_at}"
        puts "  Cache age:   #{((Time.current - record.fetched_at) / 60).round} minutes ago"
      else
        puts "  No cached data"
      end
    else
      puts "  Table not created yet"
    end

    puts "\n" + "=" * 60

    if property_id.present? && client_id.present? && client_secret.present? && refresh_token.present?
      puts "All credentials are configured. Run 'rails analytics:test' to verify."
    else
      puts "Missing credentials. See instructions below."
      puts "\nTo configure:"
      puts "  1. Run: EDITOR=\"code --wait\" rails credentials:edit"
      puts "  2. Add the missing values"
      puts "  3. Run: rails analytics:authorize (if you need a new refresh_token)"
    end
  end

  desc "Authorize Google Analytics access (get refresh token)"
  task authorize: :environment do
    require "googleauth"
    require "googleauth/stores/file_token_store"
    require "webrick"
    require "json"

    client_id_value = Rails.application.credentials.dig(:google_oauth, :client_id)
    client_secret_value = Rails.application.credentials.dig(:google_oauth, :client_secret)

    unless client_id_value.present? && client_secret_value.present?
      puts "Error: google_oauth credentials not found in Rails credentials"
      puts "\nPlease add client_id and client_secret to your Rails credentials:"
      puts "  EDITOR=\"code --wait\" rails credentials:edit"
      puts "\nAdd:"
      puts "  google_oauth:"
      puts "    client_id: your-client-id.apps.googleusercontent.com"
      puts "    client_secret: your-client-secret"
      puts "\nGet these from: https://console.cloud.google.com/apis/credentials"
      exit 1
    end

    scope = "https://www.googleapis.com/auth/analytics.readonly"
    client_id = Google::Auth::ClientId.new(client_id_value, client_secret_value)

    # Use a temporary in-memory store for the authorization flow
    temp_store = Google::Auth::Stores::FileTokenStore.new(
      file: Rails.root.join("tmp", "analytics-auth-temp.yaml").to_s
    )
    authorizer = Google::Auth::UserAuthorizer.new(client_id, scope, temp_store)

    # Use local redirect server
    port = 8080
    redirect_uri = "http://localhost:#{port}"

    # Store the authorization code
    auth_code = nil

    # Create a simple web server to receive the callback
    server = WEBrick::HTTPServer.new(
      Port: port,
      Logger: WEBrick::Log.new("/dev/null"),
      AccessLog: []
    )

    server.mount_proc "/" do |req, res|
      auth_code = req.query["code"]
      res.body = <<~HTML
        <html>
        <head><title>Authorization Successful</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>✓ Authorization Successful!</h1>
          <p>You can close this window and return to your terminal.</p>
        </body>
        </html>
      HTML
      server.shutdown
    end

    # Start server in background thread
    Thread.new { server.start }

    # Generate authorization URL
    url = authorizer.get_authorization_url(base_url: redirect_uri)

    puts "\n" + "=" * 70
    puts "GOOGLE ANALYTICS AUTHORIZATION"
    puts "=" * 70
    puts "\n1. Opening authorization URL in your browser..."
    puts "\n   If it doesn't open automatically, visit:\n"
    puts "   #{url}\n"
    puts "\n2. Sign in with your Google account that has access to GA4"
    puts "3. Click 'Allow' to grant access"
    puts "4. You'll be redirected back automatically"
    puts "\n" + "=" * 70

    # Try to open browser automatically
    case RbConfig::CONFIG["host_os"]
    when /mswin|mingw|cygwin/
      system("start", url)
    when /darwin/
      system("open", url)
    when /linux|bsd/
      system("xdg-open", url) || system("wslview", url)
    end

    puts "\nWaiting for authorization..."

    # Wait for the server to receive the callback (max 2 minutes)
    timeout = 120
    start_time = Time.now
    while auth_code.nil? && (Time.now - start_time) < timeout
      sleep 0.5
    end

    server.shutdown rescue nil

    # Clean up temp file
    temp_file = Rails.root.join("tmp", "analytics-auth-temp.yaml")

    if auth_code
      begin
        credentials = authorizer.get_and_store_credentials_from_code(
          user_id: "default",
          code: auth_code,
          base_url: redirect_uri
        )

        puts "\n" + "=" * 70
        puts "✓ AUTHORIZATION SUCCESSFUL!"
        puts "=" * 70
        puts "\nAdd this refresh_token to your Rails credentials:"
        puts "\n  EDITOR=\"code --wait\" rails credentials:edit"
        puts "\nUpdate your google_oauth section:"
        puts "\n  google_oauth:"
        puts "    client_id: #{client_id_value}"
        puts "    client_secret: #{client_secret_value}"
        puts "    refresh_token: #{credentials.refresh_token}"
        puts "\n" + "=" * 70
        puts "\nAfter updating credentials, run: rails analytics:test"
      rescue StandardError => e
        puts "\n✗ Authorization failed: #{e.message}"
        exit 1
      ensure
        File.delete(temp_file) if File.exist?(temp_file)
      end
    else
      File.delete(temp_file) if File.exist?(temp_file)
      puts "\n✗ Authorization timed out. Please try again."
      exit 1
    end
  end

  desc "Test Google Analytics connection"
  task test: :environment do
    property_id = Rails.application.credentials.ga4_property_id

    unless property_id.present?
      puts "Error: ga4_property_id not set in Rails credentials"
      puts "\nRun 'rails analytics:status' to check all credentials."
      exit 1
    end

    puts "Testing Google Analytics connection..."
    puts "Property ID: #{property_id}"

    service = GoogleAnalyticsService.new
    stats = service.fetch_hevy_tracker_stats

    puts "\n" + "-" * 40
    puts "Source: #{stats[:source]}"
    puts "Stale:  #{stats[:stale] || false}"
    if stats[:fetched_at]
      puts "Fetched: #{stats[:fetched_at]}"
    end
    puts "-" * 40

    case stats[:source]
    when "fresh"
      puts "\n✓ SUCCESS! Live data from Google Analytics API"
    when "fallback"
      puts "\n⚠ Using cached data from database (API may be unavailable)"
    when "defaults"
      puts "\n⚠ Using default values (no cached data available)"
      puts "  This usually means the API connection failed."
      puts "  Check your credentials with: rails analytics:status"
    end

    puts "\nStats:"
    puts "  Active Users:        #{stats[:active_users]}"
    puts "  Workspace Downloads: #{stats[:install_count]}"
    puts "  Countries:           #{stats.dig(:countries, :total) || 0}"
    puts "  Engagement Rate:     #{stats[:engagement_rate]}%"

    countries = stats.dig(:countries, :list) || []
    if countries.any?
      puts "\nTop Countries:"
      countries.first(3).each do |country|
        name = country[:name] || country["name"]
        users = country[:users] || country["users"]
        puts "  - #{name}: #{users} users"
      end
    end
  end

  desc "Clear analytics cache (forces fresh fetch on next request)"
  task clear_cache: :environment do
    # Clear Rails cache
    Rails.cache.delete("hevy_tracker_analytics")
    puts "✓ Cleared Rails cache"

    # Optionally clear database cache
    if ENV["ALL"] == "true" && defined?(AnalyticsCacheRecord)
      AnalyticsCacheRecord.where(key: GoogleAnalyticsService::CACHE_KEY).delete_all
      puts "✓ Cleared database cache"
    else
      puts "  (Database cache preserved for fallback)"
      puts "  Run with ALL=true to also clear database cache"
    end

    puts "\nNext API request will fetch fresh data."
  end
end

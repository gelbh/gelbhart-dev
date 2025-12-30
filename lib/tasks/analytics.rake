namespace :analytics do
  desc "Check Google Analytics credentials status"
  task status: :environment do
    print_header("GOOGLE ANALYTICS CREDENTIALS STATUS")

    oauth = Rails.application.credentials.google_oauth || {}
    property_id = Rails.application.credentials.ga4_property_id

    puts "\nRails Credentials:"
    puts "  ga4_property_id:            #{status_icon(property_id)}"
    puts "  google_oauth.client_id:     #{status_icon(oauth[:client_id])}"
    puts "  google_oauth.client_secret: #{status_icon(oauth[:client_secret])}"
    puts "  google_oauth.refresh_token: #{status_icon(oauth[:refresh_token])}"

    puts "\nDatabase Cache:"
    print_cache_status

    print_footer

    if all_credentials_present?(property_id, oauth)
      puts "All credentials configured. Run 'rails analytics:test' to verify."
    else
      puts "Missing credentials. Run 'rails analytics:authorize' after adding client_id/client_secret."
    end
  end

  desc "Authorize Google Analytics access (get refresh token)"
  task authorize: :environment do
    require "googleauth"
    require "googleauth/stores/file_token_store"
    require "webrick"

    oauth = Rails.application.credentials.google_oauth || {}
    unless oauth[:client_id].present? && oauth[:client_secret].present?
      abort <<~MSG
        Error: google_oauth credentials not found in Rails credentials

        Add client_id and client_secret:
          EDITOR="code --wait" rails credentials:edit

        Get these from: https://console.cloud.google.com/apis/credentials
      MSG
    end

    credentials = run_oauth_flow(oauth)
    return unless credentials

    print_header("AUTHORIZATION SUCCESSFUL!")
    puts "\nAdd this refresh_token to your Rails credentials:"
    puts "\n  EDITOR=\"code --wait\" rails credentials:edit"
    puts "\n  google_oauth:"
    puts "    client_id: #{oauth[:client_id]}"
    puts "    client_secret: #{oauth[:client_secret]}"
    puts "    refresh_token: #{credentials.refresh_token}"
    print_footer
    puts "\nAfter updating credentials, run: rails analytics:test"
  end

  desc "Test Google Analytics connection"
  task test: :environment do
    property_id = Rails.application.credentials.ga4_property_id
    abort "Error: ga4_property_id not set. Run 'rails analytics:status'" unless property_id.present?

    puts "Testing Google Analytics connection..."
    puts "Property ID: #{property_id}"

    stats = GoogleAnalyticsService.new.fetch_hevy_tracker_stats
    print_test_results(stats)
  end

  desc "Clear analytics cache (ALL=true to include database)"
  task clear_cache: :environment do
    Rails.cache.delete(GoogleAnalyticsService::CACHE_KEY)
    puts "✓ Cleared Rails cache"

    if ENV["ALL"] == "true"
      AnalyticsCacheRecord.where(key: GoogleAnalyticsService::CACHE_KEY).delete_all
      puts "✓ Cleared database cache"
    else
      puts "  (Database cache preserved. Use ALL=true to clear)"
    end
  end

  # Helper methods
  def print_header(title)
    puts "\n#{"=" * 60}\n#{title}\n#{"=" * 60}"
  end

  def print_footer
    puts "\n#{"=" * 60}"
  end

  def status_icon(value)
    value.present? ? "✓ SET" : "✗ MISSING"
  end

  def all_credentials_present?(property_id, oauth)
    property_id.present? && oauth[:client_id].present? &&
      oauth[:client_secret].present? && oauth[:refresh_token].present?
  end

  def print_cache_status
    if AnalyticsCacheRecord.table_exists?
      record = AnalyticsCacheRecord.find_by(key: GoogleAnalyticsService::CACHE_KEY)
      if record
        age_minutes = ((Time.current - record.fetched_at) / 60).round
        puts "  Last cached: #{record.fetched_at} (#{age_minutes} min ago)"
      else
        puts "  No cached data"
      end
    else
      puts "  Table not created yet"
    end
  end

  def print_test_results(stats)
    puts "\n#{"-" * 40}"
    puts "Source: #{stats[:source]}"
    puts "Stale:  #{stats[:stale] || false}"
    puts "Fetched: #{stats[:fetched_at]}" if stats[:fetched_at]
    puts "-" * 40

    case stats[:source]
    when "fresh"  then puts "\n✓ SUCCESS! Live data from Google Analytics API"
    when "fallback" then puts "\n⚠ Using cached data (API may be unavailable)"
    when "defaults" then puts "\n⚠ Using defaults (check credentials with: rails analytics:status)"
    end

    puts "\nStats:"
    puts "  Active Users:        #{stats[:active_users]}"
    puts "  Workspace Downloads: #{stats[:install_count]}"
    puts "  Countries:           #{stats.dig(:countries, :total) || 0}"
    puts "  Engagement Rate:     #{stats[:engagement_rate]}%"

    if (countries = stats.dig(:countries, :list))&.any?
      puts "\nTop Countries:"
      countries.first(3).each { |c| puts "  - #{c[:name] || c["name"]}: #{c[:users] || c["users"]} users" }
    end
  end

  def run_oauth_flow(oauth)
    client_id = Google::Auth::ClientId.new(oauth[:client_id], oauth[:client_secret])
    temp_file = Rails.root.join("tmp", "analytics-auth-temp.yaml")
    temp_store = Google::Auth::Stores::FileTokenStore.new(file: temp_file.to_s)
    authorizer = Google::Auth::UserAuthorizer.new(client_id, GoogleAnalyticsService::SCOPE, temp_store)

    port = 8080
    redirect_uri = "http://localhost:#{port}"
    auth_code = nil

    server = WEBrick::HTTPServer.new(Port: port, Logger: WEBrick::Log.new("/dev/null"), AccessLog: [])
    server.mount_proc("/") do |req, res|
      auth_code = req.query["code"]
      res.body = "<html><body style='font-family:system-ui;text-align:center;padding:40px'>" \
                 "<h1>✓ Authorization Successful!</h1><p>Return to terminal.</p></body></html>"
      server.shutdown
    end

    Thread.new { server.start }

    url = authorizer.get_authorization_url(base_url: redirect_uri)
    print_header("GOOGLE ANALYTICS AUTHORIZATION")
    puts "\n1. Opening browser (or visit URL below):\n   #{url}\n"
    puts "2. Sign in and click 'Allow'"
    print_footer

    open_browser(url)
    puts "\nWaiting for authorization..."

    120.times { break if auth_code; sleep 1 }
    server.shutdown rescue nil

    if auth_code
      credentials = authorizer.get_and_store_credentials_from_code(user_id: "default", code: auth_code, base_url: redirect_uri)
      File.delete(temp_file) if temp_file.exist?
      credentials
    else
      File.delete(temp_file) if temp_file.exist?
      abort "\n✗ Authorization timed out. Please try again."
    end
  rescue StandardError => e
    File.delete(temp_file) if temp_file.exist?
    abort "\n✗ Authorization failed: #{e.message}"
  end

  def open_browser(url)
    case RbConfig::CONFIG["host_os"]
    when /mswin|mingw|cygwin/ then system("start", url)
    when /darwin/ then system("open", url)
    when /linux|bsd/ then system("xdg-open", url) || system("wslview", url)
    end
  end
end

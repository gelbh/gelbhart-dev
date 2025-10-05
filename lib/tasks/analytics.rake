# lib/tasks/analytics.rake
namespace :analytics do
  desc "Authorize Google Analytics access (one-time setup)"
  task authorize: :environment do
    require 'googleauth'
    require 'googleauth/stores/file_token_store'
    require 'webrick'
    require 'socket'
    require 'json'

    unless ENV['GOOGLE_OAUTH_CREDENTIALS']
      puts "Error: GOOGLE_OAUTH_CREDENTIALS environment variable not set"
      puts "Please set it to the path of your OAuth credentials JSON file"
      exit 1
    end

    unless File.exist?(ENV['GOOGLE_OAUTH_CREDENTIALS'])
      puts "Error: OAuth credentials file not found at #{ENV['GOOGLE_OAUTH_CREDENTIALS']}"
      exit 1
    end

    # Load credentials and handle both web and installed app formats
    creds_data = JSON.parse(File.read(ENV['GOOGLE_OAUTH_CREDENTIALS']))

    # Extract client_id and client_secret from web or installed format
    if creds_data['web']
      client_info = creds_data['web']
    elsif creds_data['installed']
      client_info = creds_data['installed']
    else
      puts "Error: Invalid credentials format"
      exit 1
    end

    client_id = Google::Auth::ClientId.new(client_info['client_id'], client_info['client_secret'])
    token_store = Google::Auth::Stores::FileTokenStore.new(
      file: Rails.root.join('config', 'analytics-tokens.yaml').to_s
    )

    scope = 'https://www.googleapis.com/auth/analytics.readonly'
    authorizer = Google::Auth::UserAuthorizer.new(client_id, scope, token_store)

    user_id = 'default'
    credentials = authorizer.get_credentials(user_id)

    if credentials
      puts "✓ Already authorized! Token found at config/analytics-tokens.yaml"
      puts "\nYou're all set. The app can now access Google Analytics."
    else
      # Use local redirect server
      port = 8080
      redirect_uri = "http://localhost:#{port}"

      # Store the authorization code
      auth_code = nil

      # Create a simple web server to receive the callback
      server = WEBrick::HTTPServer.new(Port: port, Logger: WEBrick::Log.new("/dev/null"), AccessLog: [])

      server.mount_proc '/' do |req, res|
        auth_code = req.query['code']
        res.body = '<html><body><h1>Authorization successful!</h1><p>You can close this window and return to your terminal.</p></body></html>'
        server.shutdown
      end

      # Start server in background thread
      Thread.new { server.start }

      # Generate authorization URL
      url = authorizer.get_authorization_url(base_url: redirect_uri)

      puts "\n" + "="*70
      puts "GOOGLE ANALYTICS AUTHORIZATION"
      puts "="*70
      puts "\n1. Opening authorization URL in your browser..."
      puts "\n   If it doesn't open automatically, visit:\n"
      puts "   #{url}\n\n"
      puts "2. Sign in with your Google account that has access to GA4"
      puts "3. Click 'Allow' to grant access"
      puts "4. You'll be redirected back automatically\n"
      puts "="*70

      # Try to open browser automatically
      if RbConfig::CONFIG['host_os'] =~ /mswin|mingw|cygwin/
        system("start #{url}")
      elsif RbConfig::CONFIG['host_os'] =~ /darwin/
        system("open #{url}")
      elsif RbConfig::CONFIG['host_os'] =~ /linux|bsd/
        system("xdg-open #{url}") || system("wslview #{url}")
      end

      puts "\nWaiting for authorization..."

      # Wait for the server to receive the callback (max 2 minutes)
      timeout = 120
      start_time = Time.now
      while auth_code.nil? && (Time.now - start_time) < timeout
        sleep 0.5
      end

      server.shutdown rescue nil

      if auth_code
        begin
          credentials = authorizer.get_and_store_credentials_from_code(
            user_id: user_id,
            code: auth_code,
            base_url: redirect_uri
          )

          puts "\n✓ Authorization successful!"
          puts "✓ Token saved to config/analytics-tokens.yaml"
          puts "\nYour app can now access Google Analytics data."
        rescue StandardError => e
          puts "\n✗ Authorization failed: #{e.message}"
          exit 1
        end
      else
        puts "\n✗ Authorization timed out. Please try again."
        exit 1
      end
    end
  end

  desc "Test Google Analytics connection"
  task test: :environment do
    unless ENV['GA4_PROPERTY_ID']
      puts "Error: GA4_PROPERTY_ID environment variable not set"
      exit 1
    end

    puts "Testing Google Analytics connection..."
    puts "Property ID: #{ENV['GA4_PROPERTY_ID']}"

    begin
      service = GoogleAnalyticsService.new
      stats = service.fetch_hevy_tracker_stats

      puts "\n✓ Success! Retrieved stats:"
      puts "  Active Users: #{stats[:active_users]}"
      puts "  Workspace Downloads: #{stats[:install_count]}"
      puts "  Countries: #{stats[:countries][:total]}"
      puts "  Engagement Rate: #{stats[:engagement_rate]}%"
      puts "\nTop Countries:"
      stats[:countries][:list].first(3).each do |country|
        puts "  - #{country[:name]}: #{country[:users]} users"
      end
    rescue StandardError => e
      puts "\n✗ Error: #{e.message}"
      puts "\nMake sure you've run: rails analytics:authorize"
      exit 1
    end
  end

  desc "Revoke Google Analytics authorization"
  task revoke: :environment do
    token_file = Rails.root.join('config', 'analytics-tokens.yaml')

    if File.exist?(token_file)
      File.delete(token_file)
      puts "✓ Authorization revoked. Token file deleted."
      puts "\nRun 'rails analytics:authorize' to authorize again."
    else
      puts "No authorization found. Nothing to revoke."
    end
  end
end

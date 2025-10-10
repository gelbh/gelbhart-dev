# app/services/google_analytics_service.rb
require 'google/analytics/data'
require 'googleauth'
require 'googleauth/stores/file_token_store'
require 'signet/oauth_2/client'
require 'json'

class GoogleAnalyticsService
  PROPERTY_ID = ENV['GA4_PROPERTY_ID']
  SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

  def initialize
    @credentials = get_credentials

    if @credentials
      # Create client with OAuth credentials
      @client = Google::Analytics::Data.analytics_data do |config|
        # Create a signet auth client from our OAuth credentials
        auth_client = Signet::OAuth2::Client.new(
          token_credential_uri: 'https://oauth2.googleapis.com/token',
          client_id: @credentials.client_id,
          client_secret: @credentials.client_secret,
          refresh_token: @credentials.refresh_token,
          scope: SCOPE
        )

        # Set universe domain to fix compatibility
        auth_client.instance_variable_set(:@universe_domain, 'googleapis.com')

        # Fetch access token with error handling
        begin
          auth_client.fetch_access_token!
        rescue Signet::AuthorizationError => e
          Rails.logger.error "Authorization failed. #{e.message}"
          raise StandardError.new("Authorization failed. Please run: rails analytics:authorize")
        end

        config.credentials = auth_client
      end
    else
      @client = nil
    end
  end

  def fetch_hevy_tracker_stats
    return mock_stats if Rails.env.development? && !credentials_present?

    {
      active_users: fetch_active_users,
      page_views: fetch_page_views,
      countries: fetch_top_countries,
      engagement_rate: fetch_engagement_rate,
      install_count: fetch_install_count
    }
  rescue StandardError => e
    Rails.logger.error "Google Analytics API Error: #{e.message}"
    mock_stats
  end

  private

  def credentials_present?
    PROPERTY_ID.present? && oauth_credentials_present?
  end

  def oauth_credentials_present?
    # Check for environment variables (production) or files (development)
    env_vars_present = ENV['GOOGLE_OAUTH_CLIENT_ID'].present? &&
                       ENV['GOOGLE_OAUTH_CLIENT_SECRET'].present? &&
                       ENV['GOOGLE_OAUTH_REFRESH_TOKEN'].present?

    files_present = ENV['GOOGLE_OAUTH_CREDENTIALS'].present? &&
                    File.exist?(Rails.root.join('config', 'analytics-tokens.yaml'))

    env_vars_present || files_present
  end

  def get_credentials
    get_oauth_credentials if oauth_credentials_present?
  end

  def get_oauth_credentials
    # Try environment variables first (for production)
    if ENV['GOOGLE_OAUTH_CLIENT_ID'].present? && ENV['GOOGLE_OAUTH_CLIENT_SECRET'].present? && ENV['GOOGLE_OAUTH_REFRESH_TOKEN'].present?
      return get_oauth_credentials_from_env
    end

    # Fall back to file-based credentials (for development)
    return nil unless ENV['GOOGLE_OAUTH_CREDENTIALS'].present?
    return nil unless File.exist?(ENV['GOOGLE_OAUTH_CREDENTIALS'])

    # Load credentials and handle both web and installed app formats
    creds_data = JSON.parse(File.read(ENV['GOOGLE_OAUTH_CREDENTIALS']))
    client_info = creds_data['web'] || creds_data['installed']

    unless client_info
      Rails.logger.error "Invalid OAuth credentials format"
      return nil
    end

    client_id = Google::Auth::ClientId.new(client_info['client_id'], client_info['client_secret'])
    token_store = Google::Auth::Stores::FileTokenStore.new(
      file: Rails.root.join('config', 'analytics-tokens.yaml').to_s
    )

    authorizer = Google::Auth::UserAuthorizer.new(client_id, SCOPE, token_store)
    authorizer.get_credentials('default')
  end

  def get_oauth_credentials_from_env
    # Create credentials directly from environment variables
    token_data = {
      'client_id' => ENV['GOOGLE_OAUTH_CLIENT_ID'],
      'access_token' => ENV['GOOGLE_OAUTH_ACCESS_TOKEN'],
      'refresh_token' => ENV['GOOGLE_OAUTH_REFRESH_TOKEN'],
      'scope' => [SCOPE],
      'expiration_time_millis' => (Time.now + 3600).to_i * 1000
    }

    # Create a mock token store that returns our env-based credentials
    mock_store = Object.new
    def mock_store.load(id)
      # Return the token JSON that was set in the instance variable
      @token_json
    end
    mock_store.instance_variable_set(:@token_json, token_data.to_json)

    client_id = Google::Auth::ClientId.new(
      ENV['GOOGLE_OAUTH_CLIENT_ID'],
      ENV['GOOGLE_OAUTH_CLIENT_SECRET']
    )

    authorizer = Google::Auth::UserAuthorizer.new(client_id, SCOPE, mock_store)
    authorizer.get_credentials('default')
  end

  def fetch_active_users
    response = @client.run_report(
      property: "properties/#{PROPERTY_ID}",
      date_ranges: [{ start_date: '2024-11-19', end_date: 'today' }],
      metrics: [{ name: 'totalUsers' }]
    )

    total_users = response.rows.first&.metric_values&.first&.value.to_i || 0
    total_users
  end

  def fetch_page_views
    response = @client.run_report(
      property: "properties/#{PROPERTY_ID}",
      date_ranges: [{ start_date: '2024-11-19', end_date: 'today' }],
      metrics: [{ name: 'screenPageViews' }]
    )

    response.rows.first&.metric_values&.first&.value.to_i || 0
  end

  def fetch_top_countries
    response = @client.run_report(
      property: "properties/#{PROPERTY_ID}",
      date_ranges: [{ start_date: '2024-11-19', end_date: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'totalUsers' }],
      order_bys: [{ metric: { metric_name: 'totalUsers' }, desc: true }],
      limit: 100
    )

    countries = response.rows.map do |row|
      {
        name: row.dimension_values.first.value,
        users: row.metric_values.first.value.to_i
      }
    end

    # Calculate total countries
    total_countries = response.row_count || 0

    {
      list: countries,
      total: total_countries
    }
  end

  def fetch_engagement_rate
    response = @client.run_report(
      property: "properties/#{PROPERTY_ID}",
      date_ranges: [{ start_date: '2024-11-19', end_date: 'today' }],
      metrics: [{ name: 'engagementRate' }]
    )

    rate = response.rows.first&.metric_values&.first&.value.to_f || 0
    (rate * 100).round
  end

  def fetch_install_count
    response = @client.run_report(
      property: "properties/#{PROPERTY_ID}",
      date_ranges: [{ start_date: '2024-11-19', end_date: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimension_filter: {
        filter: {
          field_name: 'eventName',
          string_filter: {
            match_type: Google::Analytics::Data::V1beta::Filter::StringFilter::MatchType::EXACT,
            value: 'FINISH_INSTALL'
          }
        }
      }
    )

    response.rows.first&.metric_values&.first&.value.to_i || 0
  end

  # Mock data for development when credentials are not set
  def mock_stats
    {
      active_users: 750,
      page_views: 1880,
      countries: {
        list: [
          { name: 'United States', users: 289 },
          { name: 'United Kingdom', users: 54 },
          { name: 'India', users: 37 },
          { name: 'Canada', users: 31 },
          { name: 'Australia', users: 26 },
          { name: 'Germany', users: 26 }
        ],
        total: 70
      },
      engagement_rate: 62,
      install_count: 294
    }
  end
end

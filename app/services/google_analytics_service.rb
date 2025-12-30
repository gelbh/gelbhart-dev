require "google/analytics/data"
require "googleauth"
require "googleauth/stores/file_token_store"
require "signet/oauth_2/client"
require "json"

class GoogleAnalyticsService
  SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
  CACHE_KEY = "hevy_tracker_analytics"

  def self.property_id
    Rails.application.credentials.ga4_property_id
  end

  def initialize
    @initialization_error = nil
    @credentials = nil
    @client = nil

    begin
      @credentials = get_credentials

      if @credentials
        # Create client with OAuth credentials
        @client = Google::Analytics::Data.analytics_data do |config|
          auth_client = Signet::OAuth2::Client.new(
            token_credential_uri: "https://oauth2.googleapis.com/token",
            client_id: @credentials.client_id,
            client_secret: @credentials.client_secret,
            refresh_token: @credentials.refresh_token,
            scope: SCOPE
          )

          # Set universe domain to fix compatibility
          auth_client.instance_variable_set(:@universe_domain, "googleapis.com")

          # Fetch access token with error handling
          begin
            auth_client.fetch_access_token!
          rescue Signet::AuthorizationError => e
            Rails.logger.error "Authorization failed. #{e.message}"
            raise StandardError.new("Authorization failed. Please run: rails analytics:authorize")
          end

          config.credentials = auth_client
        end
      end
    rescue StandardError => e
      @initialization_error = e
      Rails.logger.error "GoogleAnalyticsService initialization failed: #{e.message}"
      Rails.logger.error e.backtrace.join("\n") if Rails.env.development?
      @client = nil
    end
  end

  # Fetch Hevy Tracker analytics
  # Always returns data - prefers fresh > cached > database fallback > defaults
  # @return [Hash] Analytics data with :source metadata indicating data freshness
  def fetch_hevy_tracker_stats
    # Try to fetch fresh data from Google Analytics API
    fresh_data = fetch_fresh_stats

    if fresh_data
      # Success! Save to database for future fallback and return fresh data
      persist_to_database(fresh_data)
      return fresh_data.merge(source: "fresh", fetched_at: Time.current.iso8601)
    end

    # API failed - try database fallback
    fallback_result = load_from_database
    if fallback_result
      Rails.logger.info "Using database fallback for analytics (fetched at: #{fallback_result[:fetched_at]})"
      return fallback_result[:data].merge(
        source: "fallback",
        fetched_at: fallback_result[:fetched_at].iso8601,
        stale: true
      )
    end

    # No database fallback - use hardcoded defaults
    Rails.logger.warn "No cached analytics data available, using defaults"
    default_stats.merge(source: "defaults", stale: true)
  end

  private

  # Attempt to fetch fresh data from Google Analytics API
  # @return [Hash, nil] Analytics data or nil if fetch fails
  def fetch_fresh_stats
    # Check for initialization errors
    if @initialization_error
      Rails.logger.error "GoogleAnalyticsService initialization error: #{@initialization_error.message}"
      return nil
    end

    # Check if client is available
    if @client.nil?
      Rails.logger.error "Google Analytics client not initialized - credentials may be missing or invalid"
      log_credential_status
      return nil
    end

    # Check if property ID is set
    unless self.class.property_id.present?
      Rails.logger.error "ga4_property_id is not set in Rails credentials"
      return nil
    end

    # Fetch all metrics
    {
      active_users: fetch_active_users,
      page_views: fetch_page_views,
      countries: fetch_top_countries,
      engagement_rate: fetch_engagement_rate,
      install_count: fetch_install_count
    }
  rescue Signet::AuthorizationError => e
    Rails.logger.error "Google Analytics authorization failed (refresh token may be expired): #{e.message}"
    nil
  rescue Google::Apis::ClientError => e
    Rails.logger.error "Google Analytics API client error: #{e.message}"
    nil
  rescue Google::Apis::ServerError => e
    Rails.logger.error "Google Analytics API server error: #{e.message}"
    nil
  rescue StandardError => e
    Rails.logger.error "Google Analytics API error (#{e.class}): #{e.message}"
    Rails.logger.error e.backtrace.first(5).join("\n") if Rails.env.development?
    nil
  end

  # Log credential status for debugging (without exposing secrets)
  def log_credential_status
    Rails.logger.info "Credential status - Property ID: #{self.class.property_id.present? ? 'SET' : 'MISSING'}, " \
                      "Client ID: #{Rails.application.credentials.dig(:google_oauth, :client_id).present? ? 'SET' : 'MISSING'}, " \
                      "Client Secret: #{Rails.application.credentials.dig(:google_oauth, :client_secret).present? ? 'SET' : 'MISSING'}, " \
                      "Refresh Token: #{Rails.application.credentials.dig(:google_oauth, :refresh_token).present? ? 'SET' : 'MISSING'}"
  end

  # Save analytics data to database for future fallback
  # @param data [Hash] Analytics data to persist
  def persist_to_database(data)
    AnalyticsCacheRecord.store(CACHE_KEY, data.deep_stringify_keys)
  rescue StandardError => e
    Rails.logger.error "Failed to persist analytics to database: #{e.message}"
  end

  # Load analytics data from database
  # @return [Hash, nil] Hash with :data and :fetched_at or nil if not found
  def load_from_database
    result = AnalyticsCacheRecord.retrieve_with_metadata(CACHE_KEY)
    return nil unless result

    # Symbolize keys for consistency
    {
      data: result[:data].deep_symbolize_keys,
      fetched_at: result[:fetched_at]
    }
  rescue StandardError => e
    Rails.logger.error "Failed to load analytics from database: #{e.message}"
    nil
  end

  def oauth_credentials_present?
    Rails.application.credentials.dig(:google_oauth, :client_id).present? &&
      Rails.application.credentials.dig(:google_oauth, :client_secret).present? &&
      Rails.application.credentials.dig(:google_oauth, :refresh_token).present?
  end

  def get_credentials
    get_oauth_credentials if oauth_credentials_present?
  end

  def get_oauth_credentials
    return nil unless Rails.application.credentials.dig(:google_oauth, :client_id).present? &&
                       Rails.application.credentials.dig(:google_oauth, :client_secret).present? &&
                       Rails.application.credentials.dig(:google_oauth, :refresh_token).present?

    get_oauth_credentials_from_rails
  end

  def get_oauth_credentials_from_rails
    # Create credentials directly from Rails credentials
    token_data = {
      "client_id" => Rails.application.credentials.dig(:google_oauth, :client_id),
      "access_token" => Rails.application.credentials.dig(:google_oauth, :access_token),
      "refresh_token" => Rails.application.credentials.dig(:google_oauth, :refresh_token),
      "scope" => [ SCOPE ],
      "expiration_time_millis" => (Time.now + 3600).to_i * 1000
    }

    # Create a mock token store that returns our credentials-based token data
    mock_store = Object.new
    def mock_store.load(id)
      # Return the token JSON that was set in the instance variable
      @token_json
    end
    mock_store.instance_variable_set(:@token_json, token_data.to_json)

    client_id = Google::Auth::ClientId.new(
      Rails.application.credentials.dig(:google_oauth, :client_id),
      Rails.application.credentials.dig(:google_oauth, :client_secret)
    )

    authorizer = Google::Auth::UserAuthorizer.new(client_id, SCOPE, mock_store)
    authorizer.get_credentials("default")
  end

  def fetch_active_users
    return 0 unless @client

    response = @client.run_report(
      property: "properties/#{self.class.property_id}",
      date_ranges: [ { start_date: "2024-11-19", end_date: "today" } ],
      metrics: [ { name: "totalUsers" } ]
    )

    response.rows&.first&.metric_values&.first&.value.to_i || 0
  rescue StandardError => e
    Rails.logger.error "Failed to fetch active users: #{e.message}"
    0
  end

  def fetch_page_views
    return 0 unless @client

    response = @client.run_report(
      property: "properties/#{self.class.property_id}",
      date_ranges: [ { start_date: "2024-11-19", end_date: "today" } ],
      metrics: [ { name: "screenPageViews" } ]
    )

    response.rows&.first&.metric_values&.first&.value.to_i || 0
  rescue StandardError => e
    Rails.logger.error "Failed to fetch page views: #{e.message}"
    0
  end

  def fetch_top_countries
    return { list: [], total: 0 } unless @client

    response = @client.run_report(
      property: "properties/#{self.class.property_id}",
      date_ranges: [ { start_date: "2024-11-19", end_date: "today" } ],
      dimensions: [ { name: "country" } ],
      metrics: [ { name: "totalUsers" } ],
      order_bys: [ { metric: { metric_name: "totalUsers" }, desc: true } ],
      limit: 100
    )

    countries = (response.rows || []).map do |row|
      {
        name: row.dimension_values&.first&.value || "Unknown",
        users: row.metric_values&.first&.value.to_i || 0
      }
    end

    # Calculate total countries
    total_countries = response.row_count || 0

    {
      list: countries,
      total: total_countries
    }
  rescue StandardError => e
    Rails.logger.error "Failed to fetch top countries: #{e.message}"
    { list: [], total: 0 }
  end

  def fetch_engagement_rate
    return 0 unless @client

    response = @client.run_report(
      property: "properties/#{self.class.property_id}",
      date_ranges: [ { start_date: "2024-11-19", end_date: "today" } ],
      metrics: [ { name: "engagementRate" } ]
    )

    rate = response.rows&.first&.metric_values&.first&.value.to_f || 0
    (rate * 100).round
  rescue StandardError => e
    Rails.logger.error "Failed to fetch engagement rate: #{e.message}"
    0
  end

  def fetch_install_count
    return 0 unless @client

    response = @client.run_report(
      property: "properties/#{self.class.property_id}",
      date_ranges: [ { start_date: "2024-11-19", end_date: "today" } ],
      dimensions: [ { name: "eventName" } ],
      metrics: [ { name: "eventCount" } ],
      dimension_filter: {
        filter: {
          field_name: "eventName",
          string_filter: {
            match_type: Google::Analytics::Data::V1beta::Filter::StringFilter::MatchType::EXACT,
            value: "FINISH_INSTALL"
          }
        }
      }
    )

    response.rows&.first&.metric_values&.first&.value.to_i || 0
  rescue StandardError => e
    Rails.logger.error "Failed to fetch install count: #{e.message}"
    0
  end

  # Default fallback data when no cached data is available
  def default_stats
    {
      active_users: 750,
      page_views: 1880,
      countries: {
        list: [
          { name: "United States", users: 289 },
          { name: "United Kingdom", users: 54 },
          { name: "India", users: 37 },
          { name: "Canada", users: 31 },
          { name: "Australia", users: 26 },
          { name: "Germany", users: 26 }
        ],
        total: 70
      },
      engagement_rate: 62,
      install_count: 294
    }
  end
end

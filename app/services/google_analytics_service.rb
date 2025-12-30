require "google/analytics/data"
require "googleauth"
require "signet/oauth_2/client"

class GoogleAnalyticsService
  SCOPE = "https://www.googleapis.com/auth/analytics.readonly".freeze
  CACHE_KEY = "hevy_tracker_analytics".freeze
  TOKEN_URI = "https://oauth2.googleapis.com/token".freeze

  class << self
    def property_id
      Rails.application.credentials.ga4_property_id
    end

    def oauth_config
      Rails.application.credentials.google_oauth || {}
    end
  end

  def initialize
    @initialization_error = nil
    @client = nil
    initialize_client
  end

  # Always returns data - prefers fresh > database fallback > defaults
  def fetch_hevy_tracker_stats
    if (fresh_data = fetch_fresh_stats)
      persist_to_database(fresh_data)
      return fresh_data.merge(source: "fresh", fetched_at: Time.current.iso8601)
    end

    if (fallback = load_from_database)
      Rails.logger.info "Using database fallback for analytics (fetched at: #{fallback[:fetched_at]})"
      return fallback[:data].merge(source: "fallback", fetched_at: fallback[:fetched_at].iso8601, stale: true)
    end

    Rails.logger.warn "No cached analytics data available, using defaults"
    default_stats.merge(source: "defaults", stale: true)
  end

  private

  def initialize_client
    return unless oauth_credentials_present?

    @client = Google::Analytics::Data.analytics_data do |config|
      config.credentials = build_auth_client
    end
  rescue StandardError => e
    @initialization_error = e
    Rails.logger.error "GoogleAnalyticsService initialization failed: #{e.message}"
    Rails.logger.error e.backtrace.join("\n") if Rails.env.development?
  end

  def build_auth_client
    auth_client = Signet::OAuth2::Client.new(
      token_credential_uri: TOKEN_URI,
      client_id: oauth_config[:client_id],
      client_secret: oauth_config[:client_secret],
      refresh_token: oauth_config[:refresh_token],
      scope: SCOPE
    )
    auth_client.instance_variable_set(:@universe_domain, "googleapis.com")
    auth_client.fetch_access_token!
    auth_client
  rescue Signet::AuthorizationError => e
    Rails.logger.error "Authorization failed: #{e.message}"
    raise StandardError, "Authorization failed. Please run: rails analytics:authorize"
  end

  def fetch_fresh_stats
    return log_error("initialization error: #{@initialization_error.message}") if @initialization_error
    return log_error("client not initialized", log_credentials: true) if @client.nil?
    return log_error("ga4_property_id is not set") unless self.class.property_id.present?

    {
      active_users: fetch_active_users,
      countries: fetch_top_countries,
      engagement_rate: fetch_engagement_rate,
      install_count: fetch_install_count
    }
  rescue Signet::AuthorizationError => e
    log_error("authorization failed (refresh token may be expired): #{e.message}")
  rescue Google::Apis::ClientError, Google::Apis::ServerError => e
    log_error("API error: #{e.message}")
  rescue StandardError => e
    Rails.logger.error "Google Analytics error (#{e.class}): #{e.message}"
    Rails.logger.error e.backtrace.first(5).join("\n") if Rails.env.development?
    nil
  end

  def log_error(message, log_credentials: false)
    Rails.logger.error "GoogleAnalyticsService: #{message}"
    log_credential_status if log_credentials
    nil
  end

  def log_credential_status
    config = self.class.oauth_config
    status = {
      property_id: self.class.property_id.present?,
      client_id: config[:client_id].present?,
      client_secret: config[:client_secret].present?,
      refresh_token: config[:refresh_token].present?
    }.map { |k, v| "#{k}: #{v ? 'SET' : 'MISSING'}" }.join(", ")

    Rails.logger.info "Credential status - #{status}"
  end

  def persist_to_database(data)
    AnalyticsCacheRecord.store(CACHE_KEY, data.deep_stringify_keys)
  rescue StandardError => e
    Rails.logger.error "Failed to persist analytics to database: #{e.message}"
  end

  def load_from_database
    AnalyticsCacheRecord.retrieve_with_metadata(CACHE_KEY)&.then do |result|
      { data: result[:data].deep_symbolize_keys, fetched_at: result[:fetched_at] }
    end
  rescue StandardError => e
    Rails.logger.error "Failed to load analytics from database: #{e.message}"
    nil
  end

  def oauth_credentials_present?
    config = self.class.oauth_config
    config[:client_id].present? && config[:client_secret].present? && config[:refresh_token].present?
  end

  def oauth_config
    self.class.oauth_config
  end

  # GA4 API query helpers
  DATE_RANGE = { start_date: "2024-11-19", end_date: "today" }.freeze

  DEFAULT_STATS = {
    active_users: 1005,
    countries: {
      list: [
        { name: "United States", users: 404 },
        { name: "United Kingdom", users: 76 },
        { name: "India", users: 43 },
        { name: "Canada", users: 36 },
        { name: "China", users: 36 },
        { name: "Germany", users: 36 }
      ],
      total: 72
    },
    engagement_rate: 52,
    install_count: 345
  }.freeze

  def fetch_active_users
    fetch_metric("totalUsers")
  end

  def fetch_engagement_rate
    rate = fetch_metric("engagementRate", as_float: true)
    (rate * 100).round
  end

  def fetch_install_count
    return 0 unless @client

    response = run_report(
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
    extract_metric_value(response)
  rescue StandardError => e
    Rails.logger.error "Failed to fetch install count: #{e.message}"
    0
  end

  def fetch_top_countries
    return { list: [], total: 0 } unless @client

    response = run_report(
      dimensions: [ { name: "country" } ],
      metrics: [ { name: "totalUsers" } ],
      order_bys: [ { metric: { metric_name: "totalUsers" }, desc: true } ],
      limit: 100
    )

    countries = (response.rows || []).map do |row|
      { name: row.dimension_values&.first&.value || "Unknown", users: row.metric_values&.first&.value.to_i }
    end

    { list: countries, total: response.row_count || 0 }
  rescue StandardError => e
    Rails.logger.error "Failed to fetch top countries: #{e.message}"
    { list: [], total: 0 }
  end

  def fetch_metric(metric_name, as_float: false)
    return 0 unless @client

    response = run_report(metrics: [ { name: metric_name } ])
    extract_metric_value(response, as_float:)
  rescue StandardError => e
    Rails.logger.error "Failed to fetch #{metric_name}: #{e.message}"
    0
  end

  def run_report(**options)
    @client.run_report(
      property: "properties/#{self.class.property_id}",
      date_ranges: [ DATE_RANGE ],
      **options
    )
  end

  def extract_metric_value(response, as_float: false)
    value = response.rows&.first&.metric_values&.first&.value
    as_float ? value.to_f : value.to_i
  end

  def default_stats
    DEFAULT_STATS.deep_dup
  end
end

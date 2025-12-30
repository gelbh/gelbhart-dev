require "test_helper"
require "ostruct"

class GoogleAnalyticsServiceTest < ActiveSupport::TestCase
  setup do
    # Stub Rails credentials with nested structure
    # Create a mock that supports both direct access and dig
    @mock_credentials = OpenStruct.new(
      ga4_property_id: "test-property-id",
      google_oauth: {
        client_id: "test-client-id",
        client_secret: "test-client-secret",
        refresh_token: "test-refresh-token",
        access_token: "test-access-token"
      }
    )
    # Add dig method support for nested access
    def @mock_credentials.dig(*keys)
      return nil if keys.empty?
      first_key = keys.first
      remaining_keys = keys[1..-1]

      value = if @table.key?(first_key)
                @table[first_key]
      elsif respond_to?(first_key)
                send(first_key)
      else
                nil
      end

      if remaining_keys.empty?
        value
      elsif value.respond_to?(:dig)
        value.dig(*remaining_keys)
      elsif value.is_a?(Hash)
        remaining_keys.reduce(value) { |obj, key| obj&.[](key) }
      else
        nil
      end
    end
    Rails.application.stubs(:credentials).returns(@mock_credentials)

    # Stub WebMock to prevent real HTTP requests during initialization
    WebMock.stub_request(:post, /oauth2\.googleapis\.com/).to_return(
      status: 200,
      body: '{"access_token":"test-token","token_type":"Bearer"}',
      headers: { "Content-Type" => "application/json" }
    )
  end

  teardown do
    Rails.application.unstub(:credentials) if Rails.application.respond_to?(:unstub)
    WebMock.reset!
  end

  test "initialization without credentials sets client to nil" do
    # Stub the credentials check to return false
    GoogleAnalyticsService.any_instance.stubs(:oauth_credentials_present?).returns(false)

    service = GoogleAnalyticsService.new
    assert_nil service.instance_variable_get(:@client)
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "fetch_hevy_tracker_stats returns complete stats hash with source metadata" do
    # Stub the credentials check to return false, so service uses fallback
    GoogleAnalyticsService.any_instance.stubs(:oauth_credentials_present?).returns(false)

    service = GoogleAnalyticsService.new
    # Service should have nil client without credentials
    assert_nil service.instance_variable_get(:@client)

    stats = service.fetch_hevy_tracker_stats

    assert stats.key?(:active_users)
    assert stats.key?(:page_views)
    assert stats.key?(:countries)
    assert stats.key?(:engagement_rate)
    assert stats.key?(:install_count)
    assert stats.key?(:source), "Response should include source metadata"
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "fetch_hevy_tracker_stats returns default stats without credentials" do
    # Stub the credentials check to return false, so service uses default stats
    GoogleAnalyticsService.any_instance.stubs(:oauth_credentials_present?).returns(false)

    service = GoogleAnalyticsService.new
    assert_nil service.instance_variable_get(:@client)

    stats = service.fetch_hevy_tracker_stats

    assert_equal 750, stats[:active_users]
    assert_equal 1880, stats[:page_views]
    assert_equal 62, stats[:engagement_rate]
    assert_equal 294, stats[:install_count]
    assert_equal "defaults", stats[:source]
    assert stats[:stale]
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "fetch_active_users returns integer" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    # Ensure client exists, then mock the run_report method
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"

    mock_response = OpenStruct.new(
      rows: [ OpenStruct.new(metric_values: [ OpenStruct.new(value: "1234") ]) ]
    )
    service.instance_variable_get(:@client).stubs(:run_report).returns(mock_response)

    result = service.send(:fetch_active_users)
    assert_equal 1234, result
    assert result.is_a?(Integer)
  end

  test "fetch_active_users returns 0 on error" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    result = service.send(:fetch_active_users)
    assert_equal 0, result
  end

  test "fetch_page_views returns integer" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"

    mock_response = OpenStruct.new(
      rows: [ OpenStruct.new(metric_values: [ OpenStruct.new(value: "5678") ]) ]
    )
    service.instance_variable_get(:@client).stubs(:run_report).returns(mock_response)

    result = service.send(:fetch_page_views)
    assert_equal 5678, result
  end

  test "fetch_page_views returns 0 on error" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    result = service.send(:fetch_page_views)
    assert_equal 0, result
  end

  test "fetch_top_countries returns hash with list and total" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"

    mock_row1 = OpenStruct.new(
      dimension_values: [ OpenStruct.new(value: "United States") ],
      metric_values: [ OpenStruct.new(value: "100") ]
    )
    mock_row2 = OpenStruct.new(
      dimension_values: [ OpenStruct.new(value: "Canada") ],
      metric_values: [ OpenStruct.new(value: "50") ]
    )
    mock_response = OpenStruct.new(
      rows: [ mock_row1, mock_row2 ],
      row_count: 2
    )
    service.instance_variable_get(:@client).stubs(:run_report).returns(mock_response)

    result = service.send(:fetch_top_countries)

    assert result.key?(:list)
    assert result.key?(:total)
    assert_equal 2, result[:total]
    assert_equal 2, result[:list].length
    assert_equal "United States", result[:list].first[:name]
    assert_equal 100, result[:list].first[:users]
  end

  test "fetch_top_countries returns empty hash on error" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    result = service.send(:fetch_top_countries)
    assert_equal({ list: [], total: 0 }, result)
  end

  test "fetch_engagement_rate returns percentage 0-100" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"

    mock_response = OpenStruct.new(
      rows: [ OpenStruct.new(metric_values: [ OpenStruct.new(value: "0.62") ]) ]
    )
    service.instance_variable_get(:@client).stubs(:run_report).returns(mock_response)

    result = service.send(:fetch_engagement_rate)
    assert_equal 62, result
    assert result >= 0
    assert result <= 100
  end

  test "fetch_engagement_rate returns 0 on error" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    result = service.send(:fetch_engagement_rate)
    assert_equal 0, result
  end

  test "fetch_install_count returns integer" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"

    mock_response = OpenStruct.new(
      rows: [ OpenStruct.new(metric_values: [ OpenStruct.new(value: "42") ]) ]
    )
    service.instance_variable_get(:@client).stubs(:run_report).returns(mock_response)

    result = service.send(:fetch_install_count)
    assert_equal 42, result
  end

  test "fetch_install_count returns 0 on error" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    result = service.send(:fetch_install_count)
    assert_equal 0, result
  end

  test "fetch_hevy_tracker_stats handles individual metric errors gracefully" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    stats = service.fetch_hevy_tracker_stats

    # Individual fetch methods catch errors and return 0, so we still get "fresh" data
    # (just with zero values). This is intentional - partial API failures shouldn't
    # break everything.
    assert stats.key?(:active_users)
    assert stats.key?(:page_views)
    assert stats.key?(:source)
    assert_equal "fresh", stats[:source]
    # All values should be 0 due to errors
    assert_equal 0, stats[:active_users]
    assert_equal 0, stats[:page_views]
  end

  test "fetch_hevy_tracker_stats uses database fallback when API fails" do
    # Store some data in the database first
    cached_data = {
      "active_users" => 999,
      "page_views" => 5000,
      "countries" => { "list" => [], "total" => 50 },
      "engagement_rate" => 75,
      "install_count" => 500
    }
    AnalyticsCacheRecord.store(GoogleAnalyticsService::CACHE_KEY, cached_data)

    # Stub credentials to fail
    GoogleAnalyticsService.any_instance.stubs(:oauth_credentials_present?).returns(false)

    service = GoogleAnalyticsService.new
    stats = service.fetch_hevy_tracker_stats

    # Should return database fallback
    assert_equal 999, stats[:active_users]
    assert_equal 5000, stats[:page_views]
    assert_equal "fallback", stats[:source]
    assert stats[:stale]
    assert stats.key?(:fetched_at)
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
    AnalyticsCacheRecord.where(key: GoogleAnalyticsService::CACHE_KEY).delete_all
  end

  test "fetch_hevy_tracker_stats persists fresh data to database" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"

    # Mock successful API responses
    mock_response = OpenStruct.new(
      rows: [ OpenStruct.new(metric_values: [ OpenStruct.new(value: "1234") ]) ],
      row_count: 1
    )
    service.instance_variable_get(:@client).stubs(:run_report).returns(mock_response)

    # Clear any existing cache
    AnalyticsCacheRecord.where(key: GoogleAnalyticsService::CACHE_KEY).delete_all

    stats = service.fetch_hevy_tracker_stats

    # Should persist to database
    cached = AnalyticsCacheRecord.retrieve(GoogleAnalyticsService::CACHE_KEY)
    assert_not_nil cached, "Data should be persisted to database"
    assert cached.key?("active_users") || cached.key?(:active_users)
  ensure
    AnalyticsCacheRecord.where(key: GoogleAnalyticsService::CACHE_KEY).delete_all
  end
end

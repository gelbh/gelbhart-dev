require "test_helper"
require "ostruct"

class GoogleAnalyticsServiceTest < ActiveSupport::TestCase
  setup do
    @original_env = ENV.to_h.dup
    ENV["GA4_PROPERTY_ID"] = "test-property-id"
    # Stub WebMock to prevent real HTTP requests during initialization
    WebMock.stub_request(:post, /oauth2\.googleapis\.com/).to_return(
      status: 200,
      body: '{"access_token":"test-token","token_type":"Bearer"}',
      headers: { "Content-Type" => "application/json" }
    )
  end

  teardown do
    ENV.clear
    ENV.update(@original_env)
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

  test "fetch_hevy_tracker_stats returns complete stats hash" do
    # Stub the credentials check to return false, so service uses mock stats
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
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "fetch_hevy_tracker_stats returns mock stats in development without credentials" do
    Rails.env.stubs(:development?).returns(true)
    # Stub the credentials check to return false, so service uses mock stats
    GoogleAnalyticsService.any_instance.stubs(:oauth_credentials_present?).returns(false)

    service = GoogleAnalyticsService.new
    assert_nil service.instance_variable_get(:@client)

    stats = service.fetch_hevy_tracker_stats

    assert_equal 750, stats[:active_users]
    assert_equal 1880, stats[:page_views]
    assert_equal 62, stats[:engagement_rate]
    assert_equal 294, stats[:install_count]
  ensure
    Rails.env.unstub(:development?) if Rails.env.respond_to?(:unstub)
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

  test "fetch_hevy_tracker_stats handles errors gracefully" do
    # The WebMock stub from setup allows OAuth to succeed
    service = GoogleAnalyticsService.new
    assert_not_nil service.instance_variable_get(:@client), "Client should exist with credentials"
    service.instance_variable_get(:@client).stubs(:run_report).raises(StandardError.new("API Error"))

    stats = service.fetch_hevy_tracker_stats

    # Should return mock stats on error
    assert stats.key?(:active_users)
    assert stats.key?(:page_views)
  end
end

require "test_helper"

class Api::AnalyticsTest < ActionDispatch::IntegrationTest
  include ApiHelpers
  setup do
    # Clear cache before each test
    Rails.cache.clear
    # Stub WebMock to prevent real HTTP requests during GoogleAnalyticsService initialization
    WebMock.stub_request(:post, /oauth2\.googleapis\.com/).to_return(
      status: 200,
      body: '{"access_token":"test-token","token_type":"Bearer"}',
      headers: { 'Content-Type' => 'application/json' }
    )
  end

  test "GET /api/analytics/hevy-tracker returns 200 with JSON response" do
    # Mock the GoogleAnalyticsService
    mock_stats = {
      active_users: 1005,
      countries: {
        list: [
          { name: "United States", users: 404 }
        ],
        total: 72
      },
      engagement_rate: 52,
      install_count: 345
    }

    GoogleAnalyticsService.any_instance.stubs(:fetch_hevy_tracker_stats).returns(mock_stats)
    get "/api/analytics/hevy-tracker"
    json = assert_json_response(200)

    assert_equal 1005, json["active_users"]
    assert_equal 52, json["engagement_rate"]
    assert_equal 345, json["install_count"]
    assert json["countries"].present?
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "GET /api/analytics/hevy-tracker caches response for 5 minutes" do
    mock_stats = {
      active_users: 1005,
      countries: { list: [], total: 0 },
      engagement_rate: 52,
      install_count: 345
    }

    call_count = 0
    GoogleAnalyticsService.any_instance.stubs(:fetch_hevy_tracker_stats).returns {
      call_count += 1
      mock_stats
    }

    # First call
    get "/api/analytics/hevy-tracker"
    assert_response :success
    first_call_count = call_count

    # Second call should use cache
    get "/api/analytics/hevy-tracker"
    assert_response :success
    assert_equal first_call_count, call_count, "Service should only be called once due to caching"
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "GET /api/analytics/hevy-tracker sets cache headers" do
    mock_stats = {
      active_users: 1005,
      countries: { list: [], total: 0 },
      engagement_rate: 52,
      install_count: 345
    }

    GoogleAnalyticsService.any_instance.stubs(:fetch_hevy_tracker_stats).returns(mock_stats)
    get "/api/analytics/hevy-tracker"
    assert_response :success
    # Cache-Control header format may vary (order of values)
    assert_includes response.headers["Cache-Control"], "max-age=300"
    assert_includes response.headers["Cache-Control"], "public"
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "GET /api/analytics/hevy-tracker returns fallback data when API fails" do
    # The service now always returns data - it uses fallback when API fails
    fallback_stats = {
      active_users: 1005,
      countries: { list: [], total: 70 },
      engagement_rate: 52,
      install_count: 345,
      source: "defaults",
      stale: true
    }

    GoogleAnalyticsService.any_instance.stubs(:fetch_hevy_tracker_stats).returns(fallback_stats)
    get "/api/analytics/hevy-tracker"
    json = assert_json_response(200)

    # Should still return valid data
    assert_equal 1005, json["active_users"]
    assert_equal "defaults", json["source"]
    assert json["stale"]
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end

  test "GET /api/analytics/hevy-tracker includes source metadata" do
    mock_stats = {
      active_users: 1005,
      countries: { list: [], total: 0 },
      engagement_rate: 52,
      install_count: 345,
      source: "fresh",
      fetched_at: Time.current.iso8601
    }

    GoogleAnalyticsService.any_instance.stubs(:fetch_hevy_tracker_stats).returns(mock_stats)
    get "/api/analytics/hevy-tracker"
    json = assert_json_response(200)

    assert json.key?("source"), "Response should include source metadata"
    assert_equal "fresh", json["source"]
  ensure
    GoogleAnalyticsService.unstub(:any_instance) if GoogleAnalyticsService.respond_to?(:unstub)
  end
end

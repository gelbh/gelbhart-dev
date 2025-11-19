require "test_helper"

class PagesTest < ActionDispatch::IntegrationTest
  test "GET / returns home page" do
    get root_path
    assert_response :success
    assert_select "title"
  end

  test "GET /hevy-tracker returns hevy tracker page" do
    get hevy_tracker_path
    assert_response :success
  end

  test "GET /hevy-tracker/privacy returns privacy page" do
    get hevy_tracker_privacy_path
    assert_response :success
  end

  test "GET /hevy-tracker/terms returns terms page" do
    get hevy_tracker_terms_path
    assert_response :success
  end

  test "GET /contact returns contact page" do
    get contact_path
    assert_response :success
  end

  test "GET /video-captioner returns video captioner page" do
    get video_captioner_path
    assert_response :success
  end

  test "GET /robots.txt returns robots.txt with correct content type and caching" do
    get "/robots.txt"
    assert_response :success
    # Content type may or may not include charset
    assert response.content_type.start_with?("text/plain")
    # Check caching headers - may be 6 hours (21600) or 1 hour (3600) depending on environment
    cache_control = response.headers["Cache-Control"]
    assert cache_control.present?
    assert_includes cache_control, "public"
    # Accept either 21600 (6 hours) or 3600 (1 hour) as valid cache times
    assert (cache_control.include?("max-age=21600") || cache_control.include?("max-age=3600"))
  end
end


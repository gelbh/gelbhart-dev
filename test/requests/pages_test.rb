require "test_helper"

class PagesTest < ActionDispatch::IntegrationTest
  test "GET / returns home page" do
    get root_path
    assert_response :success
    assert_select "title"
  end

  test "GET /projects/hevy-tracker returns hevy tracker page" do
    get hevy_tracker_path
    assert_response :success
  end

  test "GET /projects/hevy-tracker/privacy returns privacy page" do
    get hevy_tracker_privacy_path
    assert_response :success
  end

  test "GET /projects/hevy-tracker/terms returns terms page" do
    get hevy_tracker_terms_path
    assert_response :success
  end

  test "GET /hevy-tracker redirects to /projects/hevy-tracker" do
    get "/hevy-tracker"
    assert_redirected_to "/projects/hevy-tracker"
    assert_response :moved_permanently
  end

  test "GET /hevy-tracker/privacy redirects to /projects/hevy-tracker/privacy" do
    get "/hevy-tracker/privacy"
    assert_redirected_to "/projects/hevy-tracker/privacy"
    assert_response :moved_permanently
  end

  test "GET /hevy-tracker/terms redirects to /projects/hevy-tracker/terms" do
    get "/hevy-tracker/terms"
    assert_redirected_to "/projects/hevy-tracker/terms"
    assert_response :moved_permanently
  end

  test "GET /contact returns contact page" do
    get contact_path
    assert_response :success
  end

  test "GET /projects/video-captioner returns video captioner page" do
    get video_captioner_path
    assert_response :success
  end

  test "GET /video-captioner redirects to /projects/video-captioner" do
    get "/video-captioner"
    assert_redirected_to "/projects/video-captioner"
    assert_response :moved_permanently
  end

  test "GET /projects/nasa-exoplanet-explorer returns nasa exoplanet explorer page" do
    get nasa_exoplanet_explorer_path
    assert_response :success
  end

  test "GET /nasa-exoplanet-explorer redirects to /projects/nasa-exoplanet-explorer" do
    get "/nasa-exoplanet-explorer"
    assert_redirected_to "/projects/nasa-exoplanet-explorer"
    assert_response :moved_permanently
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

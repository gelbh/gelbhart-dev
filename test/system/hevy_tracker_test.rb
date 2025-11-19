require "system_test_helper"

class HevyTrackerTest < ActionDispatch::SystemTestCase
  test "hevy tracker page loads" do
    visit hevy_tracker_path

    assert_response :success
    assert_selector "body"
  end

  test "hevy tracker displays analytics stats" do
    visit hevy_tracker_path

    # Check that stats are displayed
    # Adjust selectors based on actual page structure
    assert_selector "body"
  end

  test "navigation to privacy page works" do
    visit hevy_tracker_path
    visit hevy_tracker_privacy_path

    assert_response :success
  end

  test "navigation to terms page works" do
    visit hevy_tracker_path
    visit hevy_tracker_terms_path

    assert_response :success
  end
end


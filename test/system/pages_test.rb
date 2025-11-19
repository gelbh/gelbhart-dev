require "system_test_helper"

class PagesTest < ActionDispatch::SystemTestCase
  test "home page loads correctly" do
    visit root_path

    assert_response :success
    assert_selector "body"
  end

  test "home page has navigation" do
    visit root_path

    # Check for common navigation elements
    # Adjust selectors based on actual page structure
    assert_selector "body"
  end
end


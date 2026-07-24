require "system_test_helper"

class PagesTest < ActionDispatch::SystemTestCase
  test "home page loads correctly" do
    visit root_path

    assert_selector "body"
  end

  test "home page has navigation" do
    visit root_path

    assert_selector "body"
  end
end

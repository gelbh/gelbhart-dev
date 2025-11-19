require "system_test_helper"

class ContactsTest < ActionDispatch::SystemTestCase
  setup do
    # Clear rate limit cache
    Rails.cache.rate_limit.clear
  end

  test "contact form submission with valid data" do
    visit contact_path

    fill_in "name", with: "Test User"
    fill_in "email", with: "test@example.com"
    fill_in "message", with: "This is a test message"

    # Add form_timestamp (hidden field)
    page.execute_script("document.querySelector('input[name=\"form_timestamp\"]').value = #{(5.seconds.ago.to_i)};") if page.has_selector?('input[name="form_timestamp"]', visible: false)

    # Wait a bit to simulate real user interaction
    sleep 0.1

    click_button "Send" # Adjust button text/selector based on actual form

    # Should redirect and show success message
    assert_current_path contact_path
    assert_text "Thank you! Your message has been sent successfully."
  end

  test "contact form shows validation errors for empty fields" do
    visit contact_path

    click_button "Send" # Submit empty form

    # Should show error message
    assert_text "Please fill in all fields correctly."
  end

  test "contact form rejects spam submissions" do
    visit contact_path

    fill_in "name", with: "Spam Bot"
    fill_in "email", with: "spam@example.com"
    fill_in "message", with: "Check out our SEO services!"

    # Submit too quickly (less than 3 seconds)
    page.execute_script("document.querySelector('input[name=\"form_timestamp\"]').value = #{(1.second.ago.to_i)};") if page.has_selector?('input[name="form_timestamp"]', visible: false)

    click_button "Send"

    assert_text "Please fill in all fields correctly."
  end
end


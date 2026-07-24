require "system_test_helper"

class ContactsTest < ActionDispatch::SystemTestCase
  setup do
    Rails.cache.rate_limit.clear if Rails.cache.respond_to?(:rate_limit)
  end

  test "contact form submission with valid data" do
    visit contact_path

    fill_in "name", with: "Test User"
    fill_in "email", with: "test@example.com"
    fill_in "message", with: "This is a test message"

    # Backdate timestamp past the 3s anti-spam window
    page.execute_script(<<~JS)
      var ts = document.querySelector('input[name="form_timestamp"]');
      if (ts) { ts.value = #{5.seconds.ago.to_i}; }
    JS

    click_button "./send_message"

    assert_current_path contact_path
    assert_text "Thank you! Your message has been sent successfully."
  end

  test "contact form shows validation errors for empty fields" do
    visit contact_path

    # HTML5 required would block submit; exercise server-side validation
    page.execute_script(<<~JS)
      document.querySelectorAll('[required]').forEach(function (el) {
        el.removeAttribute('required');
      });
    JS

    click_button "./send_message"

    assert_text "Please fill in all fields correctly."
  end

  test "contact form rejects spam submissions" do
    visit contact_path

    fill_in "name", with: "Spam Bot"
    fill_in "email", with: "spam@example.com"
    fill_in "message", with: "Check out our SEO services!"

    page.execute_script(<<~JS)
      var ts = document.querySelector('input[name="form_timestamp"]');
      if (ts) { ts.value = #{1.second.ago.to_i}; }
    JS

    click_button "./send_message"

    assert_text "Please fill in all fields correctly."
  end
end

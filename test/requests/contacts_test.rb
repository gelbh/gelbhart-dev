require "test_helper"

class ContactsTest < ActionDispatch::IntegrationTest
  include ApiHelpers
  setup do
    # Clear rate limit cache before each test
    # Rack::Attack uses its own cache store in test environment
    Rack::Attack.cache.store.clear if Rack::Attack.cache.store.respond_to?(:clear)
  end

  test "POST /contact with valid parameters redirects and enqueues email" do
    form_timestamp = 5.seconds.ago.to_i

    assert_enqueued_with(job: ActionMailer::MailDeliveryJob) do
      post contact_path, params: {
        name: "Test User",
        email: "test@example.com",
        message: "This is a test message",
        form_timestamp: form_timestamp
      }
    end

    assert_redirected_to contact_path
    assert_equal "Thank you! Your message has been sent successfully.", flash[:notice]
  end

  test "POST /contact with valid parameters returns JSON success" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }, as: :json

    json = assert_json_success
    assert_equal "Message sent successfully", json["message"]
  end

  test "POST /contact with missing name fails" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with invalid email format fails" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "invalid-email",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with empty message fails" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with honeypot field filled is rejected" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      website: "http://spam.com",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with form filled too fast is rejected" do
    form_timestamp = 1.second.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with missing timestamp is rejected" do
    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message"
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with future timestamp is rejected" do
    form_timestamp = 1.hour.from_now.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with timestamp too old is rejected" do
    form_timestamp = 2.hours.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with spam keywords is rejected" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "Check out our SEO services!",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact with multiple URLs is rejected" do
    form_timestamp = 5.seconds.ago.to_i

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "Visit http://example.com and https://another.com",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Please fill in all fields correctly.", flash[:alert]
    assert_no_enqueued_jobs
  end

  test "POST /contact allows single URL" do
    form_timestamp = 5.seconds.ago.to_i

    assert_enqueued_with(job: ActionMailer::MailDeliveryJob) do
      post contact_path, params: {
        name: "Test User",
        email: "test@example.com",
        message: "Visit http://example.com for more info",
        form_timestamp: form_timestamp
      }
    end

    assert_redirected_to contact_path
    assert_equal "Thank you! Your message has been sent successfully.", flash[:notice]
  end

  test "POST /contact rate limiting allows 3 submissions" do
    form_timestamp = 5.seconds.ago.to_i
    params = {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    # First 3 submissions should succeed
    3.times do
      post contact_path, params: params
      assert_redirected_to contact_path
      assert_equal "Thank you! Your message has been sent successfully.", flash[:notice]
      flash.clear
    end

    # 4th submission should be rate limited
    post contact_path, params: params
    follow_redirect!
    assert_equal "Too many submissions. Please try again later.", flash[:alert]
  end

  test "POST /contact rate limiting returns 429 for JSON requests" do
    form_timestamp = 5.seconds.ago.to_i
    params = {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    # Submit 3 times to reach limit
    3.times { post contact_path, params: params, as: :json }

    # 4th submission should return 429
    post contact_path, params: params, as: :json
    json = assert_json_error(429)
    assert_equal "Rate limit exceeded. Please try again later.", json["message"]
  end

  test "POST /contact handles mailer errors gracefully" do
    form_timestamp = 5.seconds.ago.to_i

    # Stub the mailer to raise an error during delivery
    # The controller catches StandardError, so stub deliver_later to raise
    mailer_instance = ContactMailer.contact_message(
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message"
    )
    mailer_instance.stubs(:deliver_later).raises(StandardError.new("Mail error"))
    ContactMailer.stubs(:contact_message).returns(mailer_instance)

    post contact_path, params: {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
      form_timestamp: form_timestamp
    }

    assert_redirected_to contact_path
    assert_equal "Sorry, there was an error sending your message. Please try emailing directly.", flash[:alert]
  ensure
    ContactMailer.unstub(:contact_message) if ContactMailer.respond_to?(:unstub)
  end

  test "POST /contact with valid timestamp at exactly 3 seconds passes" do
    form_timestamp = 3.seconds.ago.to_i

    assert_enqueued_with(job: ActionMailer::MailDeliveryJob) do
      post contact_path, params: {
        name: "Test User",
        email: "test@example.com",
        message: "This is a test message",
        form_timestamp: form_timestamp
      }
    end

    assert_redirected_to contact_path
    assert_equal "Thank you! Your message has been sent successfully.", flash[:notice]
  end
end

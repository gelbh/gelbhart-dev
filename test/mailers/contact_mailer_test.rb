require "test_helper"

class ContactMailerTest < ActionMailer::TestCase
  test "contact_message email is delivered" do
    assert_emails 1 do
      ContactMailer.contact_message(
        name: "Test User",
        email: "test@example.com",
        message: "This is a test message"
      ).deliver_now
    end
  end

  test "contact_message email has correct headers" do
    email = ContactMailer.contact_message(
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message"
    )

    assert_equal ["gelbharttomer@gmail.com"], email.to
    assert_equal "gelbharttomer@gmail.com", email.from.first
    assert_equal "New Contact Form Message from Test User", email.subject
    assert_equal "test@example.com", email.reply_to.first
  end

  test "contact_message email includes message content" do
    email = ContactMailer.contact_message(
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message"
    )

    # Email might be multipart (HTML and text), check both
    body_text = email.multipart? ? email.text_part.body.to_s : email.body.to_s
    assert_includes body_text, "Test User"
    assert_includes body_text, "test@example.com"
    assert_includes body_text, "This is a test message"
  end

  test "contact_message email renders template correctly" do
    email = ContactMailer.contact_message(
      name: "John Doe",
      email: "john@example.com",
      message: "Hello, this is my message."
    )

    # Email body should be present - check multipart or single part
    if email.multipart?
      assert email.body.parts.present?
      # At least one part should have content
      assert email.body.parts.any? { |part| part.body.to_s.present? }
    else
      assert email.body.to_s.present?
    end
  end
end


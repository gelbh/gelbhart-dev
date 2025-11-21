class ContactsController < ApplicationController
  # Rate limiting handled by Rack::Attack middleware (3 submissions per IP per hour)

  def create
    @name = params[:name]
    @email = params[:email]
    @message = params[:message]

    # Check spam protection measures
    if spam_detected?
      Rails.logger.warn "Spam detected from IP: #{request.remote_ip}"
      respond_to do |format|
        format.html { redirect_to contact_path, alert: "Please fill in all fields correctly." }
        format.json { render json: { success: false, message: "Invalid submission" }, status: :unprocessable_entity }
      end
      return
    end

    if valid_contact_params?
      begin
        ContactMailer.contact_message(
          name: @name,
          email: @email,
          message: @message
        ).deliver_later

        respond_to do |format|
          format.html { redirect_to contact_path, notice: "Thank you! Your message has been sent successfully." }
          format.json { render json: { success: true, message: "Message sent successfully" }, status: :ok }
        end
      rescue StandardError => e
        Rails.logger.error "Contact form error: #{e.message}"
        respond_to do |format|
          format.html { redirect_to contact_path, alert: "Sorry, there was an error sending your message. Please try emailing directly." }
          format.json { render json: { success: false, message: "Error sending message" }, status: :unprocessable_entity }
        end
      end
    else
      respond_to do |format|
        format.html { redirect_to contact_path, alert: "Please fill in all fields correctly." }
        format.json { render json: { success: false, message: "Invalid form data" }, status: :unprocessable_entity }
      end
    end
  end

  private

  def valid_contact_params?
    @name.present? && @email.present? && @message.present? && valid_email?(@email)
  end

  def valid_email?(email)
    EmailAddress.new(email).valid?
  rescue EmailAddress::Error
    false
  end

  def spam_detected?
    # 1. Honeypot check - if "website" field is filled, it's a bot
    return true if params[:website].present?

    # 2. Time-based check - form must be filled for at least 3 seconds
    if params[:form_timestamp].present?
      timestamp = params[:form_timestamp].to_i
      form_time = Time.at(timestamp)
      elapsed_time = Time.now - form_time

      # Validate timestamp is within reasonable range (0-3600 seconds ago)
      # Reject if: future timestamp, too old (>1 hour), or too fast (<3s)
      return true if elapsed_time < 3.seconds      # Too fast (bot)
      return true if elapsed_time > 3600.seconds   # Too old (suspicious)
      return true if elapsed_time < 0              # Future timestamp (manipulated)
    else
      # No timestamp provided - assume bot (fail closed)
      return true
    end

    # 3. Spam keyword detection
    spam_keywords = [
      "seo", "backlinks", "ranking", "promotion", "seobests",
      "upgrade your website", "increase your search", "click here",
      "buy now", "limited offer", "act now", "make money",
      "work from home", "weight loss", "cryptocurrency", "bitcoin",
      "casino", "viagra", "cialis", "pharmacy"
    ]

    message_lower = @message.to_s.downcase
    return true if spam_keywords.any? { |keyword| message_lower.include?(keyword) }

    # 4. Link spam detection - reject if message has multiple URLs
    url_count = @message.to_s.scan(/https?:\/\/|www\./).length
    return true if url_count > 1

    false
  end
end

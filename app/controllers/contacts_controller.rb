class ContactsController < ApplicationController
  # Rate limiting: max 3 submissions per IP per hour
  before_action :check_rate_limit, only: :create

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
    email.match?(/\A[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\z/)
  end

  def spam_detected?
    # 1. Honeypot check - if "website" field is filled, it's a bot
    return true if params[:website].present?

    # 2. Time-based check - form must be filled for at least 3 seconds
    if params[:form_timestamp].present?
      form_time = Time.at(params[:form_timestamp].to_i)
      return true if (Time.now - form_time) < 3.seconds
    end

    # 3. Spam keyword detection
    spam_keywords = [
      'seo', 'backlinks', 'ranking', 'promotion', 'seobests',
      'upgrade your website', 'increase your search', 'click here',
      'buy now', 'limited offer', 'act now', 'make money',
      'work from home', 'weight loss', 'cryptocurrency', 'bitcoin',
      'casino', 'viagra', 'cialis', 'pharmacy'
    ]

    message_lower = @message.to_s.downcase
    return true if spam_keywords.any? { |keyword| message_lower.include?(keyword) }

    # 4. Link spam detection - reject if message has multiple URLs
    url_count = @message.to_s.scan(/https?:\/\/|www\./).length
    return true if url_count > 1

    false
  end

  def check_rate_limit
    # Use dedicated rate limit cache with size limits to prevent unbounded growth
    cache_key = "contact_form_#{request.remote_ip}"
    submission_count = Rails.cache.rate_limit.read(cache_key) || 0

    if submission_count >= 3
      respond_to do |format|
        format.html { redirect_to contact_path, alert: "Too many submissions. Please try again later." }
        format.json { render json: { success: false, message: "Rate limit exceeded" }, status: :too_many_requests }
      end
      return false  # Halt the before_action chain
    else
      Rails.cache.rate_limit.write(cache_key, submission_count + 1, expires_in: 1.hour)
    end
  end
end

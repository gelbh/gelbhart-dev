class ContactsController < ApplicationController
  def create
    @name = params[:name]
    @email = params[:email]
    @message = params[:message]

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
    email.match?(/\A[^@\s]+@[^@\s]+\z/)
  end
end

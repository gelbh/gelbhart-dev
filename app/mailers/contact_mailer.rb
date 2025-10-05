class ContactMailer < ApplicationMailer
  default from: "noreply@gelbhart.dev"

  def contact_message(name:, email:, message:)
    @name = name
    @email = email
    @message = message

    mail(
      to: "tomer@gelbhart.dev",
      subject: "New Contact Form Message from #{@name}",
      reply_to: @email
    )
  end
end

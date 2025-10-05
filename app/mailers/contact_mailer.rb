class ContactMailer < ApplicationMailer
  default from: "gelbharttomer@gmail.com"

  def contact_message(name:, email:, message:)
    @name = name
    @email = email
    @message = message

    mail(
      to: "gelbharttomer@gmail.com",
      subject: "New Contact Form Message from #{@name}",
      reply_to: @email
    )
  end
end

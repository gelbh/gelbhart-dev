# Contact Form Email Setup

The contact form is now configured and ready to use! Here's what you need to know:

## Development

In development mode, emails are set to `:test` delivery method, which means:
- Emails won't actually be sent
- They'll be logged in the Rails console/logs
- You can test the form functionality without real email delivery

To see emails in your browser during development, you can optionally install `letter_opener`:
1. Add to Gemfile: `gem 'letter_opener', group: :development`
2. Run: `bundle install`
3. Update `config/environments/development.rb`: Change `config.action_mailer.delivery_method = :test` to `:letter_opener`

## Production Email Setup

To enable actual email sending in production, you need to configure SMTP credentials.

### Recommended Email Services:
- **Gmail** (free for low volume)
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 1000 emails/month)
- **AWS SES** (cheap, reliable)
- **Postmark** (developer-friendly)

### Setting Up Environment Variables in Render:

1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Add these environment variables:

```
SMTP_ADDRESS=smtp.gmail.com          # Or your SMTP provider
SMTP_PORT=587                        # Usually 587 for TLS
SMTP_DOMAIN=gelbhart.dev
SMTP_USERNAME=your-email@gmail.com   # Your email
SMTP_PASSWORD=your-app-password      # App-specific password
```

### Gmail Setup (Example):
1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security > 2-Step Verification > App passwords
   - Create new app password for "Mail"
3. Use this app password as `SMTP_PASSWORD`

### SendGrid Setup (Recommended for Production):
1. Sign up at https://sendgrid.com
2. Create an API key
3. Set environment variables:
   ```
   SMTP_ADDRESS=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_DOMAIN=gelbhart.dev
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   ```

## Testing the Contact Form

1. Visit `/contact` on your website
2. Fill out the form with:
   - Name
   - Email address
   - Message
3. Click "Send Message"
4. You should receive an email at `tomer@gelbhart.dev`

## Customization

### Change Recipient Email:
Edit `app/mailers/contact_mailer.rb`:
```ruby
mail(
  to: "your-email@example.com",  # Change this
  subject: "New Contact Form Message from #{@name}",
  reply_to: @email
)
```

### Customize Email Template:
- HTML version: `app/views/contact_mailer/contact_message.html.erb`
- Text version: `app/views/contact_mailer/contact_message.text.erb`

### Change "From" Address:
Edit `app/mailers/contact_mailer.rb`:
```ruby
default from: "your-custom@gelbhart.dev"  # Change this
```

## Security Notes

- Form includes CSRF protection automatically
- Email validation is performed server-side
- Uses Rails' built-in sanitization for email content
- Environment variables keep SMTP credentials secure

## Troubleshooting

If emails aren't sending:
1. Check Render logs for errors
2. Verify all SMTP environment variables are set correctly
3. Test SMTP credentials with a mail client
4. Check spam folder for test emails
5. Ensure your email provider allows SMTP access

#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Ruby dependencies
bundle install

# Install Node dependencies
npm install

# Build Dart Sass stylesheets
bundle exec rails dartsass:build

# Run database migrations
bundle exec rails db:migrate RAILS_ENV=production

# Run database seeds
bundle exec rails db:seed RAILS_ENV=production

# Clean old assets before recompiling
bundle exec rake assets:clobber

# Compile assets
bundle exec rake assets:precompile
bundle exec rake assets:clean

# Generate sitemap
bundle exec rake sitemap:generate

# Generate IndexNow key file if API key is set in Rails credentials
# The key file must be publicly accessible at https://gelbhart.dev/{key}.txt
INDEXNOW_API_KEY=$(bundle exec rails runner "puts Rails.application.credentials.indexnow_api_key" 2>/dev/null || echo "")
if [ -n "$INDEXNOW_API_KEY" ]; then
  echo "Generating IndexNow key file..."
  echo "$INDEXNOW_API_KEY" > public/${INDEXNOW_API_KEY}.txt
  echo "IndexNow key file created: public/${INDEXNOW_API_KEY}.txt"
else
  echo "Warning: indexnow_api_key not set in Rails credentials, skipping IndexNow key file generation"
fi
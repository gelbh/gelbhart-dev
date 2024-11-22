#!/usr/bin/env bash
# exit on error
set -o errexit

# Create necessary asset directories
mkdir -p app/assets/builds
mkdir -p app/assets/images
mkdir -p app/assets/stylesheets/theme

# Install dependencies
bundle install

# Clean assets
bundle exec rake assets:clean

# Precompile assets
RAILS_ENV=production SECRET_KEY_BASE=dummy bundle exec rake assets:precompile

# Run database migrations
bundle exec rake db:migrate
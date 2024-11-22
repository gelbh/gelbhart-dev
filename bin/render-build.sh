#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Install npm packages
npm install bootstrap @popperjs/core

# Create necessary asset directories
mkdir -p app/assets/builds
mkdir -p app/assets/images
mkdir -p app/assets/stylesheets/theme
mkdir -p vendor/assets/stylesheets

# Copy Bootstrap SCSS files to vendor
cp -r node_modules/bootstrap/scss vendor/assets/stylesheets/bootstrap

# Clean assets
bundle exec rake assets:clean

# Precompile assets with proper environment
RAILS_ENV=production SECRET_KEY_BASE=dummy bundle exec rake assets:precompile

# Run database migrations
bundle exec rake db:migrate
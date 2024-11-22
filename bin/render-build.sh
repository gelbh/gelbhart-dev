#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Install npm packages
npm install

# Clean existing precompiled assets
bundle exec rake assets:clean

# Clear any cached assets
rm -rf tmp/cache/assets

# Precompile assets
RAILS_ENV=production SECRET_KEY_BASE=dummy bundle exec rake assets:precompile

# Run database migrations
bundle exec rake db:migrate
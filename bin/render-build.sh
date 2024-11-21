#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Create required directories
mkdir -p app/assets/builds
mkdir -p app/assets/stylesheets
mkdir -p app/javascript
mkdir -p vendor/javascript

# Clean assets
bundle exec rails assets:clean

# Precompile assets
bundle exec rails assets:precompile

# Run migrations
bundle exec rails db:migrate
#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Install node modules if needed
if [ -f package.json ]; then
  npm install
fi

# Create required directories
mkdir -p app/assets/builds
mkdir -p app/assets/stylesheets
mkdir -p app/javascript
mkdir -p vendor/javascript

# Clean assets
RAILS_ENV=production bundle exec rake assets:clean

# Precompile assets
RAILS_ENV=production EXECJS_RUNTIME=Node bundle exec rake assets:precompile

# Run migrations
bundle exec rails db:migrate
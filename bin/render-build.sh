#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Ruby dependencies
bundle install

# Install Node dependencies
npm install

# Run database migrations
bundle exec rails db:migrate RAILS_ENV=production

# Run database seeds (idempotent - safe to run on every deploy)
bundle exec rails db:seed RAILS_ENV=production

# Clean old assets before recompiling
bundle exec rake assets:clobber

# Compile assets
bundle exec rake assets:precompile
bundle exec rake assets:clean
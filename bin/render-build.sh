#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Ruby dependencies
bundle install

# Install Node dependencies
npm install

# Compile assets
bundle exec rake assets:precompile
bundle exec rake assets:clean

# Note: Database migrations should be run separately or during startup
# They are not run here because the database may not be available during build
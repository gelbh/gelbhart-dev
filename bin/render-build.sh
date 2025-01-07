#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Compile assets
bundle exec rake assets:precompile
bundle exec rake assets:clean

# Set up database
bundle exec rake db:migrate
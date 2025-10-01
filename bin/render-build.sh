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
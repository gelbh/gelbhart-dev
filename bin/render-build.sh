#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Ruby dependencies
bundle install

# Install Node dependencies
npm install

# Install Python dependencies for video captioner
pip install -r requirements.txt

# Compile assets
bundle exec rake assets:precompile
bundle exec rake assets:clean
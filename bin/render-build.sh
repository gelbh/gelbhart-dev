#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Ruby dependencies
bundle install

# Install Node dependencies
npm install

# NUCLEAR OPTION: Remove all possible cached assets
echo "==== Removing old assets ===="
rm -rfv public/assets || true
rm -rfv tmp/cache || true
ls -la public/ || true

# Ensure public/assets doesn't exist
if [ -d "public/assets" ]; then
  echo "ERROR: public/assets still exists after deletion!"
  exit 1
fi

bundle exec rake assets:clobber

# Compile assets fresh
echo "==== Precompiling assets ===="
bundle exec rake assets:precompile

# Verify new assets were created
if [ ! -d "public/assets" ]; then
  echo "ERROR: public/assets was not created!"
  exit 1
fi

echo "==== Listing compiled assets ===="
ls -la public/assets/ | head -20

bundle exec rake assets:clean

# Note: Database migrations should be run separately or during startup
# They are not run here because the database may not be available during build
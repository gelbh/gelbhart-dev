# Capybara configuration for system tests
require "capybara/rails"
require "capybara/minitest"

Capybara.default_driver = :selenium_chrome_headless
Capybara.javascript_driver = :selenium_chrome_headless

# Use headless Chrome in CI, regular Chrome locally
if ENV["CI"]
  Capybara.default_driver = :selenium_chrome_headless
  Capybara.javascript_driver = :selenium_chrome_headless
else
  Capybara.default_driver = :selenium_chrome
  Capybara.javascript_driver = :selenium_chrome
end

# Configure wait time for async operations
Capybara.default_max_wait_time = 5

# Screenshot configuration
Capybara.save_path = Rails.root.join("tmp", "screenshots")


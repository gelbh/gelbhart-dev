require "test_helper"
require "capybara/rails"
require "capybara/minitest"

# Selenium talks to ChromeDriver on localhost; WebMock must allow it.
WebMock.disable_net_connect!(allow_localhost: true)

class ActionDispatch::SystemTestCase
  # Prefer Rails :headless_chrome in CI — Selenium 4 rejects options: { args: ... }.
  if ENV["CI"]
    driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]
  else
    driven_by :selenium, using: :chrome, screen_size: [ 1400, 1400 ]
  end

  # Screenshot on failure
  def take_failed_screenshot
    super
  rescue StandardError => e
    Rails.logger.error "Failed to take screenshot: #{e.message}"
  end
end

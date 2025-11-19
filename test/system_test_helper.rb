require "test_helper"
require "capybara/rails"
require "capybara/minitest"

class ActionDispatch::SystemTestCase
  driven_by :selenium, using: :chrome, screen_size: [1400, 1400], options: {
    args: ENV["CI"] ? ["headless", "disable-gpu", "no-sandbox"] : []
  }

  # Screenshot on failure
  def take_failed_screenshot
    super
  rescue StandardError => e
    Rails.logger.error "Failed to take screenshot: #{e.message}"
  end
end


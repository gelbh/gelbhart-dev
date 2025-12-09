# SimpleCov is initialized in bin/rails before Rails loads when COVERAGE=true
# If not already started (e.g., direct test execution), start it here if COVERAGE is enabled
if ENV["COVERAGE"] == "true"
  unless defined?(SimpleCov) && SimpleCov.running
    require "simplecov"
    SimpleCov.merge_timeout 3600
    SimpleCov.command_name "rails test"

    # Set minimum coverage requirement
    minimum_cov = ENV["SKIP_COVERAGE_CHECK"] ? 0 : 80

    SimpleCov.start "rails" do
      add_filter "/test/"
      add_filter "/config/"
      add_filter "/db/"
      add_filter "/vendor/"
      add_filter "/lib/tasks/"

      add_group "Models", "app/models"
      add_group "Controllers", "app/controllers"
      add_group "Services", "app/services"
      add_group "Mailers", "app/mailers"
      add_group "Jobs", "app/jobs"

      minimum_coverage minimum_cov
    end
  end
end

ENV["RAILS_ENV"] ||= "test"
ENV.delete("DATABASE_URL") if ENV["DATABASE_URL"].present?

require_relative "../config/environment"
require "rails/test_help"

# Automatically maintain test database schema to match development
# This ensures migrations are applied to the test database before running tests
# maintain_test_schema! will automatically prepare the test database if needed
ActiveRecord::Migration.maintain_test_schema!
require "webmock/minitest"
require "shoulda/matchers"
require "mocha/minitest"

# Require support files
Dir[Rails.root.join("test", "support", "**", "*.rb")].each { |f| require f }

# Configure shoulda-matchers
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :minitest
    with.library :rails
  end
end

class ActiveSupport::TestCase
  # Always enable parallelization for fast test runs
  # SimpleCov (when enabled via COVERAGE=true) will run sequentially for accurate coverage
  # When COVERAGE=true, parallelization is automatically disabled
  if defined?(SimpleCov) && SimpleCov.running
    # Don't parallelize when SimpleCov is running for accurate coverage
  else
    parallelize(workers: :number_of_processors)
  end

  # FactoryBot is used for test data instead of fixtures
  # Include FactoryBot syntax methods
  include FactoryBot::Syntax::Methods

  # Configure ActiveJob to use test adapter
  ActiveJob::Base.queue_adapter = :test

  # Clear mail deliveries before each test
  setup do
    ActionMailer::Base.deliveries.clear
  end
end

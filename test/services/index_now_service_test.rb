require "test_helper"
require "digest"

class IndexNowServiceTest < ActiveSupport::TestCase
  setup do
    @service = IndexNowService.new
    @test_api_key = "test_api_key_12345678901234567890"

    # Stub Rails credentials with nested structure
    @mock_credentials = {
      indexnow: {
        api_key: @test_api_key
      }
    }
    # Make mock support dig method
    def @mock_credentials.dig(*keys)
      keys.reduce(self) { |obj, key| obj&.[](key) }
    end
    Rails.application.stubs(:credentials).returns(@mock_credentials)

    # Clear cache before each test
    Rails.cache.clear
  end

  teardown do
    Rails.application.unstub(:credentials) if Rails.application.respond_to?(:unstub)
    WebMock.reset!
    Rails.cache.clear
  end

  test "notify returns false in development environment" do
    Rails.env.stubs(:production?).returns(false)
    Rails.env.stubs(:staging?).returns(false)

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal false, result
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
    Rails.env.unstub(:staging?) if Rails.env.respond_to?(:unstub)
  end

  test "notify returns false when API key is missing" do
    Rails.env.stubs(:production?).returns(true)
    @mock_credentials[:indexnow][:api_key] = nil

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal false, result
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify returns false for empty URLs" do
    Rails.env.stubs(:production?).returns(true)

    assert_equal false, @service.notify([])
    assert_equal false, @service.notify("")
    assert_equal false, @service.notify(nil)
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify sends successful request for single URL" do
    Rails.env.stubs(:production?).returns(true)

    stub_request = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .with(
        body: ->(body) {
          json = JSON.parse(body)
          json["host"] == "https://gelbhart.dev" &&
          json["key"] == @test_api_key &&
          json["urlList"] == [ "https://gelbhart.dev/test" ]
        },
        headers: {
          "Content-Type" => "application/json"
        }
      )
      .to_return(status: 202, body: "")

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal true, result
    assert_requested stub_request
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify sends successful request for multiple URLs" do
    Rails.env.stubs(:production?).returns(true)

    urls = [
      "https://gelbhart.dev/test1",
      "https://gelbhart.dev/test2",
      "https://gelbhart.dev/test3"
    ]

    stub_request = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .with(
        body: ->(body) {
          json = JSON.parse(body)
          json["host"] == "https://gelbhart.dev" &&
          json["key"] == @test_api_key &&
          json["urlList"].sort == urls.sort
        }
      )
      .to_return(status: 202, body: "")

    result = @service.notify(urls)

    assert_equal true, result
    assert_requested stub_request
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify normalizes relative URLs to absolute" do
    Rails.env.stubs(:production?).returns(true)
    # Set default_url_options for URL normalization
    original_options = Rails.application.config.action_mailer.default_url_options
    Rails.application.config.action_mailer.default_url_options = { host: "gelbhart.dev" }

    stub_request = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .with(
        body: ->(body) {
          json = JSON.parse(body)
          json["urlList"].any? { |url| url.start_with?("https://gelbhart.dev") }
        }
      )
      .to_return(status: 202, body: "")

    result = @service.notify("/test")

    assert_equal true, result
    assert_requested stub_request
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
    Rails.application.config.action_mailer.default_url_options = original_options if defined?(original_options)
  end

  test "notify handles HTTP errors gracefully" do
    Rails.env.stubs(:production?).returns(true)

    WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_return(status: 500, body: "Internal Server Error")

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal false, result
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify handles network errors gracefully" do
    Rails.env.stubs(:production?).returns(true)

    WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_raise(SocketError.new("Connection refused"))

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal false, result
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify handles timeout errors gracefully" do
    Rails.env.stubs(:production?).returns(true)

    WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_timeout

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal false, result
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify implements rate limiting" do
    Rails.env.stubs(:production?).returns(true)

    # Use memory store for this test since test environment uses null_store
    original_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new

    # First notification should succeed
    stub1 = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_return(status: 202, body: "")

    result1 = @service.notify("https://gelbhart.dev/test")
    assert_equal true, result1
    assert_requested stub1, times: 1

    # Verify the URL is now in the rate limit cache
    cache_key = "indexnow:rate_limit:#{Digest::MD5.hexdigest('https://gelbhart.dev/test')}"
    assert Rails.cache.exist?(cache_key), "URL should be in rate limit cache"

    # Second notification for same URL should be rate limited (skipped)
    result2 = @service.notify("https://gelbhart.dev/test")
    assert_equal false, result2, "Second notification should be rate limited and return false"

    # Verify no additional request was made (still only 1 total)
    assert_requested stub1, times: 1
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
    Rails.cache = original_cache if defined?(original_cache)
  end

  test "notify removes duplicate URLs" do
    Rails.env.stubs(:production?).returns(true)

    urls = [
      "https://gelbhart.dev/test",
      "https://gelbhart.dev/test",
      "https://gelbhart.dev/test"
    ]

    stub_request = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .with(
        body: ->(body) {
          json = JSON.parse(body)
          json["urlList"] == [ "https://gelbhart.dev/test" ]
        }
      )
      .to_return(status: 202, body: "")

    result = @service.notify(urls)

    assert_equal true, result
    assert_requested stub_request
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify filters out blank URLs" do
    Rails.env.stubs(:production?).returns(true)

    urls = [
      "https://gelbhart.dev/test",
      "",
      "   ",
      nil,
      "https://gelbhart.dev/test2"
    ]

    stub_request = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .with(
        body: ->(body) {
          json = JSON.parse(body)
          url_list = json["urlList"]
          url_list.include?("https://gelbhart.dev/test") &&
          url_list.include?("https://gelbhart.dev/test2") &&
          url_list.size == 2
        }
      )
      .to_return(status: 202, body: "")

    result = @service.notify(urls)

    assert_equal true, result
    assert_requested stub_request
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify accepts 200 status as success" do
    Rails.env.stubs(:production?).returns(true)

    WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_return(status: 200, body: "")

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal true, result
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end
end

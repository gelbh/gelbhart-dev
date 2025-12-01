require "test_helper"

class IndexNowServiceTest < ActiveSupport::TestCase
  setup do
    @service = IndexNowService.new
    @original_env = ENV.to_h.dup
    @test_api_key = "test_api_key_12345678901234567890"
    ENV["INDEXNOW_API_KEY"] = @test_api_key

    # Clear cache before each test
    Rails.cache.clear
  end

  teardown do
    ENV.clear
    ENV.update(@original_env)
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
    ENV.delete("INDEXNOW_API_KEY")

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
        body: hash_including(
          host: "https://gelbhart.dev",
          key: @test_api_key,
          urlList: [ "https://gelbhart.dev/test" ]
        ),
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
        body: hash_including(
          host: "https://gelbhart.dev",
          key: @test_api_key,
          urlList: urls
        )
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

    stub_request = WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .with(
        body: hash_including(
          urlList: array_including(match(/^https:\/\/gelbhart\.dev/))
        )
      )
      .to_return(status: 202, body: "")

    result = @service.notify("/test")

    assert_equal true, result
    assert_requested stub_request
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
  end

  test "notify handles HTTP errors gracefully" do
    Rails.env.stubs(:production?).returns(true)

    WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_return(status: 500, body: "Internal Server Error")

    result = @service.notify("https://gelbhart.dev/test")

    assert_equal false, result
  ensure
    Rails.env.unstub(:production?).returns(false) if Rails.env.respond_to?(:unstub)
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

    # First notification should succeed
    WebMock.stub_request(:post, "https://api.indexnow.org/IndexNow")
      .to_return(status: 202, body: "")

    result1 = @service.notify("https://gelbhart.dev/test")
    assert_equal true, result1

    # Second notification for same URL should be rate limited (skipped)
    result2 = @service.notify("https://gelbhart.dev/test")
    assert_equal false, result2

    # Verify only one request was made
    assert_requested :post, "https://api.indexnow.org/IndexNow", times: 1
  ensure
    Rails.env.unstub(:production?) if Rails.env.respond_to?(:unstub)
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
        body: hash_including(
          urlList: [ "https://gelbhart.dev/test" ]
        )
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
        body: hash_including(
          urlList: array_including("https://gelbhart.dev/test", "https://gelbhart.dev/test2")
        )
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

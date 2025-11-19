require "test_helper"

class HealthTest < ActionDispatch::IntegrationTest
  include ApiHelpers
  test "GET /_up returns 200 with health status" do
    get "/_up"
    json = assert_json_response(200)

    assert_equal "ok", json["status"]
    assert json.key?("timestamp")
    assert_equal "connected", json["database"]
    assert json.key?("memory_mb")
    assert json["memory_mb"].is_a?(Numeric)
  end

  test "GET /_up includes current timestamp" do
    get "/_up"
    json = json_response

    timestamp = Time.parse(json["timestamp"])
    assert timestamp <= Time.current
    assert timestamp >= 1.second.ago
  end

  test "GET /_up returns 503 on database connection failure" do
    # Mock the connection pool to raise an error
    ActiveRecord::Base.connection_pool.stubs(:with_connection).raises(PG::ConnectionBad.new("Connection failed"))
    
    get "/_up"
    json = assert_json_response(503)

    assert_equal "error", json["status"]
    assert_includes json["message"], "Database connection failed"
  ensure
    ActiveRecord::Base.connection_pool.unstub(:with_connection) if ActiveRecord::Base.connection_pool.respond_to?(:unstub)
  end
end


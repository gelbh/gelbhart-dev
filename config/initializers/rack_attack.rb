# Rack::Attack configuration for rate limiting
require "rack/attack"

# Use memory store in test environment for rate limiting to work
if Rails.env.test?
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
end

Rack::Attack.throttle("contact_form/ip", limit: 3, period: 1.hour) do |req|
  req.ip if req.path == "/contact" && req.post?
end

# Custom response for throttled requests
Rack::Attack.throttled_responder = lambda do |request|
  match_data = request.env["rack.attack.match_data"]
  now = match_data[:epoch_time]

  retry_after = (match_data[:period] - (now % match_data[:period])).to_i

  # Check if request is JSON by looking at Accept header or Content-Type
  accept_header = request.env["HTTP_ACCEPT"] || ""
  content_type = request.env["CONTENT_TYPE"] || ""
  is_json = accept_header.include?("application/json") || content_type.include?("application/json")

  if is_json
    [
      429,
      {
        "Content-Type" => "application/json; charset=utf-8",
        "Retry-After" => retry_after.to_s
      },
      [ { success: false, message: "Rate limit exceeded. Please try again later." }.to_json ]
    ]
  else
    # For HTML requests, redirect with query parameter so controller can set flash
    [
      302,
      {
        "Location" => "/contact?rate_limited=true",
        "Retry-After" => retry_after.to_s
      },
      []
    ]
  end
end

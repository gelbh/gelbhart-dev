# Rack::Attack configuration for rate limiting
require "rack/attack"

Rack::Attack.throttle("contact_form/ip", limit: 3, period: 1.hour) do |req|
  req.ip if req.path == "/contact" && req.post?
end

# Custom response for throttled requests
Rack::Attack.throttled_responder = lambda do |request|
  match_data = request.env["rack.attack.match_data"]
  now = match_data[:epoch_time]

  retry_after = (match_data[:period] - (now % match_data[:period])).to_i

  if request.format.json?
    [
      429,
      {
        "Content-Type" => "application/json",
        "Retry-After" => retry_after.to_s
      },
      [ { success: false, message: "Rate limit exceeded. Please try again later." }.to_json ]
    ]
  else
    # For HTML requests, redirect with alert
    [
      302,
      {
        "Location" => "/contact",
        "Retry-After" => retry_after.to_s
      },
      []
    ]
  end
end

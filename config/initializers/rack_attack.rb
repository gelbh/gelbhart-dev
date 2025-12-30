# Rack::Attack configuration for rate limiting
require "rack/attack"

# Use memory store in test environment for rate limiting to work
if Rails.env.test?
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
end

Rack::Attack.throttle("contact_form/ip", limit: 3, period: 1.hour) do |req|
  req.ip if req.path == "/contact" && req.post?
end

# Block vulnerability scanners and bots probing for common exploits
Rack::Attack.blocklist("scanner_probes") do |req|
  # WordPress paths
  req.path.start_with?("/wp-") ||
  req.path.start_with?("/wordpress") ||
  # PHP files
  req.path.end_with?(".php") ||
  # Config/sensitive files
  req.path.start_with?("/.env") ||
  req.path.start_with?("/.git") ||
  req.path.start_with?("/.svn") ||
  # Common exploit paths
  req.path.start_with?("/cgi-bin") ||
  req.path.downcase.include?("phpmyadmin") ||
  # ACME probes (remove if using Let's Encrypt directly)
  req.path.start_with?("/.well-known/")
end

# Minimal response for blocked requests
Rack::Attack.blocklisted_responder = lambda do |_request|
  [ 403, { "Content-Type" => "text/plain" }, [ "Forbidden" ] ]
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

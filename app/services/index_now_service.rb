# Service class for IndexNow protocol implementation.
# IndexNow allows website owners to instantly inform search engines
# (Bing, Yandex, Naver, Seznam.cz, Yep) about content changes.
#
# See: https://www.indexnow.org/
class IndexNowService
  # IndexNow API endpoint
  INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow".freeze

  # Rate limiting: minimum seconds between notifications for the same URL
  RATE_LIMIT_SECONDS = 5.minutes

  # HTTP timeout in seconds
  HTTP_TIMEOUT = 10

  # Notify IndexNow about URL changes
  #
  # @param urls [String, Array<String>] Single URL or array of URLs to notify
  # @return [Boolean] true if notification was sent successfully, false otherwise
  def notify(urls)
    return false unless should_notify?

    urls = Array(urls).map { |url| normalize_url(url) }.compact.uniq
    return false if urls.empty?

    # Filter out URLs that were recently notified (rate limiting)
    urls = filter_rate_limited_urls(urls)
    return false if urls.empty?

    api_key = fetch_api_key
    return false if api_key.blank?

    result = send_notification(urls, api_key)
    mark_urls_as_notified(urls) if result
    result
  rescue StandardError => e
    log_error("IndexNow notification failed", e, urls: urls)
    false
  end

  private

  def should_notify?
    # Only send notifications in production and staging environments
    Rails.env.production? || Rails.env.staging?
  end

  def normalize_url(url)
    return nil if url.blank?

    # Ensure URL is absolute
    url = url.to_s.strip
    return nil if url.empty?

    # If relative URL, make it absolute
    unless url.start_with?("http://", "https://")
      base_host = Rails.application.config.action_mailer.default_url_options[:host] ||
                  "gelbhart.dev"
      # Remove protocol if present
      base_host = base_host.gsub(/^https?:\/\//, "")
      # Use HTTPS by default for production sites
      protocol = "https"
      url = "#{protocol}://#{base_host}#{url.start_with?("/") ? "" : "/"}#{url}"
    end

    url
  end

  def filter_rate_limited_urls(urls)
    urls.reject do |url|
      cache_key = rate_limit_cache_key(url)
      Rails.cache.exist?(cache_key)
    end
  end

  def rate_limit_cache_key(url)
    "indexnow:rate_limit:#{Digest::MD5.hexdigest(url)}"
  end

  def mark_urls_as_notified(urls)
    urls.each do |url|
      cache_key = rate_limit_cache_key(url)
      Rails.cache.write(cache_key, true, expires_in: RATE_LIMIT_SECONDS)
    end
  end

  def fetch_api_key
    Rails.application.credentials.indexnow_api_key&.strip.presence
  end

  def send_notification(urls, api_key)
    uri = URI(INDEXNOW_ENDPOINT)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = HTTP_TIMEOUT
    http.read_timeout = HTTP_TIMEOUT

    # IndexNow accepts POST requests with JSON payload
    # Build JSON payload
    payload = {
      host: extract_host(urls.first),
      key: api_key,
      urlList: urls
    }

    request = Net::HTTP::Post.new(uri.path)
    request["Content-Type"] = "application/json"
    request.body = payload.to_json

    response = http.request(request)

    if response.is_a?(Net::HTTPSuccess) || response.code == "202"
      log_success("IndexNow notification sent successfully", urls: urls, count: urls.size)
      true
    else
      log_error("IndexNow notification failed with status #{response.code}", nil, urls: urls, response: response.body)
      false
    end
  rescue Net::TimeoutError, Net::OpenTimeout, Errno::ECONNREFUSED, SocketError => e
    log_error("IndexNow network error", e, urls: urls)
    false
  end

  def extract_host(url)
    uri = URI.parse(url)
    "#{uri.scheme}://#{uri.host}"
  rescue URI::InvalidURIError
    "https://gelbhart.dev"
  end

  def log_success(message, **context)
    Rails.logger.info("[IndexNow] #{message}") if Rails.logger
    Rails.logger.debug("[IndexNow] Context: #{context.inspect}") if Rails.logger&.debug?
  end

  def log_error(message, error = nil, **context)
    error_message = error ? "#{message}: #{error.class} - #{error.message}" : message
    Rails.logger.error("[IndexNow] #{error_message}") if Rails.logger
    Rails.logger.error("[IndexNow] Context: #{context.inspect}") if Rails.logger
    Rails.logger.error("[IndexNow] Backtrace: #{error.backtrace.join("\n")}") if error&.backtrace && Rails.logger
  end
end

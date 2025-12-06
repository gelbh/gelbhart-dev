# app/services/page_speed_service.rb
require "net/http"
require "uri"
require "json"
require "digest"
require "rexml/document"

class PageSpeedService
  API_BASE_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  DEFAULT_HOST = "https://gelbhart.dev"

  def initialize
    @api_key = Rails.application.credentials.pagespeed_api_key
  end

  def analyze_url(url, strategy: "desktop")
    return error_response("API key not configured") unless @api_key.present?

    cache_key = "pagespeed_#{Digest::MD5.hexdigest("#{url}_#{strategy}")}"

    Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
      fetch_page_speed_data(url, strategy)
    end
  rescue StandardError => e
    Rails.logger.error "PageSpeed API Error for #{url}: #{e.message}"
    error_response("Failed to analyze URL: #{e.message}")
  end

  def analyze_all_pages(strategy: "desktop")
    return error_response("API key not configured") unless @api_key.present?

    urls = get_site_urls
    results = {}

    urls.each do |url|
      results[url] = analyze_url(url, strategy: strategy)
      # Small delay to avoid rate limiting
      sleep(0.5) if urls.length > 1
    end

    {
      success: true,
      strategy: strategy,
      total_pages: urls.length,
      results: results
    }
  rescue StandardError => e
    Rails.logger.error "PageSpeed API Error: #{e.message}"
    error_response("Failed to analyze pages: #{e.message}")
  end

  def get_site_urls
    # Extract URLs from generated sitemap.xml file
    # This ensures we use the same source of truth as the sitemap
    sitemap_path = Rails.public_path.join("sitemap.xml")

    # Fallback to hardcoded list if sitemap doesn't exist
    unless sitemap_path.exist?
      Rails.logger.warn "Sitemap not found at #{sitemap_path}, using fallback URLs"
      return get_fallback_urls
    end

    begin
      # Parse sitemap XML using REXML (built-in Ruby library)
      doc = REXML::Document.new(File.read(sitemap_path))
      urls = []

      # Extract all <loc> elements from the sitemap
      REXML::XPath.each(doc, "//url/loc") do |loc_element|
        url = loc_element.text.to_s.strip
        # Only include URLs from our domain
        urls << url if url.start_with?(DEFAULT_HOST)
      end

      # Return URLs, or fallback if none found
      urls.any? ? urls : get_fallback_urls
    rescue StandardError => e
      Rails.logger.error "Failed to parse sitemap: #{e.message}"
      get_fallback_urls
    end
  end

  def get_fallback_urls
    # Fallback URLs if sitemap parsing fails
    # These match the sitemap configuration
    [
      "#{DEFAULT_HOST}/",
      "#{DEFAULT_HOST}/projects/hevy-tracker",
      "#{DEFAULT_HOST}/projects/hevy-tracker/privacy",
      "#{DEFAULT_HOST}/projects/hevy-tracker/terms",
      "#{DEFAULT_HOST}/contact",
      "#{DEFAULT_HOST}/projects/video-captioner",
      "#{DEFAULT_HOST}/projects/nasa-exoplanet-explorer"
    ]
  end

  private

  def fetch_page_speed_data(url, strategy)
    uri = URI(API_BASE_URL)
    params = {
      url: url,
      key: @api_key,
      strategy: strategy,
      category: [ "performance", "accessibility", "best-practices", "seo" ]
    }
    uri.query = URI.encode_www_form(params)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = 60

    response = http.get(uri.request_uri)

    unless response.is_a?(Net::HTTPSuccess)
      raise StandardError.new("API returned #{response.code}: #{response.message}")
    end

    data = JSON.parse(response.body)
    parse_page_speed_response(data, url, strategy)
  end

  def parse_page_speed_response(data, url, strategy)
    lighthouse_result = data.dig("lighthouseResult")
    loading_experience = data.dig("loadingExperience")

    return error_response("Invalid API response") unless lighthouse_result

    # Extract performance scores
    categories = lighthouse_result.dig("categories") || {}
    performance_score = categories.dig("performance", "score")
    accessibility_score = categories.dig("accessibility", "score")
    best_practices_score = categories.dig("best-practices", "score")
    seo_score = categories.dig("seo", "score")

    # Extract Core Web Vitals and metrics
    audits = lighthouse_result.dig("audits") || {}

    metrics = {
      first_contentful_paint: extract_metric_value(audits, "first-contentful-paint"),
      largest_contentful_paint: extract_metric_value(audits, "largest-contentful-paint"),
      cumulative_layout_shift: extract_metric_value(audits, "cumulative-layout-shift"),
      total_blocking_time: extract_metric_value(audits, "total-blocking-time"),
      speed_index: extract_metric_value(audits, "speed-index"),
      time_to_interactive: extract_metric_value(audits, "interactive"),
      first_input_delay: extract_metric_value(audits, "max-potential-fid")
    }

    # Extract opportunities (optimization suggestions)
    opportunities = extract_opportunities(audits)

    # Extract diagnostics
    diagnostics = extract_diagnostics(audits)

    # Real-world metrics from loading experience (if available)
    real_world_metrics = {}
    if loading_experience
      metrics_data = loading_experience.dig("metrics") || {}
      real_world_metrics = {
        first_contentful_paint: metrics_data.dig("FIRST_CONTENTFUL_PAINT_MS", "percentile"),
        largest_contentful_paint: metrics_data.dig("LARGEST_CONTENTFUL_PAINT_MS", "percentile"),
        first_input_delay: metrics_data.dig("FIRST_INPUT_DELAY_MS", "percentile"),
        cumulative_layout_shift: metrics_data.dig("CUMULATIVE_LAYOUT_SHIFT_SCORE", "percentile")
      }
    end

    {
      success: true,
      url: url,
      strategy: strategy,
      scores: {
        performance: score_to_percentage(performance_score),
        accessibility: score_to_percentage(accessibility_score),
        best_practices: score_to_percentage(best_practices_score),
        seo: score_to_percentage(seo_score)
      },
      metrics: metrics,
      real_world_metrics: real_world_metrics,
      opportunities: opportunities,
      diagnostics: diagnostics,
      fetch_time: lighthouse_result.dig("fetchTime")
    }
  end

  def extract_metric_value(audits, key)
    audit = audits[key]
    return nil unless audit

    numeric_value = audit.dig("numericValue")
    display_value = audit.dig("displayValue")

    {
      value: numeric_value,
      display_value: display_value,
      score: audit.dig("score")
    }
  end

  def extract_opportunities(audits)
    opportunities = []

    # Key opportunity audits
    opportunity_keys = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "offscreen-images",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
      "uses-text-compression",
      "uses-optimized-images",
      "uses-responsive-images",
      "uses-webp-images"
    ]

    opportunity_keys.each do |key|
      audit = audits[key]
      next unless audit && audit.dig("score") && audit.dig("score") < 1.0

      opportunities << {
        id: key,
        title: audit.dig("title"),
        description: audit.dig("description"),
        score: audit.dig("score"),
        numeric_value: audit.dig("numericValue"),
        display_value: audit.dig("displayValue"),
        details: audit.dig("details")
      }
    end

    opportunities.sort_by { |o| o[:score] || 1.0 }
  end

  def extract_diagnostics(audits)
    diagnostics = []

    # Key diagnostic audits
    diagnostic_keys = [
      "dom-size",
      "long-tasks",
      "third-party-summary",
      "largest-contentful-paint-element",
      "layout-shift-elements",
      "network-server-latency",
      "mainthread-work-breakdown"
    ]

    diagnostic_keys.each do |key|
      audit = audits[key]
      next unless audit

      diagnostics << {
        id: key,
        title: audit.dig("title"),
        description: audit.dig("description"),
        score: audit.dig("score"),
        numeric_value: audit.dig("numericValue"),
        display_value: audit.dig("displayValue"),
        details: audit.dig("details")
      }
    end

    diagnostics
  end

  def score_to_percentage(score)
    return nil unless score
    (score * 100).round
  end

  def error_response(message)
    {
      success: false,
      error: message
    }
  end
end

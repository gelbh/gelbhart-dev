# app/controllers/api/page_speed_controller.rb
module Api
  class PageSpeedController < ApplicationController
    # Enable caching for 10 minutes to avoid hitting API rate limits
    before_action :set_cache_headers
    before_action :authenticate_token

    def analyze
      url = params[:url]
      strategy = params[:strategy] || "desktop"

      # Validate strategy
      unless %w[desktop mobile].include?(strategy)
        render json: { error: "Invalid strategy. Must be 'desktop' or 'mobile'" }, status: :bad_request
        return
      end

      service = PageSpeedService.new

      if url.present?
        # Analyze single URL (synchronous)
        result = service.analyze_url(url, strategy: strategy)
        render json: result
      else
        # Analyze all pages (async via background job)
        job_id = SecureRandom.uuid
        PageSpeedAnalysisJob.perform_later(job_id, strategy: strategy)

        render json: {
          status: "queued",
          job_id: job_id,
          message: "Bulk analysis started. Use /api/pagespeed/status?job_id=#{job_id} to check progress.",
          status_url: "/api/pagespeed/status?job_id=#{job_id}"
        }
      end
    rescue StandardError => e
      Rails.logger.error "PageSpeed API Error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      render json: { error: "Failed to analyze pagespeed data: #{e.message}" }, status: :internal_server_error
    end

    def status
      job_id = params[:job_id]

      unless job_id.present?
        render json: { error: "job_id parameter is required" }, status: :bad_request
        return
      end

      cached_result = Rails.cache.read("pagespeed_job_#{job_id}")

      unless cached_result
        render json: { error: "Job not found. It may have expired or never existed." }, status: :not_found
        return
      end

      render json: cached_result
    end

    private

    def authenticate_token
      expected_token = ENV["PAGESPEED_API_TOKEN"]

      # If token is not configured, allow access (for development)
      return if expected_token.blank?

      provided_token = params[:token] || request.headers["X-Pagespeed-Token"]

      unless provided_token == expected_token
        render json: { error: "Unauthorized. Valid token required." }, status: :unauthorized
      end
    end

    def set_cache_headers
      expires_in 10.minutes, public: false
    end
  end
end

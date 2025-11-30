# app/controllers/api/analytics_controller.rb
module Api
  class AnalyticsController < ApplicationController
    # Enable caching for 5 minutes to avoid hitting API rate limits
    before_action :set_cache_headers

    def hevy_tracker_stats
      stats = Rails.cache.fetch("hevy_tracker_analytics", expires_in: 5.minutes) do
        GoogleAnalyticsService.new.fetch_hevy_tracker_stats
      end

      render json: stats
    rescue StandardError => e
      Rails.logger.error "Analytics API Error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n") if Rails.env.development?
      render json: { error: "Failed to fetch analytics data" }, status: :internal_server_error
    end

    private

    def set_cache_headers
      expires_in 5.minutes, public: true
    end
  end
end

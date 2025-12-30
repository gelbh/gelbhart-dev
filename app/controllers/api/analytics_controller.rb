# app/controllers/api/analytics_controller.rb
module Api
  class AnalyticsController < ApplicationController
    # Enable caching for 5 minutes to avoid hitting API rate limits
    before_action :set_cache_headers

    # Always returns analytics data with source metadata
    # Response includes :source ("fresh", "fallback", or "defaults")
    # and :stale (true when data is not fresh from the API)
    def hevy_tracker_stats
      stats = Rails.cache.fetch("hevy_tracker_analytics", expires_in: 5.minutes) do
        GoogleAnalyticsService.new.fetch_hevy_tracker_stats
      end

      render json: stats
    end

    private

    def set_cache_headers
      expires_in 5.minutes, public: true
    end
  end
end

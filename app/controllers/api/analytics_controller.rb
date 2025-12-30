module Api
  class AnalyticsController < ApplicationController
    CACHE_TTL = 5.minutes

    before_action :set_cache_headers

    def hevy_tracker_stats
      stats = Rails.cache.fetch(GoogleAnalyticsService::CACHE_KEY, expires_in: CACHE_TTL) do
        GoogleAnalyticsService.new.fetch_hevy_tracker_stats
      end

      render json: stats
    end

    private

    def set_cache_headers
      expires_in CACHE_TTL, public: true
    end
  end
end

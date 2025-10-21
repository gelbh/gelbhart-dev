class HealthController < ApplicationController
  # Simple health check endpoint that pings the database
  # This keeps both the app and Supabase active
  def show
    # Check database connectivity
    ActiveRecord::Base.connection.execute("SELECT 1")

    render json: {
      status: "ok",
      timestamp: Time.current,
      database: "connected"
    }, status: :ok
  rescue => e
    render json: {
      status: "error",
      message: e.message
    }, status: :service_unavailable
  end
end

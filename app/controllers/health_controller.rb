class HealthController < ApplicationController
  # Simple health check endpoint that pings the database
  # This keeps both the app and Supabase active
  def show
    # Use with_connection to ensure proper connection management
    ActiveRecord::Base.connection_pool.with_connection do |conn|
      conn.execute("SELECT 1")
    end

    render json: {
      status: "ok",
      timestamp: Time.current,
      database: "connected"
    }, status: :ok
  rescue PG::ConnectionBad, ActiveRecord::ConnectionNotEstablished => e
    render json: {
      status: "error",
      message: "Database connection failed: #{e.message}"
    }, status: :service_unavailable
  rescue => e
    render json: {
      status: "error",
      message: e.message
    }, status: :service_unavailable
  end
end

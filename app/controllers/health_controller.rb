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
      database: "connected",
      memory_mb: get_memory_usage_mb
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

  private

  # Helper method to get current process memory usage in MB
  def get_memory_usage_mb
    return 0 unless File.exist?("/proc/self/status")

    status = File.read("/proc/self/status")
    if status =~ /VmRSS:\s+(\d+)\s+kB/
      ($1.to_f / 1024).round(2)
    else
      0
    end
  rescue
    0
  end
end

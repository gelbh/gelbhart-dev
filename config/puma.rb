# Puma can serve each request in a thread from an internal thread pool.
worker_count = ENV.fetch("WEB_CONCURRENCY") { 0 }.to_i
workers worker_count if worker_count > 0

max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Server on 0.0.0.0 to allow external access
bind "tcp://0.0.0.0:#{ENV.fetch("PORT") { 8080 }}"

# Specifies the `environment` that Puma will run in.
environment ENV.fetch("RAILS_ENV") { "development" }

# Specifies the `pidfile` that Puma will use.
pidfile ENV.fetch("PIDFILE") { "tmp/pids/server.pid" }

# Allow puma to be restarted by `rails restart` command.
plugin :tmp_restart

# Only use cluster mode features when in cluster mode (multiple workers)
if worker_count > 0
  preload_app!

  before_worker_boot do
    ActiveRecord::Base.establish_connection if defined?(ActiveRecord)

    # Log memory usage on worker boot for monitoring
    if defined?(Rails) && Rails.logger
      memory_mb = get_memory_usage_mb
      Rails.logger.info "Puma worker booted - Memory: #{memory_mb} MB"
    end
  end
end

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

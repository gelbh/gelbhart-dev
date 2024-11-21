# Puma can serve each request in a thread from an internal thread pool.
max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Specifies the `port` that Puma will listen on to receive requests
port ENV.fetch("PORT") { 3000 }

# Specifies the `environment` that Puma will run in.
environment ENV.fetch("RAILS_ENV") { "development" }

if ENV["RAILS_ENV"] == "development"
  # Development-specific settings
  worker_timeout 3600
else
  # Production settings
  workers ENV.fetch("WEB_CONCURRENCY") { 2 }
  preload_app!
end

# Allow puma to be restarted by `rails restart` command.
plugin :tmp_restart

on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

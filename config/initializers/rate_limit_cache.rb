# Dedicated cache store for rate limiting
# Uses memory store with strict size limits and LRU eviction
# to prevent unbounded growth from many unique IPs
Rails.application.config.after_initialize do
  Rails.cache.instance_variable_set(
    :@rate_limit_cache,
    ActiveSupport::Cache::MemoryStore.new(
      size: 10.megabytes,  # Limit to 10MB (enough for ~100k IP entries)
      expires_in: 1.hour    # Auto-expire old entries
    )
  )
  
  # Accessor method for rate limit cache
  Rails.cache.define_singleton_method(:rate_limit) do
    @rate_limit_cache
  end
end


# Persistent storage for analytics data to provide fallback when API fails
class AnalyticsCacheRecord < ApplicationRecord
  validates :key, presence: true, uniqueness: true
  validates :data, presence: true
  validates :fetched_at, presence: true

  # Store analytics data for a given key
  # @param key [String] Unique identifier for the analytics data (e.g., "hevy_tracker_analytics")
  # @param data [Hash] The analytics data to store
  # @return [AnalyticsCacheRecord] The created or updated record
  def self.store(key, data)
    record = find_or_initialize_by(key: key)
    record.update!(data: data, fetched_at: Time.current)
    record
  end

  # Retrieve analytics data for a given key
  # @param key [String] Unique identifier for the analytics data
  # @return [Hash, nil] The stored data or nil if not found
  def self.retrieve(key)
    find_by(key: key)&.data
  end

  # Retrieve analytics data with metadata
  # @param key [String] Unique identifier for the analytics data
  # @return [Hash, nil] Hash with :data and :fetched_at or nil if not found
  def self.retrieve_with_metadata(key)
    record = find_by(key: key)
    return nil unless record

    {
      data: record.data,
      fetched_at: record.fetched_at
    }
  end

  # Check if cached data exists for a key
  # @param key [String] Unique identifier for the analytics data
  # @return [Boolean] True if data exists
  def self.exists_for?(key)
    exists?(key: key)
  end
end

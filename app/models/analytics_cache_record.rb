# Persistent storage for analytics data to provide fallback when API fails
class AnalyticsCacheRecord < ApplicationRecord
  validates :key, presence: true, uniqueness: true
  validates :data, presence: true
  validates :fetched_at, presence: true

  class << self
    def store(key, data)
      record = find_or_initialize_by(key:)
      record.update!(data:, fetched_at: Time.current)
      record
    end

    def retrieve(key)
      find_by(key:)&.data
    end

    def retrieve_with_metadata(key)
      find_by(key:)&.then { |r| { data: r.data, fetched_at: r.fetched_at } }
    end

    def exists_for?(key)
      exists?(key:)
    end
  end
end

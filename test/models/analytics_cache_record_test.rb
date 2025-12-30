require "test_helper"

class AnalyticsCacheRecordTest < ActiveSupport::TestCase
  setup do
    # Clear any existing test data
    AnalyticsCacheRecord.delete_all
  end

  teardown do
    AnalyticsCacheRecord.delete_all
  end

  test "store creates new record" do
    data = { active_users: 100, page_views: 500 }

    record = AnalyticsCacheRecord.store("test_key", data)

    assert record.persisted?
    assert_equal "test_key", record.key
    assert_equal({ "active_users" => 100, "page_views" => 500 }, record.data)
    assert_not_nil record.fetched_at
  end

  test "store updates existing record" do
    # Create initial record
    AnalyticsCacheRecord.store("test_key", { value: 1 })

    # Update it
    AnalyticsCacheRecord.store("test_key", { value: 2 })

    # Should still be only one record
    assert_equal 1, AnalyticsCacheRecord.where(key: "test_key").count

    record = AnalyticsCacheRecord.find_by(key: "test_key")
    assert_equal({ "value" => 2 }, record.data)
  end

  test "retrieve returns stored data" do
    data = { active_users: 100, page_views: 500 }
    AnalyticsCacheRecord.store("test_key", data)

    retrieved = AnalyticsCacheRecord.retrieve("test_key")

    assert_equal({ "active_users" => 100, "page_views" => 500 }, retrieved)
  end

  test "retrieve returns nil for non-existent key" do
    result = AnalyticsCacheRecord.retrieve("non_existent_key")

    assert_nil result
  end

  test "retrieve_with_metadata returns data and fetched_at" do
    data = { active_users: 100 }
    AnalyticsCacheRecord.store("test_key", data)

    result = AnalyticsCacheRecord.retrieve_with_metadata("test_key")

    assert_not_nil result
    assert_equal({ "active_users" => 100 }, result[:data])
    assert result[:fetched_at].is_a?(Time)
  end

  test "retrieve_with_metadata returns nil for non-existent key" do
    result = AnalyticsCacheRecord.retrieve_with_metadata("non_existent_key")

    assert_nil result
  end

  test "exists_for? returns true when record exists" do
    AnalyticsCacheRecord.store("test_key", { value: 1 })

    assert AnalyticsCacheRecord.exists_for?("test_key")
  end

  test "exists_for? returns false when record does not exist" do
    assert_not AnalyticsCacheRecord.exists_for?("non_existent_key")
  end

  test "validates presence of key" do
    record = AnalyticsCacheRecord.new(data: { value: 1 }, fetched_at: Time.current)

    assert_not record.valid?
    assert_includes record.errors[:key], "can't be blank"
  end

  test "validates uniqueness of key" do
    AnalyticsCacheRecord.create!(key: "unique_key", data: { value: 1 }, fetched_at: Time.current)

    duplicate = AnalyticsCacheRecord.new(key: "unique_key", data: { value: 2 }, fetched_at: Time.current)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:key], "has already been taken"
  end

  test "validates presence of fetched_at" do
    record = AnalyticsCacheRecord.new(key: "test_key", data: { value: 1 })

    assert_not record.valid?
    assert_includes record.errors[:fetched_at], "can't be blank"
  end
end

class CreateAnalyticsCacheRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :analytics_cache_records do |t|
      t.string :key, null: false
      t.jsonb :data, null: false, default: {}
      t.datetime :fetched_at, null: false

      t.timestamps
    end
    add_index :analytics_cache_records, :key, unique: true
  end
end

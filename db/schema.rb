# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2025_12_30_161752) do
  # These are extensions that must be enabled in order to support this database
  # Note: Supabase-specific extensions (pg_graphql, supabase_vault) are handled
  # conditionally in db/migrate/20251208214526_enable_optional_postgres_extensions.rb
  enable_extension "extensions.pg_stat_statements"
  enable_extension "extensions.pgcrypto"
  enable_extension "extensions.uuid-ossp"
  enable_extension "plpgsql"

  create_table "pacman_scores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "is_win"
    t.datetime "played_at"
    t.string "player_name"
    t.integer "score"
    t.datetime "updated_at", null: false
    t.index ["player_name", "score", "played_at"], name: "index_pacman_scores_on_player_score_played", order: { score: :desc, played_at: :desc }
    t.index ["score"], name: "index_pacman_scores_on_score_desc", order: :desc
  end

  create_table "projects", force: :cascade do |t|
    t.jsonb "badges", default: []
    t.string "color"
    t.datetime "created_at", null: false
    t.text "description", null: false
    t.boolean "featured", default: true, null: false
    t.string "github_url"
    t.string "icon"
    t.string "link_icon", default: "bx-right-arrow-alt"
    t.string "link_rel"
    t.string "link_target"
    t.string "link_text"
    t.string "link_url"
    t.integer "position"
    t.boolean "published", default: true, null: false
    t.string "route_name"
    t.string "subtitle", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["featured"], name: "index_projects_on_featured"
    t.index ["position"], name: "index_projects_on_position"
    t.index ["published"], name: "index_projects_on_published"
  end

  create_table "analytics_cache_records", force: :cascade do |t|
    t.string "key", null: false
    t.jsonb "data", default: {}, null: false
    t.datetime "fetched_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_analytics_cache_records_on_key", unique: true
  end
end

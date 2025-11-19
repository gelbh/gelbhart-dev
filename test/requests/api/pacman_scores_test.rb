require "test_helper"

class Api::PacmanScoresTest < ActionDispatch::IntegrationTest
  include ApiHelpers
  setup do
    # Clear existing scores
    PacmanScore.destroy_all
  end

  test "GET /api/pacman_scores/global returns leaderboard" do
    score1 = create(:pacman_score, player_name: "Player1", score: 1000, played_at: 1.day.ago)
    score2 = create(:pacman_score, player_name: "Player2", score: 2000, played_at: 2.days.ago)
    score3 = create(:pacman_score, player_name: "Player3", score: 1500, played_at: Time.current)

    get "/api/pacman_scores/global"
    json = assert_json_response(200)

    assert json.key?("leaderboard")
    assert_equal 3, json["leaderboard"].length
    assert_equal "Player2", json["leaderboard"].first["player_name"]
    assert_equal 2000, json["leaderboard"].first["score"]
  end

  test "GET /api/pacman_scores/global returns distinct players only" do
    create(:pacman_score, player_name: "Player1", score: 1000, played_at: 1.day.ago)
    create(:pacman_score, player_name: "Player1", score: 500, played_at: 2.days.ago)
    create(:pacman_score, player_name: "Player1", score: 1500, played_at: Time.current)
    create(:pacman_score, player_name: "Player2", score: 2000, played_at: 1.day.ago)

    get "/api/pacman_scores/global"
    json = assert_json_response(200)

    assert_equal 2, json["leaderboard"].length
    player_names = json["leaderboard"].map { |s| s["player_name"] }
    assert_equal 1, player_names.count("Player1")
    assert_equal 1, player_names.count("Player2")
  end

  test "GET /api/pacman_scores/global limits to 100 entries" do
    105.times { |i| create(:pacman_score, player_name: "Player#{i}", score: 1000 + i) }

    get "/api/pacman_scores/global"
    json = assert_json_response(200)

    assert_equal 100, json["leaderboard"].length
  end

  test "GET /api/pacman_scores/global orders by score DESC then played_at DESC" do
    create(:pacman_score, player_name: "Player1", score: 1000, played_at: 1.day.ago)
    create(:pacman_score, player_name: "Player2", score: 2000, played_at: 2.days.ago)
    create(:pacman_score, player_name: "Player3", score: 1500, played_at: Time.current)

    get "/api/pacman_scores/global"
    json = assert_json_response(200)

    assert_equal "Player2", json["leaderboard"][0]["player_name"]
    assert_equal "Player3", json["leaderboard"][1]["player_name"]
    assert_equal "Player1", json["leaderboard"][2]["player_name"]
  end

  test "GET /api/pacman_scores/global response structure is correct" do
    create(:pacman_score, player_name: "Player1", score: 1000, is_win: true, played_at: Time.current)

    get "/api/pacman_scores/global"
    json = assert_json_response(200)

    score = json["leaderboard"].first
    assert score.key?("player_name")
    assert score.key?("score")
    assert score.key?("is_win")
    assert score.key?("played_at")
  end

  test "GET /api/pacman_scores/player/:player_name returns all scores for player" do
    player_name = "TestPlayer"
    create(:pacman_score, player_name: player_name, score: 1000, played_at: 1.day.ago)
    create(:pacman_score, player_name: player_name, score: 2000, played_at: 2.days.ago)
    create(:pacman_score, player_name: player_name, score: 1500, played_at: Time.current)
    create(:pacman_score, player_name: "OtherPlayer", score: 5000)

    get "/api/pacman_scores/player/#{player_name}"
    json = assert_json_response(200)

    assert_equal player_name, json["player_name"]
    assert_equal 3, json["scores"].length
    assert_equal 2000, json["scores"].first["score"]
  end

  test "GET /api/pacman_scores/player/:player_name returns 400 for blank player name" do
    # Empty route param will result in 404, need to test with blank value
    get "/api/pacman_scores/player/%20"  # URL-encoded space
    json = assert_json_error(400)

    assert_equal "Player name is required", json["error"]
  end

  test "GET /api/pacman_scores/player/:player_name returns empty array for non-existent player" do
    get "/api/pacman_scores/player/NonExistentPlayer"
    json = assert_json_response(200)

    assert_equal "NonExistentPlayer", json["player_name"]
    assert_equal [], json["scores"]
  end

  test "POST /api/pacman_scores creates score with valid parameters" do
    post "/api/pacman_scores", params: {
      pacman_score: {
        player_name: "NewPlayer",
        score: 5000,
        is_win: true
      }
    }, as: :json

    json = assert_json_response(201)

    assert json["success"]
    assert_equal "NewPlayer", json["score"]["player_name"]
    assert_equal 5000, json["score"]["score"]
    assert json["score"].key?("played_at")
    assert json.key?("is_high_score")
  end

  test "POST /api/pacman_scores auto-assigns played_at when not provided" do
    post "/api/pacman_scores", params: {
      pacman_score: {
        player_name: "NewPlayer",
        score: 5000,
        is_win: true
      }
    }, as: :json

    json = assert_json_response(201)
    assert json["score"]["played_at"].present?

    score = PacmanScore.find_by(player_name: "NewPlayer")
    assert score.played_at.present?
    assert score.played_at <= Time.current
  end

  test "POST /api/pacman_scores returns 422 for missing player_name" do
    post "/api/pacman_scores", params: {
      pacman_score: {
        score: 5000,
        is_win: true
      }
    }, as: :json

    json = assert_json_error(422)

    assert_not json["success"]
    assert json["errors"].present?
  end

  test "POST /api/pacman_scores returns 422 for negative score" do
    post "/api/pacman_scores", params: {
      pacman_score: {
        player_name: "NewPlayer",
        score: -1,
        is_win: true
      }
    }, as: :json

    json = assert_json_error(422)

    assert_not json["success"]
    assert json["errors"].any? { |e| e.include?("greater than") }
  end

  test "POST /api/pacman_scores returns 422 for invalid is_win" do
    # Rails coerces "maybe" to true, so use nil or an integer instead
    post "/api/pacman_scores", params: {
      pacman_score: {
        player_name: "NewPlayer",
        score: 5000,
        is_win: nil
      }
    }, as: :json

    json = assert_json_error(422)

    assert_not json["success"]
    assert json["errors"].present?
  end

  test "POST /api/pacman_scores detects high score correctly" do
    # Create 99 scores to test high score detection
    99.times { |i| create(:pacman_score, player_name: "Player#{i}", score: 1000 + i) }

    post "/api/pacman_scores", params: {
      pacman_score: {
        player_name: "NewPlayer",
        score: 50000,
        is_win: true
      }
    }, as: :json

    json = assert_json_response(201)
    assert json["is_high_score"]
  end

  test "POST /api/pacman_scores skips CSRF token" do
    # API endpoints should skip CSRF verification
    post "/api/pacman_scores", params: {
      pacman_score: {
        player_name: "NewPlayer",
        score: 5000,
        is_win: true
      }
    }, as: :json

    # Should succeed without CSRF token
    assert_response :created
  end
end


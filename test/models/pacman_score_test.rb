require "test_helper"

class PacmanScoreTest < ActiveSupport::TestCase
  # Validations using shoulda-matchers
  test "validates presence of player_name" do
    score = build(:pacman_score, player_name: nil)
    assert_not score.valid?
    assert_includes score.errors[:player_name], "can't be blank"
  end

  test "validates length of player_name is at most 50" do
    score = build(:pacman_score, player_name: "a" * 51)
    assert_not score.valid?
    assert_includes score.errors[:player_name], "is too long (maximum is 50 characters)"
  end

  test "validates presence of score" do
    score = build(:pacman_score, score: nil)
    assert_not score.valid?
    assert_includes score.errors[:score], "can't be blank"
  end

  test "validates score is greater than or equal to 0" do
    score = build(:pacman_score, score: -1)
    assert_not score.valid?
    assert_includes score.errors[:score], "must be greater than or equal to 0"
  end

  test "validates presence of is_win" do
    score = build(:pacman_score, is_win: nil)
    assert_not score.valid?
    # Boolean inclusion validation may catch nil first
    assert score.errors[:is_win].any? { |e| e.include?("blank") || e.include?("included") }
  end

  test "validates is_win is included in [true, false]" do
    # Use a value that won't be coerced to boolean (like 0 or 1)
    # Rails converts truthy strings to true, so we need to test with nil or a number
    score = build(:pacman_score, is_win: nil)
    assert_not score.valid?
    # Check that there's an error about inclusion (nil is not in [true, false])
    assert score.errors[:is_win].present?
    # The error message should mention inclusion
    error_messages = score.errors[:is_win].map(&:to_s).join(" ")
    assert error_messages.include?("included") || error_messages.include?("list"), "Expected inclusion error, got: #{error_messages}"
  end

  test "validates presence of played_at" do
    score = build(:pacman_score, played_at: nil)
    assert_not score.valid?
    assert_includes score.errors[:played_at], "can't be blank"
  end

  test "valid score with all required attributes" do
    score = build(:pacman_score)
    assert score.valid?
  end

  # Scopes
  test "global_leaderboard returns distinct players only" do
    player1 = create(:pacman_score, player_name: "Player1", score: 1000, played_at: 1.day.ago)
    player1_lower = create(:pacman_score, player_name: "Player1", score: 500, played_at: 2.days.ago)
    player1_higher = create(:pacman_score, player_name: "Player1", score: 1500, played_at: Time.current)
    player2 = create(:pacman_score, player_name: "Player2", score: 2000, played_at: 1.day.ago)

    leaderboard = PacmanScore.global_leaderboard

    assert_equal 2, leaderboard.count
    assert_includes leaderboard.map(&:player_name), "Player1"
    assert_includes leaderboard.map(&:player_name), "Player2"
    # Should have Player1's highest score (1500), not the lower ones
    player1_entry = leaderboard.find { |s| s.player_name == "Player1" }
    assert_equal 1500, player1_entry.score
  end

  test "global_leaderboard orders by score DESC then played_at DESC" do
    score1 = create(:pacman_score, player_name: "Player1", score: 1000, played_at: 1.day.ago)
    score2 = create(:pacman_score, player_name: "Player2", score: 2000, played_at: 2.days.ago)
    score3 = create(:pacman_score, player_name: "Player3", score: 1500, played_at: Time.current)

    leaderboard = PacmanScore.global_leaderboard

    assert_equal "Player2", leaderboard.first.player_name
    assert_equal "Player3", leaderboard.second.player_name
    assert_equal "Player1", leaderboard.third.player_name
  end

  test "global_leaderboard limits to 100 entries" do
    105.times { |i| create(:pacman_score, player_name: "Player#{i}", score: 1000 + i) }

    leaderboard = PacmanScore.global_leaderboard

    assert_equal 100, leaderboard.count
  end

  test "global_leaderboard returns empty array when no scores" do
    leaderboard = PacmanScore.global_leaderboard
    assert_equal 0, leaderboard.count
  end

  test "player_scores returns all scores for a player ordered by score DESC" do
    player_name = "TestPlayer"
    score1 = create(:pacman_score, player_name: player_name, score: 1000, played_at: 1.day.ago)
    score2 = create(:pacman_score, player_name: player_name, score: 2000, played_at: 2.days.ago)
    score3 = create(:pacman_score, player_name: player_name, score: 1500, played_at: Time.current)
    create(:pacman_score, player_name: "OtherPlayer", score: 5000)

    scores = PacmanScore.player_scores(player_name)

    assert_equal 3, scores.count
    assert_equal 2000, scores.first.score
    assert_equal 1500, scores.second.score
    assert_equal 1000, scores.third.score
  end

  test "player_scores returns empty array for non-existent player" do
    scores = PacmanScore.player_scores("NonExistentPlayer")
    assert_equal 0, scores.count
  end

  test "player_high_score returns highest score for a player" do
    player_name = "TestPlayer"
    create(:pacman_score, player_name: player_name, score: 1000)
    high_score = create(:pacman_score, player_name: player_name, score: 5000)
    create(:pacman_score, player_name: player_name, score: 2000)

    # The scope already calls .first, so it should return the record directly
    high = PacmanScore.player_high_score(player_name)

    assert_not_nil high
    assert_equal high_score.id, high.id
    assert_equal 5000, high.score
  end

  test "player_high_score returns nil for non-existent player" do
    # The scope returns a relation with .first, but Rails scopes are lazy
    # So we need to check if it's an empty relation or nil
    high = PacmanScore.player_high_score("NonExistentPlayer")
    # Scope might return relation or nil depending on Rails version
    assert high.nil? || (high.respond_to?(:empty?) && high.empty?)
  end

  test "global_leaderboard handles same player with multiple scores correctly" do
    player_name = "MultiScorePlayer"
    # Create multiple scores for same player
    create(:pacman_score, player_name: player_name, score: 1000, played_at: 3.days.ago)
    create(:pacman_score, player_name: player_name, score: 2000, played_at: 2.days.ago)
    highest = create(:pacman_score, player_name: player_name, score: 3000, played_at: 1.day.ago)
    create(:pacman_score, player_name: "OtherPlayer", score: 1500)

    leaderboard = PacmanScore.global_leaderboard

    # Should only have one entry for MultiScorePlayer
    player_entries = leaderboard.select { |s| s.player_name == player_name }
    assert_equal 1, player_entries.count
    assert_equal highest.id, player_entries.first.id
    assert_equal 3000, player_entries.first.score
  end
end

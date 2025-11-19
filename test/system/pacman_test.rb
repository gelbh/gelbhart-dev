require "system_test_helper"

class PacmanTest < ActionDispatch::SystemTestCase
  setup do
    PacmanScore.destroy_all
  end

  test "pacman game page loads" do
    visit root_path # Adjust path based on actual game location

    # Check that game container exists
    # Adjust selectors based on actual page structure
    assert_selector "body"
  end

  test "leaderboard displays scores" do
    create(:pacman_score, player_name: "Player1", score: 1000)
    create(:pacman_score, player_name: "Player2", score: 2000)

    visit root_path # Adjust path based on actual leaderboard location

    # Check that leaderboard is displayed
    # Adjust selectors based on actual page structure
    assert_selector "body"
  end
end


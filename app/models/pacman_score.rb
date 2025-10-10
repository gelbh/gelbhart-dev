class PacmanScore < ApplicationRecord
  validates :player_name, presence: true, length: { maximum: 50 }
  validates :score, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :is_win, inclusion: { in: [true, false] }
  validates :played_at, presence: true

  scope :global_leaderboard, -> {
    # Get each player's highest score only
    # Uses a subquery to find the ID of the highest score for each player
    select('pacman_scores.*')
      .from("pacman_scores INNER JOIN (
        SELECT player_name, MAX(score) as max_score
        FROM pacman_scores
        GROUP BY player_name
      ) best_scores ON pacman_scores.player_name = best_scores.player_name
        AND pacman_scores.score = best_scores.max_score")
      .order(score: :desc)
      .limit(100)
      .distinct
  }
  scope :player_scores, ->(player_name) { where(player_name: player_name).order(score: :desc) }
  scope :player_high_score, ->(player_name) { where(player_name: player_name).order(score: :desc).first }
end

class PacmanScore < ApplicationRecord
  validates :player_name, presence: true, length: { maximum: 50 }
  validates :score, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :is_win, inclusion: { in: [true, false] }
  validates :played_at, presence: true

  scope :global_leaderboard, -> {
    # Get each player's highest score only (most recent if tied)
    # Uses DISTINCT ON to eliminate duplicate players
    from(<<-SQL.squish
      (SELECT DISTINCT ON (player_name) *
       FROM pacman_scores
       ORDER BY player_name, score DESC, played_at DESC) AS pacman_scores
    SQL
    )
    .order('score DESC, played_at DESC')
    .limit(100)
  }
  scope :player_scores, ->(player_name) { where(player_name: player_name).order(score: :desc) }
  scope :player_high_score, ->(player_name) { where(player_name: player_name).order(score: :desc).first }
end

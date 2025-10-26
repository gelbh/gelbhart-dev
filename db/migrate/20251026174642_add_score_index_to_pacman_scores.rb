class AddScoreIndexToPacmanScores < ActiveRecord::Migration[8.0]
  def change
    # Add descending index on score column for efficient global leaderboard queries
    # This supports: ORDER BY score DESC without needing to scan/sort the entire table
    add_index :pacman_scores, :score, order: :desc, name: 'index_pacman_scores_on_score_desc'
  end
end

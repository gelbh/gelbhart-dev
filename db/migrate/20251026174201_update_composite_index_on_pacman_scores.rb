class UpdateCompositeIndexOnPacmanScores < ActiveRecord::Migration[8.0]
  def change
    # Remove the incomplete index that only covers (player_name, score)
    remove_index :pacman_scores, name: 'index_pacman_scores_on_player_and_score'
    
    # Add complete composite index for DISTINCT ON query
    # This fully supports: ORDER BY player_name, score DESC, played_at DESC
    # Enables index-only scans for significant performance improvement
    add_index :pacman_scores, [:player_name, :score, :played_at],
              order: { score: :desc, played_at: :desc },
              name: 'index_pacman_scores_on_player_score_played'
  end
end

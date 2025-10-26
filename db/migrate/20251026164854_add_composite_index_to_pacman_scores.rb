class AddCompositeIndexToPacmanScores < ActiveRecord::Migration[8.0]
  def change
    # Add composite index for efficient leaderboard queries
    # This index supports: ORDER BY player_name, score DESC, played_at DESC
    add_index :pacman_scores, [:player_name, :score], 
              order: { score: :desc },
              name: 'index_pacman_scores_on_player_and_score'
    
    # Remove redundant single-column indexes
    # The composite index covers both player_name and score queries
    remove_index :pacman_scores, name: 'index_pacman_scores_on_player_name'
    remove_index :pacman_scores, name: 'index_pacman_scores_on_score'
  end
end

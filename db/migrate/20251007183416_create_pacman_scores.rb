class CreatePacmanScores < ActiveRecord::Migration[8.0]
  def change
    create_table :pacman_scores do |t|
      t.string :player_name
      t.integer :score
      t.boolean :is_win
      t.datetime :played_at

      t.timestamps
    end

    add_index :pacman_scores, :player_name
    add_index :pacman_scores, :score
  end
end

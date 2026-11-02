CREATE TABLE pacman_scores (
  id INTEGER PRIMARY KEY,
  player_name TEXT NOT NULL CHECK (length(player_name) BETWEEN 1 AND 50),
  score INTEGER NOT NULL CHECK (score >= 0),
  is_win INTEGER NOT NULL CHECK (is_win IN (0, 1)),
  played_at TEXT NOT NULL
);
CREATE INDEX idx_pacman_scores_score ON pacman_scores (score DESC);
CREATE INDEX idx_pacman_scores_player ON pacman_scores (player_name, score DESC, played_at DESC);

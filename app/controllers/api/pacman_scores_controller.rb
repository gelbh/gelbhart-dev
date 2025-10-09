class Api::PacmanScoresController < ApplicationController
  skip_before_action :verify_authenticity_token

  # GET /api/pacman_scores/global
  # Returns global leaderboard (top 100 scores)
  def global
    scores = PacmanScore.global_leaderboard
    render json: {
      leaderboard: scores.map do |score|
        {
          player_name: score.player_name,
          score: score.score,
          is_win: score.is_win,
          played_at: score.played_at
        }
      end
    }
  end

  # GET /api/pacman_scores/player/:player_name
  # Returns all scores for a specific player
  def player
    player_name = params[:player_name]
    scores = PacmanScore.player_scores(player_name)

    render json: {
      player_name: player_name,
      scores: scores.map do |score|
        {
          score: score.score,
          is_win: score.is_win,
          played_at: score.played_at
        }
      end
    }
  end

  # POST /api/pacman_scores
  # Create a new score entry
  def create
    score = PacmanScore.new(pacman_score_params)
    score.played_at ||= Time.current

    if score.save
      # Only return if this is a high score for the global leaderboard
      is_high_score = is_global_high_score?(score)

      render json: {
        success: true,
        score: {
          player_name: score.player_name,
          score: score.score,
          is_win: score.is_win,
          played_at: score.played_at
        },
        is_high_score: is_high_score
      }, status: :created
    else
      render json: {
        success: false,
        errors: score.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def pacman_score_params
    params.require(:pacman_score).permit(:player_name, :score, :is_win)
  end

  # Check if the score would be in the top 100 global leaderboard
  def is_global_high_score?(score)
    leaderboard_count = PacmanScore.count
    if leaderboard_count < 100
      true
    else
      lowest_high_score = PacmanScore.order(score: :desc).limit(100).last.score
      score.score >= lowest_high_score
    end
  end
end

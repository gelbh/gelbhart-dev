# app/controllers/pages_controller.rb
class PagesController < ApplicationController
  def home
    @projects = Project.featured.published.ordered
  end

  def hevy_tracker
    render "pages/hevy_tracker/index"
  end

  def hevy_tracker_privacy
    render "pages/hevy_tracker/privacy"
  end

  def hevy_tracker_terms
    render "pages/hevy_tracker/terms"
  end

  def contact
    # Check if redirected here due to rate limiting
    if params[:rate_limited] == "true"
      flash[:alert] = "Too many submissions. Please try again later."
    end
  end

  def video_captioner
  end

  def nasa_exoplanet_explorer
  end

  def google_maps_converter
  end

  def robots
    respond_to :text
    expires_in 6.hours, public: true
  end
end

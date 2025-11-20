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
  end

  def video_captioner
  end

  def nasa_exoplanet_explorer
  end

  def robots
    respond_to :text
    expires_in 6.hours, public: true
  end
end

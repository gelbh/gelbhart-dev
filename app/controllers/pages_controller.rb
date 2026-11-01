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
    if params[:rate_limited] == "true"
      flash.now[:alert] = "Too many submissions. Please try again later."
    elsif params[:error] == "1"
      flash.now[:alert] = "Sorry, there was an error sending your message. Please try emailing directly."
    elsif params[:sent] == "1"
      flash.now[:notice] = "Thank you! Your message has been sent successfully."
    end
  end

  def video_captioner
  end

  def nim_quantum_ml
  end

  def nasa_exoplanet_explorer
  end

  def google_maps_converter
  end

  def vscode_torch_checkpoint_inspector
  end

  def jetlag
  end

  def robots
    respond_to :text
    expires_in 6.hours, public: true
  end
end

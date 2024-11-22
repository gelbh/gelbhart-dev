# app/controllers/pages_controller.rb
class PagesController < ApplicationController
  def home
  end

  def oauth
  end

  def terms
  end

  def privacy
  end

  def robots
    respond_to :text
    expires_in 6.hours, public: true
  end
end

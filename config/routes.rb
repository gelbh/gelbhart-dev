Rails.application.routes.draw do
  root "pages#home"

  get "about", to: "pages#about"
  get "projects", to: "pages#projects"
  get "contact", to: "pages#contact"

  get "up" => "rails/health#show", as: :rails_health_check
  get "/health" => "rails/health#show"
  get "/_up" => "health#show"

  get "/assets/manifest.json" => "rails/assets#show"
end

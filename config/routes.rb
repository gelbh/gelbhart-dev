Rails.application.routes.draw do
  root "pages#home"
  get "oauth", to: "pages#oauth"
  get "terms", to: "pages#terms"
  get "privacy", to: "pages#privacy"

  get "up" => "rails/health#show", as: :rails_health_check
  get "/health" => "rails/health#show"
  get "/_up" => "health#show"

  get "/assets/manifest.json" => "rails/assets#show"

  match "/404", to: "errors#not_found", via: :all
  match "/500", to: "errors#internal_server_error", via: :all
  match "/422", to: "errors#unprocessable_entity", via: :all
end

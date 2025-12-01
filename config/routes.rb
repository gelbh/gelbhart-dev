Rails.application.routes.draw do
  root "pages#home"

  # API endpoints
  namespace :api do
    get "analytics/hevy-tracker", to: "analytics#hevy_tracker_stats"
    get "pagespeed/analyze", to: "page_speed#analyze"
    get "pagespeed/status", to: "page_speed#status"

    # Pac-Man leaderboard
    resources :pacman_scores, only: [ :create ]
    get "pacman_scores/global", to: "pacman_scores#global"
    get "pacman_scores/player/:player_name", to: "pacman_scores#player"
  end

  # Hevy Tracker pages
  scope path: "projects/hevy-tracker", as: :hevy_tracker do
    get "/", to: "pages#hevy_tracker"
    get "privacy", to: "pages#hevy_tracker_privacy"
    get "terms", to: "pages#hevy_tracker_terms"
    get "spreadsheet", to: redirect("https://docs.google.com/spreadsheets/d/1i0g1h1oBrwrw-L4-BW0YUHeZ50UATcehNrg2azkcyXk/copy")
  end

  # Redirect old Hevy Tracker URLs
  get "/hevy-tracker", to: redirect("/projects/hevy-tracker", status: 301)
  get "/hevy-tracker/privacy", to: redirect("/projects/hevy-tracker/privacy", status: 301)
  get "/hevy-tracker/terms", to: redirect("/projects/hevy-tracker/terms", status: 301)
  get "/hevy-tracker/spreadsheet", to: redirect("/projects/hevy-tracker/spreadsheet", status: 301)

  get "contact", to: "pages#contact"
  post "contact", to: "contacts#create"

  # Video Captioner
  get "projects/video-captioner", to: "pages#video_captioner", as: :video_captioner
  get "video-captioner", to: redirect("/projects/video-captioner", status: 301)

  # NASA Exoplanet Explorer
  get "projects/nasa-exoplanet-explorer", to: "pages#nasa_exoplanet_explorer", as: :nasa_exoplanet_explorer
  get "nasa-exoplanet-explorer", to: redirect("/projects/nasa-exoplanet-explorer", status: 301)

  get "/robots.txt", to: "pages#robots"

  # Ignore Chrome DevTools requests
  get "/.well-known/appspecific/*path", to: proc { [ 204, {}, [] ] }

  get "up" => "rails/health#show", as: :rails_health_check
  get "/_up" => "health#show"

  get "/assets/manifest.json" => "rails/assets#show"

  match "/404", to: "errors#not_found", via: :all
  match "/500", to: "errors#internal_server_error", via: :all
  match "/422", to: "errors#unprocessable_entity", via: :all
  match "/406", to: "errors#unsupported_type", via: :all

  get "/sitemap.xml", to: redirect("/sitemap.xml.gz")
  get "/sitemap.xml.gz", to: "sitemaps#show"
end

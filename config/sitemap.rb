# Sitemap configuration using sitemap_generator gem
require "sitemap_generator"

# Use environment-aware domain with fallback
base_host = Rails.application.credentials.sitemap_host ||
            Rails.application.config.action_mailer.default_url_options[:host] ||
            "gelbhart.dev"

# Remove protocol if present and add https
base_host = base_host.gsub(/^https?:\/\//, "")
default_host = "https://#{base_host}"

SitemapGenerator::Sitemap.default_host = default_host
SitemapGenerator::Sitemap.public_path = "public/"
SitemapGenerator::Sitemap.sitemaps_path = ""
# Create both compressed and uncompressed files
SitemapGenerator::Sitemap.compress = false

# Helper method to get last modification time for view files
def get_view_lastmod(view_path)
  full_path = Rails.root.join("app", "views", view_path)
  return Time.current unless full_path.exist?

  File.mtime(full_path)
rescue StandardError
  Time.current
end

# Helper method to get last modification time for multiple view files (uses most recent)
def get_multiple_views_lastmod(*view_paths)
  times = view_paths.map { |path| get_view_lastmod(path) }
  times.max || Time.current
end

SitemapGenerator::Sitemap.create do
  # Home page
  home_lastmod = get_multiple_views_lastmod("pages/home.html.erb", "layouts/application.html.erb")
  add "/", lastmod: home_lastmod

  # Hevy Tracker pages
  hevy_lastmod = get_view_lastmod("pages/hevy_tracker/index.erb")
  add "/projects/hevy-tracker", lastmod: hevy_lastmod

  hevy_privacy_lastmod = get_view_lastmod("pages/hevy_tracker/privacy.html.erb")
  add "/projects/hevy-tracker/privacy", lastmod: hevy_privacy_lastmod

  hevy_terms_lastmod = get_view_lastmod("pages/hevy_tracker/terms.html.erb")
  add "/projects/hevy-tracker/terms", lastmod: hevy_terms_lastmod

  # Contact page
  contact_lastmod = get_view_lastmod("pages/contact.html.erb")
  add "/contact", lastmod: contact_lastmod

  # Other project pages
  video_captioner_lastmod = get_view_lastmod("pages/video_captioner.html.erb")
  add "/projects/video-captioner", lastmod: video_captioner_lastmod

  nasa_lastmod = get_view_lastmod("pages/nasa_exoplanet_explorer.html.erb")
  add "/projects/nasa-exoplanet-explorer", lastmod: nasa_lastmod

  google_maps_converter_lastmod = get_view_lastmod("pages/google_maps_converter.html.erb")
  add "/projects/google-maps-converter", lastmod: google_maps_converter_lastmod
end

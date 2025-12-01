# Sitemap configuration using sitemap_generator gem
require "sitemap_generator"

SitemapGenerator::Sitemap.default_host = "https://gelbhart.dev"
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
  add "/", changefreq: "weekly", priority: 1.0, lastmod: home_lastmod

  # Hevy Tracker pages
  hevy_lastmod = get_view_lastmod("pages/hevy_tracker/index.erb")
  add "/hevy-tracker", changefreq: "monthly", priority: 0.8, lastmod: hevy_lastmod

  hevy_privacy_lastmod = get_view_lastmod("pages/hevy_tracker/privacy.html.erb")
  add "/hevy-tracker/privacy", changefreq: "yearly", priority: 0.5, lastmod: hevy_privacy_lastmod

  hevy_terms_lastmod = get_view_lastmod("pages/hevy_tracker/terms.html.erb")
  add "/hevy-tracker/terms", changefreq: "yearly", priority: 0.5, lastmod: hevy_terms_lastmod

  # Contact page
  contact_lastmod = get_view_lastmod("pages/contact.html.erb")
  add "/contact", changefreq: "monthly", priority: 0.8, lastmod: contact_lastmod

  # Other project pages
  video_captioner_lastmod = get_view_lastmod("pages/video_captioner.html.erb")
  add "/video-captioner", changefreq: "monthly", priority: 0.7, lastmod: video_captioner_lastmod

  nasa_lastmod = get_view_lastmod("pages/nasa_exoplanet_explorer.html.erb")
  add "/nasa-exoplanet-explorer", changefreq: "monthly", priority: 0.7, lastmod: nasa_lastmod
end

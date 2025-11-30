# Sitemap configuration using sitemap_generator gem
require "sitemap_generator"

SitemapGenerator::Sitemap.default_host = "https://gelbhart.dev"
SitemapGenerator::Sitemap.public_path = "public/"
SitemapGenerator::Sitemap.sitemaps_path = ""
# Create both compressed and uncompressed files
SitemapGenerator::Sitemap.compress = false

SitemapGenerator::Sitemap.create do
  current_time = Time.now

  # Home page
  add "/", changefreq: "weekly", priority: 1.0, lastmod: current_time

  # Hevy Tracker pages
  add "/hevy-tracker", changefreq: "monthly", priority: 0.8, lastmod: current_time
  add "/hevy-tracker/privacy", changefreq: "yearly", priority: 0.5, lastmod: current_time
  add "/hevy-tracker/terms", changefreq: "yearly", priority: 0.5, lastmod: current_time

  # Contact page
  add "/contact", changefreq: "monthly", priority: 0.8, lastmod: current_time

  # Other project pages
  add "/video-captioner", changefreq: "monthly", priority: 0.7, lastmod: current_time
  add "/nasa-exoplanet-explorer", changefreq: "monthly", priority: 0.7, lastmod: current_time
end

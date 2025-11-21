# Sitemap configuration using sitemap_generator gem
require "sitemap_generator"

SitemapGenerator::Sitemap.default_host = "https://gelbhart.dev"
SitemapGenerator::Sitemap.public_path = "public/"
SitemapGenerator::Sitemap.sitemaps_path = ""
# Create both compressed and uncompressed files
SitemapGenerator::Sitemap.compress = false

SitemapGenerator::Sitemap.create do
  # Home page
  add "/", changefreq: "weekly", priority: 1.0

  # Hevy Tracker pages
  add "/hevy-tracker", changefreq: "monthly", priority: 0.8
  add "/hevy-tracker/privacy", changefreq: "yearly", priority: 0.5
  add "/hevy-tracker/terms", changefreq: "yearly", priority: 0.5

  # Contact page
  add "/contact", changefreq: "monthly", priority: 0.8

  # Other project pages
  add "/video-captioner", changefreq: "monthly", priority: 0.7
  add "/nasa-exoplanet-explorer", changefreq: "monthly", priority: 0.7
end

namespace :sitemap do
  desc "Generate sitemap files"
  task generate: :environment do
    # Load sitemap configuration
    load Rails.root.join("config", "sitemap.rb")
    puts "Sitemap generated successfully"
  end
end

namespace :sitemap do
  desc "Generate sitemap files"
  task generate: :environment do
    SitemapGenerator.new.generate
    puts "Sitemap generated successfully"
  end
end

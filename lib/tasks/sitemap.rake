namespace :sitemap do
  desc "Generate sitemap files"
  task generate: :environment do
    SitemapService.new.generate
    puts "Sitemap generated successfully"
  end
end

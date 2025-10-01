namespace :sitemap do
  desc "Update the sitemap"
  task :update => :environment do
    # Add the code to update the sitemap here
    Rake::Task["sitemap:refresh"].invoke
  end
end
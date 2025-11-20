# This file should ensure all seed files from db/seeds/*.rb are loaded
Dir[Rails.root.join('db', 'seeds', '*.rb')].sort.each do |seed_file|
  puts "Loading seed file: #{File.basename(seed_file)}"
  load seed_file
end

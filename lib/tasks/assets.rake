namespace :assets do
  desc "Purge unused CSS from compiled assets"
  task purge_css: :environment do
    require "fileutils"

    # Find the compiled application CSS file
    css_files = Dir.glob(Rails.root.join("public/assets/application-*.css"))

    if css_files.empty?
      puts "No compiled CSS files found. Run 'rails assets:precompile' first."
      next
    end

    css_file = css_files.first
    original_size = File.size(css_file)
    puts "Found CSS file: #{css_file}"
    puts "Original size: #{original_size} bytes (#{(original_size / 1024.0).round(2)} KB)"

    # Backup original file
    backup_file = css_file.sub(/\.css$/, ".css.backup")
    FileUtils.cp(css_file, backup_file)

    # Run PurgeCSS using config file
    puts "Running PurgeCSS..."
    success = system("npx purgecss --config purgecss.config.js")

    unless success
      # Restore backup on failure
      FileUtils.cp(backup_file, css_file)
      FileUtils.rm(backup_file)
      raise("PurgeCSS failed - original file restored")
    end

    # Remove backup
    FileUtils.rm(backup_file)

    # Show results
    new_size = File.size(css_file)
    reduction = ((1 - new_size.to_f / original_size) * 100).round(2)
    puts "CSS purging completed successfully!"
    puts "New size: #{new_size} bytes (#{(new_size / 1024.0).round(2)} KB)"
    puts "Reduction: #{reduction}% (#{((original_size - new_size) / 1024.0).round(2)} KB saved)"
  end

  desc "Precompile assets and purge CSS"
  task precompile_with_purge: [ :precompile, :purge_css ] do
    puts "Assets precompiled and CSS purged!"
  end
end

# Hook into assets:precompile to automatically run purge_css in production
# This ensures CSS is purged automatically during production builds
Rake::Task["assets:precompile"].enhance do
  # Only run PurgeCSS in production environment
  if Rails.env.production?
    puts "\n=== Running PurgeCSS in production ==="
    begin
      Rake::Task["assets:purge_css"].invoke
    rescue StandardError => e
      puts "Warning: PurgeCSS failed, but continuing with precompiled assets"
      puts "Error: #{e.message}"
      # Don't fail the build if PurgeCSS fails - assets are still compiled
    end
  end
end

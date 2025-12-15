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
    success = system("npx purgecss --config .config/purgecss.config.js")

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

  desc "Regenerate boxicons subset with only used icons from codebase"
  task regenerate_boxicons: :environment do
    require "fileutils"
    require "open-uri"

    puts "Regenerating boxicons subset..."

    # Find all used boxicons in the codebase
    used_icons = []
    search_paths = [
      Rails.root.join("app/views/**/*.{html,erb}"),
      Rails.root.join("app/javascript/**/*.js")
    ]

    search_paths.each do |pattern|
      Dir.glob(pattern).each do |file|
        next unless File.file?(file)

        content = File.read(file)
        # Match bx-* and bxl-* icon classes
        content.scan(/bx[l]?-[a-z0-9-]+/) do |match|
          used_icons << match unless used_icons.include?(match)
        end
      end
    end

    if used_icons.empty?
      puts "No boxicons found in codebase. Skipping regeneration."
      next
    end

    used_icons.sort!
    puts "Found #{used_icons.length} unique boxicons: #{used_icons.join(', ')}"

    # Download full boxicons CSS
    puts "Downloading full boxicons CSS from CDN..."
    full_css_url = "https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
    full_css = URI.open(full_css_url, read_timeout: 10).read

    # Extract font-face (ends at first } before .bx{)
    font_face_end = full_css.index("}.bx{")
    unless font_face_end
      raise "Could not find font-face end marker in boxicons CSS"
    end
    font_face = full_css[0..font_face_end]

    # Extract .bx base class (just .bx{...}, not the preceding })
    bx_match = full_css.match(/\.bx\{[^}]+\}/)
    unless bx_match
      raise "Could not find .bx base class in boxicons CSS"
    end
    bx_base = bx_match[0]

    # Extract keyframes with proper brace matching
    extract_keyframe = lambda do |css, name, is_webkit|
      search = is_webkit ? "@-webkit-keyframes #{name}" : "@keyframes #{name}"
      start = css.index(search)
      return "" if start.nil?

      depth = 0
      i = start
      while i < css.length
        depth += 1 if css[i] == "{"
        if css[i] == "}"
          depth -= 1
          return css[start..i] if depth == 0
        end
        i += 1
      end
      ""
    end

    keyframes = []
    %w[spin burst flashing fade-left fade-right fade-up fade-down tada].each do |name|
      webkit = extract_keyframe.call(full_css, name, true)
      standard = extract_keyframe.call(full_css, name, false)
      keyframes << webkit unless webkit.empty?
      keyframes << standard unless standard.empty? || standard == webkit
    end

    # Extract used icon classes
    icon_classes = []
    used_icons.each do |icon|
      escaped = Regexp.escape(icon)
      regex = /\.#{escaped}:before\{[^}]+\}/
      matches = full_css.scan(regex)
      icon_classes.concat(matches) if matches.any?
    end

    # Combine everything
    subset = [ font_face, bx_base, *keyframes, *icon_classes ].join("")

    # Update font URLs to use CDN
    final = subset.gsub(/url\(\.\.\/fonts\/([^)]+)\)/, 'url(https://unpkg.com/boxicons@2.1.4/fonts/\1)')

    # Write to file
    output_path = Rails.root.join("app/assets/stylesheets/vendor/_boxicons-subset.scss")
    FileUtils.mkdir_p(File.dirname(output_path))
    File.write(output_path, final)

    # Verify braces
    brace_depth = 0
    errors = []
    final.each_char.with_index do |char, i|
      brace_depth += 1 if char == "{"
      if char == "}"
        brace_depth -= 1
        errors << i if brace_depth < 0
      end
    end

    if errors.any?
      puts "⚠️  Warning: Found #{errors.length} unmatched closing braces"
      puts "   First error at position: #{errors.first}"
    elsif brace_depth != 0
      puts "⚠️  Warning: Unmatched braces - depth: #{brace_depth}"
    else
      puts "✓ Successfully regenerated boxicons subset"
      puts "  Size: #{(final.length / 1024.0).round(2)} KB"
      puts "  Icons included: #{used_icons.length}"
      puts "  Output: #{output_path}"
    end
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

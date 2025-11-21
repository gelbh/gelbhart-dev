# Service class that wraps the sitemap_generator gem's DSL-based API.
# Provides programmatic access to sitemap generation while keeping
# config/sitemap.rb as the source of truth for configuration.
#
# Note: Named SitemapService to avoid conflict with SitemapGenerator gem module.
require "stringio"

class SitemapService
  # Wait constants for file creation (handles race conditions in parallel tests)
  MAX_WAIT_ATTEMPTS = 30
  WAIT_INTERVAL_SECONDS = 0.1

  # File paths
  SITEMAP_XML = "sitemap.xml"
  SITEMAP_GZ = "sitemap.xml.gz"

  # Generates both uncompressed and compressed sitemap files.
  #
  # @raise [RuntimeError] if sitemap.xml cannot be generated
  # @return [void]
  def generate
    ensure_public_directory_exists
    generate_uncompressed_sitemap
    wait_for_file_creation
    verify_sitemap_created
    create_compressed_version
  end

  private

  def ensure_public_directory_exists
    Rails.public_path.mkpath unless Rails.public_path.exist?
  end

  def generate_uncompressed_sitemap
    # Ensure compress is false to generate uncompressed XML file
    # This must be set before loading config in case config is loaded multiple times
    SitemapGenerator::Sitemap.compress = false

    # Load config which will generate the sitemap
    # The config file also sets compress: false, ensuring we get uncompressed XML
    # Silence gem output in test environment to keep test output clean
    if Rails.env.test?
      original_stdout = $stdout
      $stdout = StringIO.new
      begin
        load Rails.root.join("config", "sitemap.rb")
      ensure
        $stdout = original_stdout
      end
    else
      load Rails.root.join("config", "sitemap.rb")
    end

    # Ensure compress is still false after loading (defensive check)
    SitemapGenerator::Sitemap.compress = false
  end

  def wait_for_file_creation
    # Wait for file to be created (handles race conditions, especially in parallel tests)
    max_wait = MAX_WAIT_ATTEMPTS
    wait_count = 0

    while wait_count < max_wait && !sitemap_path.exist?
      sleep(WAIT_INTERVAL_SECONDS)
      wait_count += 1
    end
  end

  def verify_sitemap_created
    return if sitemap_path.exist?

    existing_files = Dir.glob(Rails.public_path.join("sitemap*"))
    error_message = build_error_message(existing_files)
    raise error_message
  end

  def build_error_message(existing_files)
    message = "Failed to generate sitemap.xml at #{sitemap_path}."
    message += " Found files: #{existing_files.inspect}" if existing_files.any?
    message += " Public path exists: #{Rails.public_path.exist?}"
    message += " Public path writable: #{File.writable?(Rails.public_path)}" if Rails.public_path.exist?
    message += " Compress setting: #{SitemapGenerator::Sitemap.compress}"
    message
  end

  def create_compressed_version
    require "zlib"

    Zlib::GzipWriter.open(gz_path) do |gz|
      gz.write(File.read(sitemap_path))
    end
  end

  def sitemap_path
    @sitemap_path ||= Rails.public_path.join(SITEMAP_XML)
  end

  def gz_path
    @gz_path ||= Rails.public_path.join(SITEMAP_GZ)
  end
end

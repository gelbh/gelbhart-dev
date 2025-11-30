# Service class that wraps the sitemap_generator gem's DSL-based API.
# Provides programmatic access to sitemap generation while keeping
# config/sitemap.rb as the source of truth for configuration.
#
# Note: Named SitemapService to avoid conflict with SitemapGenerator gem module.
require "stringio"

class SitemapService
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
    verify_sitemap_created
    create_compressed_version
  end

  private

  def ensure_public_directory_exists
    Rails.public_path.mkpath unless Rails.public_path.exist?
  end

  def generate_uncompressed_sitemap
    # Configure sitemap generator before loading config
    SitemapGenerator::Sitemap.public_path = Rails.public_path.to_s
    SitemapGenerator::Sitemap.sitemaps_path = ""
    SitemapGenerator::Sitemap.compress = false

    # Load config which will generate the sitemap via SitemapGenerator::Sitemap.create
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

    # Ensure settings are still correct after config loads
    SitemapGenerator::Sitemap.compress = false
    SitemapGenerator::Sitemap.public_path = Rails.public_path.to_s
    SitemapGenerator::Sitemap.sitemaps_path = ""
  end

  def verify_sitemap_created
    return if sitemap_path.exist?

    existing_files = Dir.glob(Rails.public_path.join("sitemap*"))
    error_message = "Failed to generate sitemap.xml at #{sitemap_path}."
    error_message += " Found files: #{existing_files.inspect}" if existing_files.any?
    error_message += " Public path exists: #{Rails.public_path.exist?}"
    error_message += " Public path writable: #{File.writable?(Rails.public_path)}" if Rails.public_path.exist?
    error_message += " Compress setting: #{SitemapGenerator::Sitemap.compress}"
    raise error_message
  end

  def create_compressed_version
    require "zlib"

    unless sitemap_path.exist?
      existing_files = Dir.glob(Rails.public_path.join("sitemap*"))
      error_message = "Cannot create compressed sitemap: sitemap.xml not found at #{sitemap_path}."
      error_message += " Found files: #{existing_files.inspect}" if existing_files.any?
      error_message += " Public path exists: #{Rails.public_path.exist?}"
      raise error_message
    end

    sitemap_content = File.read(sitemap_path)

    if sitemap_content.empty?
      raise "Cannot create compressed sitemap: sitemap.xml exists but is empty at #{sitemap_path}"
    end

    Zlib::GzipWriter.open(gz_path) do |gz|
      gz.write(sitemap_content)
    end
  end

  def sitemap_path
    @sitemap_path ||= Rails.public_path.join(SITEMAP_XML)
  end

  def gz_path
    @gz_path ||= Rails.public_path.join(SITEMAP_GZ)
  end
end

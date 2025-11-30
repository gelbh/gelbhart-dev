require "test_helper"

class SitemapGeneratorTest < ActiveSupport::TestCase
  # Disable parallelization for sitemap tests to avoid file system race conditions
  # These tests generate files in the public directory which can conflict across processes
  parallelize(workers: 1)

  setup do
    @generator = SitemapService.new
    @sitemap_path = Rails.public_path.join("sitemap.xml")
    @sitemap_gz_path = Rails.public_path.join("sitemap.xml.gz")
  end

  teardown do
    # Clean up generated files
    @sitemap_path.unlink if @sitemap_path.exist?
    @sitemap_gz_path.unlink if @sitemap_gz_path.exist?
  rescue StandardError => e
    # Ignore cleanup errors
    Rails.logger.debug "Sitemap cleanup error: #{e.message}"
  end

  test "generate creates sitemap.xml and sitemap.xml.gz" do
    @generator.generate

    assert @sitemap_path.exist?, "sitemap.xml should be created"
    assert @sitemap_gz_path.exist?, "sitemap.xml.gz should be created"
  end

  test "generated XML includes all routes" do
    @generator.generate

    xml_content = File.read(@sitemap_path)
    assert_includes xml_content, "https://gelbhart.dev/"
    assert_includes xml_content, "https://gelbhart.dev/hevy-tracker"
    assert_includes xml_content, "https://gelbhart.dev/contact"
    assert_includes xml_content, "https://gelbhart.dev/video-captioner"
    assert_includes xml_content, "https://gelbhart.dev/nasa-exoplanet-explorer"
  end

  test "generated XML has correct structure" do
    @generator.generate

    xml_content = File.read(@sitemap_path)
    assert_includes xml_content, 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    assert_includes xml_content, "<urlset"
    assert_includes xml_content, "<url>"
    assert_includes xml_content, "<loc>"
    assert_includes xml_content, "<changefreq>"
    assert_includes xml_content, "<priority>"
    assert_includes xml_content, "<lastmod>"
  end

  test "generated gzip file is compressed" do
    @generator.generate

    assert @sitemap_gz_path.exist?
    # Gzip file should be smaller than uncompressed (or at least exist)
    assert @sitemap_gz_path.size > 0
    # Verify it's actually compressed (smaller than uncompressed)
    assert @sitemap_gz_path.size < @sitemap_path.size, "Gzip file should be smaller than uncompressed XML"
  end
end

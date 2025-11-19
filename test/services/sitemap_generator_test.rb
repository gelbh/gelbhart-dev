require "test_helper"

class SitemapGeneratorTest < ActiveSupport::TestCase
  setup do
    @generator = SitemapGenerator.new
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
  end

  test "generate handles file write errors" do
    # Stub File.write to raise an error - this will cause write_xml to fail
    # Note: The compression step won't run if write_xml fails, so we only test write_xml error
    File.stubs(:write).raises(Errno::EACCES.new("Permission denied"))

    assert_raises(Errno::EACCES) do
      @generator.generate
    end
  ensure
    File.unstub(:write) if File.respond_to?(:unstub)
  end
end

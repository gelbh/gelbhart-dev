require "zlib"
require "builder"

class SitemapGenerator
  def initialize
    @host = "https://gelbhart.dev"
    @routes = [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/hevy-tracker", changefreq: "monthly", priority: 0.8 },
      { path: "/hevy-tracker/privacy", changefreq: "yearly", priority: 0.5 },
      { path: "/hevy-tracker/terms", changefreq: "yearly", priority: 0.5 },
      { path: "/contact", changefreq: "monthly", priority: 0.8 },
      { path: "/video-captioner", changefreq: "monthly", priority: 0.7 }
    ]
  end

  def generate
    xml_content = build_xml
    write_xml(xml_content)
    compress_xml
  end

  private

  def build_xml
    xml = Builder::XmlMarkup.new(indent: 2)
    xml.instruct!

    xml.urlset(xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9") do
      @routes.each do |route|
        xml.url do
          xml.loc "#{@host}#{route[:path]}"
          xml.changefreq route[:changefreq]
          xml.priority route[:priority]
          xml.lastmod Time.current.strftime("%Y-%m-%d")
        end
      end
    end
    xml.target!
  end

  def write_xml(content)
    sitemap_path = Rails.public_path.join("sitemap.xml")
    # Ensure the public directory exists
    Rails.public_path.mkpath unless Rails.public_path.exist?
    
    File.write(sitemap_path.to_s, content)
  rescue Errno::EACCES => e
    Rails.logger.error "Sitemap generation failed: Permission denied - #{e.message}"
    raise
  rescue Errno::ENOSPC => e
    Rails.logger.error "Sitemap generation failed: No space left on device - #{e.message}"
    raise
  rescue StandardError => e
    Rails.logger.error "Sitemap generation failed: #{e.class} - #{e.message}"
    raise
  end

  def compress_xml
    sitemap_path = Rails.public_path.join("sitemap.xml")
    sitemap_gz_path = Rails.public_path.join("sitemap.xml.gz")
    
    # Ensure the XML file exists before compressing
    unless sitemap_path.exist?
      raise Errno::ENOENT, "sitemap.xml not found at #{sitemap_path}"
    end
    
    Zlib::GzipWriter.open(sitemap_gz_path.to_s) do |gz|
      gz.write File.read(sitemap_path.to_s)
    end
  rescue Errno::EACCES => e
    Rails.logger.error "Sitemap compression failed: Permission denied - #{e.message}"
    raise
  rescue Errno::ENOSPC => e
    Rails.logger.error "Sitemap compression failed: No space left on device - #{e.message}"
    raise
  rescue StandardError => e
    Rails.logger.error "Sitemap compression failed: #{e.class} - #{e.message}"
    raise
  end
end

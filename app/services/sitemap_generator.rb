require "zlib"
require "builder"

class SitemapGenerator
  def initialize
    @host = "https://gelbhart.dev"
    @routes = [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/hevy-tracker", changefreq: "monthly", priority: 0.8 },
      { path: "/terms", changefreq: "yearly", priority: 0.5 },
      { path: "/privacy", changefreq: "yearly", priority: 0.5 }
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
    File.write(Rails.public_path.join("sitemap.xml"), content)
  end

  def compress_xml
    Zlib::GzipWriter.open(Rails.public_path.join("sitemap.xml.gz")) do |gz|
      gz.write File.read(Rails.public_path.join("sitemap.xml"))
    end
  end
end

class SitemapsController < ApplicationController
  def show
    # Set no-cache headers to ensure search engines always get fresh sitemaps
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    respond_to do |format|
      format.xml.gz {
        send_file Rails.public_path.join("sitemap.xml.gz"),
          type: "application/x-gzip",
          disposition: "inline"
      }
    end
  end
end

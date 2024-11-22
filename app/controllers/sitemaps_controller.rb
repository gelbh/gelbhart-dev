class SitemapsController < ApplicationController
  def show
    respond_to do |format|
      format.xml.gz {
        send_file Rails.public_path.join("sitemap.xml.gz"),
          type: "application/x-gzip",
          disposition: "inline"
      }
    end
  end
end

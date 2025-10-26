class Api::ExoplanetsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:index]

  def index
    # Prevent browser caching - we handle caching server-side
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    
    # Try to get cached data first (expires after 24 hours)
    cached_data = Rails.cache.read('exoplanets_data')
    
    if cached_data
      Rails.logger.info "Serving exoplanets from cache"
      render json: cached_data
      return
    end

    # If no cache, fetch from NASA
    Rails.logger.info "Fetching fresh exoplanet data from NASA"
    
    # ADQL query for NASA Exoplanet Archive
    # Query the Planetary Systems (ps) table
    # Fetch ALL confirmed exoplanets (6000+) with extended properties for accurate visualization
    # Enhanced with orbital mechanics, discovery context, stellar properties, and system data
    query = "SELECT pl_name,pl_rade,pl_bmasse,pl_eqt,pl_orbper,hostname,sy_dist,disc_year,pl_letter,pl_dens,pl_orbeccen,pl_orbsmax,pl_insol,st_teff,st_rad,st_mass,st_lum,ra,dec,pl_orbincl,pl_orblper,discoverymethod,disc_facility,sy_snum,sy_pnum,st_spectype,st_age,pl_massj,pl_radj FROM ps WHERE default_flag=1"

    uri = URI("https://exoplanetarchive.ipac.caltech.edu/TAP/sync")
    params = { 
      query: query, 
      format: "json"
    }
    uri.query = URI.encode_www_form(params)

    Rails.logger.info("Fetching exoplanet data from: #{uri}")

    begin
      response = fetch_with_redirect(uri)

      if response.is_a?(Net::HTTPSuccess)
        # Parse and re-render to ensure proper JSON formatting
        data = JSON.parse(response.body)
        Rails.logger.info("Successfully fetched #{data.length} exoplanets")
        
        # Cache the data for 24 hours
        Rails.cache.write('exoplanets_data', data, expires_in: 24.hours)
        Rails.logger.info("Cached exoplanet data for 24 hours")
        
        render json: data, status: :ok
      else
        Rails.logger.error("NASA API Error: HTTP #{response.code} - #{response.message}")
        Rails.logger.error("Response body: #{response.body[0..500]}") # Log first 500 chars
        render json: { 
          error: "Failed to fetch data from NASA API", 
          status: response.code,
          message: response.message 
        }, status: :bad_gateway
      end
    rescue JSON::ParserError => e
      Rails.logger.error("NASA API JSON Parse Error: #{e.message}")
      render json: { error: "Invalid response from NASA API" }, status: :bad_gateway
    rescue StandardError => e
      Rails.logger.error("NASA API Error: #{e.class} - #{e.message}")
      Rails.logger.error(e.backtrace.first(5).join("\n"))
      render json: { 
        error: "Failed to connect to NASA API", 
        details: e.message,
        type: e.class.name
      }, status: :service_unavailable
    end
  end

  private

  def fetch_with_redirect(uri, limit = 5)
    raise "Too many HTTP redirects" if limit == 0

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 15
    http.read_timeout = 45
    http.verify_mode = OpenSSL::SSL::VERIFY_PEER

    request = Net::HTTP::Get.new(uri.request_uri)
    request["User-Agent"] = "Mozilla/5.0 (compatible; RailsApp/1.0)"
    
    response = http.request(request)

    case response
    when Net::HTTPSuccess
      response
    when Net::HTTPRedirection
      location = response["location"]
      raise "Too many HTTP redirects" if limit <= 1
      Rails.logger.info("Redirecting to: #{location}")
      fetch_with_redirect(URI(location), limit - 1)
    else
      response
    end
  end
end


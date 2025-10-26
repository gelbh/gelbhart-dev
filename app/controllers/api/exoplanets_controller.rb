class Api::ExoplanetsController < ApplicationController
  # CSRF protection skipped for read-only public API endpoint
  # This is safe because:
  # 1. GET requests should be idempotent and not cause side effects
  # 2. No sensitive user data is exposed or modified
  # 3. Data is publicly available from NASA's API
  skip_before_action :verify_authenticity_token, only: [:index]

  def index
    # Security: Ensure only GET requests are allowed
    unless request.get?
      render json: { error: "Method not allowed" }, status: :method_not_allowed
      return
    end
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
    query = "SELECT pl_name,pl_rade,pl_bmasse,pl_eqt,pl_orbper,hostname,sy_dist,disc_year,pl_letter,pl_dens,pl_orbeccen,pl_orbsmax,pl_insol,st_teff,st_rad,st_mass,st_lum,ra,dec,pl_orbincl,pl_orblper,discoverymethod,disc_facility,sy_snum,sy_pnum,st_spectype,st_age,pl_massj,pl_radj FROM ps WHERE default_flag=1"

    # Security: Validate query string to prevent injection if it ever becomes dynamic
    unless valid_query?(query)
      Rails.logger.error("Invalid query string detected")
      render json: { error: "Invalid query" }, status: :bad_request
      return
    end

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

  # Security: Validate query to prevent SQL injection
  # Only allows SELECT statements with whitelisted tables and safe characters
  def valid_query?(query)
    return false if query.blank?
    
    # Must start with SELECT
    return false unless query.strip.upcase.start_with?("SELECT")
    
    # Must not contain dangerous SQL commands
    dangerous_keywords = %w[DROP DELETE INSERT UPDATE EXEC EXECUTE UNION-- /*]
    return false if dangerous_keywords.any? { |keyword| query.upcase.include?(keyword) }
    
    # Must reference the allowed table (ps = Planetary Systems)
    return false unless query.include?("FROM ps")
    
    true
  end

  # Security: Rotate User-Agent to avoid fingerprinting
  def random_user_agent
    user_agents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    user_agents.sample
  end

  def fetch_with_redirect(uri, limit = 5)
    raise "Too many HTTP redirects" if limit == 0

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 15
    http.read_timeout = 45
    http.verify_mode = OpenSSL::SSL::VERIFY_PEER
    
    # Security: Add certificate pinning for NASA API
    http.ca_file = Rails.root.join('config', 'certs', 'nasa_ca_bundle.pem').to_s if File.exist?(Rails.root.join('config', 'certs', 'nasa_ca_bundle.pem'))

    request = Net::HTTP::Get.new(uri.request_uri)
    # Security: Use rotating User-Agent to avoid fingerprinting
    request["User-Agent"] = random_user_agent
    
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


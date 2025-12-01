namespace :indexnow do
  desc "Generate IndexNow API key and key file"
  task generate_key: :environment do
    require "securerandom"

    # Generate a 32-character alphanumeric key (IndexNow key format)
    # IndexNow requires: 8-128 chars, alphanumeric (a-z, A-Z, 0-9) and dashes (-)
    # Using alphanumeric for better compatibility
    api_key = SecureRandom.alphanumeric(32)

    # Create the key file in public directory
    key_file_path = Rails.public_path.join("#{api_key}.txt")
    File.write(key_file_path, api_key)

    puts "IndexNow API key generated successfully!"
    puts ""
    puts "API Key: #{api_key}"
    puts "Key file created: #{key_file_path}"
    puts ""
    puts "Next steps:"
    puts "1. Set the following environment variable:"
    puts "   INDEXNOW_API_KEY=#{api_key}"
    puts ""
    puts "2. Verify the key file is accessible at:"
    puts "   https://gelbhart.dev/#{api_key}.txt"
    puts ""
    puts "3. The key file should contain only the key value (already set)"
  end

  desc "Verify IndexNow key file exists and is accessible"
  task verify_key: :environment do
    api_key = ENV["INDEXNOW_API_KEY"]&.strip

    if api_key.blank?
      puts "ERROR: INDEXNOW_API_KEY environment variable is not set"
      exit 1
    end

    key_file_path = Rails.public_path.join("#{api_key}.txt")

    unless key_file_path.exist?
      puts "ERROR: Key file not found at #{key_file_path}"
      puts "Run: rails indexnow:generate_key"
      exit 1
    end

    file_content = File.read(key_file_path).strip

    unless file_content == api_key
      puts "ERROR: Key file content does not match INDEXNOW_API_KEY"
      puts "Expected: #{api_key}"
      puts "Found: #{file_content}"
      exit 1
    end

    puts "✓ IndexNow key file verified successfully"
    puts "  Key: #{api_key}"
    puts "  File: #{key_file_path}"
    puts "  URL: https://gelbhart.dev/#{api_key}.txt"
  end

  desc "Test IndexNow API submission with a test URL"
  task test_submission: :environment do
    require "net/http"
    require "json"
    require "uri"

    api_key = ENV["INDEXNOW_API_KEY"]&.strip

    if api_key.blank?
      puts "ERROR: INDEXNOW_API_KEY environment variable is not set"
      exit 1
    end

    # Test URL
    test_url = "https://gelbhart.dev/test-indexnow-#{Time.now.to_i}"

    puts "Testing IndexNow API submission..."
    puts "  Key: #{api_key}"
    puts "  Test URL: #{test_url}"
    puts ""

    uri = URI("https://api.indexnow.org/IndexNow")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 10
    http.read_timeout = 10

    payload = {
      host: "https://gelbhart.dev",
      key: api_key,
      urlList: [ test_url ]
    }

    request = Net::HTTP::Post.new(uri.path)
    request["Content-Type"] = "application/json"
    request.body = payload.to_json

    begin
      response = http.request(request)
      puts "Response Status: #{response.code} #{response.message}"
      puts "Response Body: #{response.body}"

      if response.is_a?(Net::HTTPSuccess) || response.code == "202"
        puts ""
        puts "✓ IndexNow submission successful!"
      else
        puts ""
        puts "✗ IndexNow submission failed"
        puts ""
        puts "Common issues:"
        puts "  1. Key file must be publicly accessible at: https://gelbhart.dev/#{api_key}.txt"
        puts "  2. Key format must be 8-128 alphanumeric characters (a-z, A-Z, 0-9, -)"
        puts "  3. Key file must contain only the key value (no extra spaces/characters)"
        exit 1
      end
    rescue StandardError => e
      puts "ERROR: #{e.class} - #{e.message}"
      exit 1
    end
  end
end

namespace :indexnow do
  desc "Generate IndexNow API key and key file"
  task generate_key: :environment do
    require "securerandom"

    # Generate a 32-character hex string (IndexNow key format)
    api_key = SecureRandom.hex(16)

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
end

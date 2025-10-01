# app/controllers/video_captioner_controller.rb
class VideoCaptionerController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:generate]

  def index
  end

  def generate
    config = {
      input: params[:video_url],
      is_youtube: params[:video_url]&.start_with?('http'),
      language: params[:language].presence,
      translate_to: params[:translate_to].presence,
      burn: params[:burn] == 'true',
      model: params[:model] || 'base',
      output_dir: Rails.root.join('public', 'captions').to_s
    }

    # Run Python script
    python_cmd = "python3 #{Rails.root.join('lib', 'video_captioner.py')} '#{config.to_json.gsub("'", "\\'")}'"
    result = `#{python_cmd} 2>&1`

    begin
      response = JSON.parse(result)
      if response['error']
        render json: { error: response['error'] }, status: :unprocessable_entity
      else
        download_url = "/captions/#{response['output']}"
        render json: {
          success: true,
          download_url: download_url,
          detected_language: response['detected_lang'],
          warning: response['warning']
        }
      end
    rescue JSON::ParserError => e
      render json: { error: "Processing failed: #{result}" }, status: :internal_server_error
    end
  end

  def download
    file_path = Rails.root.join('public', 'captions', params[:filename])

    if File.exist?(file_path)
      send_file file_path, disposition: 'attachment'
    else
      render plain: 'File not found', status: :not_found
    end
  end
end

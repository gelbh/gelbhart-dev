# app/jobs/page_speed_analysis_job.rb
class PageSpeedAnalysisJob < ApplicationJob
  queue_as :default

  def perform(job_id, strategy: "desktop")
    service = PageSpeedService.new
    urls = service.get_site_urls

    # Initialize results in cache
    results = {
      status: "processing",
      strategy: strategy,
      total_pages: urls.length,
      completed: 0,
      results: {},
      started_at: Time.current.iso8601,
      errors: []
    }

    Rails.cache.write("pagespeed_job_#{job_id}", results, expires_in: 1.hour)

    # Analyze each URL
    urls.each_with_index do |url, index|
      begin
        result = service.analyze_url(url, strategy: strategy)
        results[:results][url] = result
        results[:completed] = index + 1

        # Update cache with progress
        Rails.cache.write("pagespeed_job_#{job_id}", results, expires_in: 1.hour)

        # Small delay to avoid rate limiting (except for last item)
        sleep(0.5) if index < urls.length - 1
      rescue StandardError => e
        Rails.logger.error "PageSpeed analysis failed for #{url}: #{e.message}"
        results[:errors] << { url: url, error: e.message }
        results[:results][url] = { success: false, error: e.message }
        results[:completed] = index + 1
        Rails.cache.write("pagespeed_job_#{job_id}", results, expires_in: 1.hour)
      end
    end

    # Mark as completed
    results[:status] = "completed"
    results[:completed_at] = Time.current.iso8601
    Rails.cache.write("pagespeed_job_#{job_id}", results, expires_in: 1.hour)
  rescue StandardError => e
    Rails.logger.error "PageSpeedAnalysisJob failed: #{e.message}"
    error_result = {
      status: "failed",
      error: e.message,
      failed_at: Time.current.iso8601
    }
    Rails.cache.write("pagespeed_job_#{job_id}", error_result, expires_in: 1.hour)
  end
end

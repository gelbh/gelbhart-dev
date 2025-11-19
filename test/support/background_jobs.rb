# Background job testing helpers
# ActiveJob test adapter is configured in test_helper.rb

module BackgroundJobHelpers
  def assert_job_enqueued(job_class, &block)
    assert_enqueued_with(job: job_class, &block)
  end

  def perform_enqueued_jobs
    perform_enqueued_jobs
  end
end


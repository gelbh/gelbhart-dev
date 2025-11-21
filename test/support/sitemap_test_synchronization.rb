# Shared mutex for synchronizing sitemap file operations across parallel test workers
# Prevents race conditions when multiple tests try to generate/access the same sitemap files
module SitemapTestSynchronization
  SITEMAP_MUTEX = Mutex.new
end

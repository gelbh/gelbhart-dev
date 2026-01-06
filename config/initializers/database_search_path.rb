# Set the correct search_path for PostgreSQL connections
# This ensures Rails creates tables in the 'public' schema, not 'pg_catalog'
# This is a fallback in case database.yml variables don't work
ActiveSupport.on_load(:active_record) do
  ActiveRecord::ConnectionAdapters::PostgreSQLAdapter.class_eval do
    alias_method :original_configure_connection, :configure_connection unless method_defined?(:original_configure_connection)

    def configure_connection
      original_configure_connection
      # Force set search_path after connection is configured
      begin
        execute("SET search_path TO public, extensions, graphql, vault")
      rescue ActiveRecord::StatementInvalid => e
        Rails.logger.warn("Could not set search_path: #{e.message}") if defined?(Rails.logger)
      end
    end
  end

  # Also set it on every connection checkout from the pool
  ActiveRecord::ConnectionAdapters::ConnectionPool.class_eval do
    alias_method :original_checkout, :checkout unless method_defined?(:original_checkout)

    def checkout
      connection = original_checkout
      begin
        connection.execute("SET search_path TO public, extensions, graphql, vault")
      rescue ActiveRecord::StatementInvalid
        # Ignore if can't set
      end
      connection
    end
  end
end

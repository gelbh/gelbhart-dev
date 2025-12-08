# Handle optional PostgreSQL extensions that may not be available in all environments
# This initializer runs when the database connection is established and ensures
# that optional extensions (like Supabase-specific ones) don't cause errors
# when they're referenced in schema.rb but don't exist locally.

if defined?(Rails) && Rails.env.development? || Rails.env.test?
  Rails.application.config.after_initialize do
    ActiveRecord::Base.connection_pool.with_connection do |connection|
      # Ensure schemas exist (idempotent)
      %w[extensions graphql vault].each do |schema_name|
        connection.execute("CREATE SCHEMA IF NOT EXISTS #{connection.quote_column_name(schema_name)}")
      rescue ActiveRecord::StatementInvalid
        # Ignore if schema creation fails (permissions, etc.)
      end

      # Check and enable only extensions that are available
      optional_extensions = [
        { name: "pg_stat_statements", schema: "extensions" },
        { name: "pgcrypto", schema: "extensions" },
        { name: "uuid-ossp", schema: "extensions" },
        { name: "pg_graphql", schema: "graphql" },
        { name: "supabase_vault", schema: "vault" }
      ]

      optional_extensions.each do |ext|
        begin
          # Check if extension is available
          available = connection.select_value(<<-SQL)
            SELECT EXISTS(
              SELECT 1 FROM pg_available_extensions WHERE name = #{connection.quote(ext[:name])}
            )
          SQL

          if available
            connection.execute(<<-SQL)
              CREATE EXTENSION IF NOT EXISTS #{connection.quote_column_name(ext[:name])}
              WITH SCHEMA #{connection.quote_column_name(ext[:schema])}
            SQL
          end
        rescue ActiveRecord::StatementInvalid => e
          Rails.logger.debug("Optional extension #{ext[:name]} not available: #{e.message}")
        end
      end
    end
  end
end

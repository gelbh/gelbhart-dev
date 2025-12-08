class EnableOptionalPostgresExtensions < ActiveRecord::Migration[8.1]
  # Enable PostgreSQL extensions conditionally
  # Some extensions (pg_graphql, supabase_vault) are Supabase-specific
  # and may not be available in local development environments

  # Disable automatic transaction wrapping since we're doing conditional operations
  disable_ddl_transaction!

  def up
    # Create schemas for Supabase compatibility (idempotent)
    execute <<-SQL
      CREATE SCHEMA IF NOT EXISTS extensions;
      CREATE SCHEMA IF NOT EXISTS graphql;
      CREATE SCHEMA IF NOT EXISTS vault;
    SQL

    # Helper method to safely enable extensions
    enable_extension_if_available("pg_stat_statements", schema: "extensions")
    enable_extension_if_available("pgcrypto", schema: "extensions")
    enable_extension_if_available("uuid-ossp", schema: "extensions")
    enable_extension_if_available("pg_graphql", schema: "graphql")
    enable_extension_if_available("supabase_vault", schema: "vault")

    # plpgsql is always available in PostgreSQL
    enable_extension "plpgsql"
  end

  def down
    # Only disable extensions that were successfully enabled
    # This migration is designed to be safe to reverse, but extensions
    # that weren't enabled won't cause errors on rollback
    disable_extension_if_exists("supabase_vault")
    disable_extension_if_exists("pg_graphql")
    disable_extension_if_exists("uuid-ossp")
    disable_extension_if_exists("pgcrypto")
    disable_extension_if_exists("pg_stat_statements")

    # Note: We don't drop schemas as they may be used by other extensions
  end

  private

  def enable_extension_if_available(name, schema: "public")
    quoted_name = connection.quote_string(name)
    quoted_schema = connection.quote_string(schema)

    # Use a savepoint for each extension to allow failures without aborting the whole migration
    connection.transaction(requires_new: true) do
      # Check if extension exists in PostgreSQL
      extension_exists = connection.select_value(<<-SQL)
        SELECT EXISTS(
          SELECT 1
          FROM pg_available_extensions
          WHERE name = #{connection.quote(name)}
        )
      SQL

      if extension_exists
        execute("CREATE EXTENSION IF NOT EXISTS #{quoted_name} WITH SCHEMA #{quoted_schema}")
        Rails.logger.info("Enabled extension: #{name}") if defined?(Rails.logger)
      else
        Rails.logger.warn("Extension #{name} not available, skipping...") if defined?(Rails.logger)
      end
    end
  rescue ActiveRecord::StatementInvalid, PG::Error => e
    # Log but don't fail migration if extension can't be enabled
    Rails.logger.warn("Could not enable extension #{name}: #{e.message}") if defined?(Rails.logger)
  end

  def disable_extension_if_exists(name)
    quoted_name = connection.quote_string(name)
    execute("DROP EXTENSION IF EXISTS #{quoted_name} CASCADE")
  rescue ActiveRecord::StatementInvalid
    # Ignore errors when disabling (extension may not exist)
  end
end

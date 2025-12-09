namespace :db do
  # Post-process structure.sql after generation to make schema creation idempotent
  # This ensures CREATE SCHEMA statements include IF NOT EXISTS for Supabase schemas
  # Hook into db:structure:dump task (which is used when schema_format = :sql)
  post_process_structure = proc do
    structure_file = Rails.root.join("db", "structure.sql")

    if structure_file.exist?
      content = File.read(structure_file)

      # Comment out PostgreSQL 17+ specific parameters that don't exist in older versions
      content.gsub!(
        /^SET transaction_timeout = 0;$/,
        "-- SET transaction_timeout = 0; -- PostgreSQL 17+ only, commented for compatibility"
      )

      # Comment out Supabase-specific extensions that may not exist in local environments
      content.gsub!(
        /^CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;$/,
        "-- CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql; -- Supabase-specific, commented for local compatibility"
      )
      content.gsub!(
        /^CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;$/,
        "-- CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault; -- Supabase-specific, commented for local compatibility"
      )

      # Comment out COMMENT statements for commented extensions
      content.gsub!(
        /^COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';$/,
        "-- COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support'; -- Supabase-specific"
      )
      content.gsub!(
        /^COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';$/,
        "-- COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension'; -- Supabase-specific"
      )

      # Comment out Supabase-specific publication that requires wal_level = logical
      content.gsub!(
        /^CREATE PUBLICATION supabase_realtime WITH \(publish = 'insert, update, delete, truncate'\);$/,
        "-- CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate'); -- Supabase-specific, commented for local compatibility (requires wal_level = logical)"
      )

      # Add IF NOT EXISTS to schema creation statements for Supabase schemas
      # pg_dump generates CREATE SCHEMA without IF NOT EXISTS, but we need it for idempotency
      %w[extensions graphql vault].each do |schema_name|
        content.gsub!(
          /^CREATE SCHEMA #{Regexp.escape(schema_name)};$/,
          "CREATE SCHEMA IF NOT EXISTS #{schema_name};"
        )
      end

      File.write(structure_file, content)
      puts "Post-processed structure.sql: Added IF NOT EXISTS to schemas and commented PostgreSQL 17+ and Supabase-specific features (extensions, publications)"
    end
  end

  if Rake::Task.task_defined?("db:structure:dump")
    Rake::Task["db:structure:dump"].enhance(&post_process_structure)
  else
    # Task might not be loaded yet, enhance it after Rails tasks are loaded
    Rake::Task["db:schema:dump"].enhance do
      if Rails.application.config.active_record.schema_format == :sql
        post_process_structure.call
      end
    end
  end
end

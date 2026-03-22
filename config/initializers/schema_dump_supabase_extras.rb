# frozen_string_literal: true

# Supabase adds extensions and vault.secrets that are not present on stock PostgreSQL.
# Omit them from db/schema.rb so db:schema:load / db:test:prepare work locally and in CI.

ActiveRecord::SchemaDumper.ignore_tables += [ /\Asecrets\z/ ]

module SchemaDumpSupabaseExtras
  OMIT_EXTENSIONS = %w[
    extensions.hypopg
    extensions.index_advisor
    graphql.pg_graphql
    vault.supabase_vault
  ].freeze

  def extensions(stream)
    filtered = @connection.extensions.reject { |ext| OMIT_EXTENSIONS.include?(ext.to_s) }
    return if filtered.empty?

    stream.puts "  # These are extensions that must be enabled in order to support this database"
    filtered.sort.each do |extension|
      stream.puts "  enable_extension #{extension.inspect}"
    end
    stream.puts
  end
end

Rails.application.config.to_prepare do
  require "active_record/connection_adapters/postgresql_adapter"
  dumper = ActiveRecord::ConnectionAdapters::PostgreSQL::SchemaDumper
  next if dumper.ancestors.include?(SchemaDumpSupabaseExtras)

  dumper.prepend(SchemaDumpSupabaseExtras)
end

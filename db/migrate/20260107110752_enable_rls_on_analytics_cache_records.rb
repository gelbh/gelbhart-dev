class EnableRlsOnAnalyticsCacheRecords < ActiveRecord::Migration[8.1]
  # Enable Row-Level Security (RLS) on analytics_cache_records table
  # exposed via PostgREST and create a policy that denies public/anonymous access.
  #
  # This prevents PostgREST clients from accessing this table while
  # allowing the Rails application (which uses a privileged database role)
  # to continue functioning normally.
  #
  # Table secured:
  # - analytics_cache_records: Internal cache for Google Analytics data

  def up
    # Enable RLS on the table
    execute <<-SQL
      ALTER TABLE public.analytics_cache_records ENABLE ROW LEVEL SECURITY;
    SQL

    # Create deny policy for public role
    # This policy blocks all operations (SELECT, INSERT, UPDATE, DELETE)
    # for the public role, which includes anonymous/unauthenticated PostgREST clients
    # USING clause controls SELECT and DELETE operations
    # WITH CHECK clause controls INSERT and UPDATE operations
    execute <<-SQL
      CREATE POLICY deny_public_analytics_cache_records
        ON public.analytics_cache_records
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    SQL
  end

  def down
    # Drop policy first, then disable RLS
    execute <<-SQL
      DROP POLICY IF EXISTS deny_public_analytics_cache_records ON public.analytics_cache_records;
    SQL

    execute <<-SQL
      ALTER TABLE public.analytics_cache_records DISABLE ROW LEVEL SECURITY;
    SQL
  end
end

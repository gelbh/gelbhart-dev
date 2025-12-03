class EnableRlsOnPublicTables < ActiveRecord::Migration[8.1]
  # Enable Row-Level Security (RLS) on tables exposed via PostgREST
  # and create policies that deny public/anonymous access.
  #
  # This prevents PostgREST clients from accessing these tables while
  # allowing the Rails application (which uses a privileged database role)
  # to continue functioning normally.
  #
  # Tables secured:
  # - ar_internal_metadata: Rails internal metadata
  # - schema_migrations: Rails migration tracking
  # - pacman_scores: Application data
  # - projects: Application data

  def up
    # Enable RLS on all tables
    execute <<-SQL
      ALTER TABLE public.ar_internal_metadata ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.pacman_scores ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    SQL

    # Create deny policies for public role on each table
    # These policies block all operations (SELECT, INSERT, UPDATE, DELETE)
    # for the public role, which includes anonymous/unauthenticated PostgREST clients
    # USING clause controls SELECT and DELETE operations
    # WITH CHECK clause controls INSERT and UPDATE operations
    execute <<-SQL
      CREATE POLICY deny_public_ar_internal_metadata
        ON public.ar_internal_metadata
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);

      CREATE POLICY deny_public_schema_migrations
        ON public.schema_migrations
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);

      CREATE POLICY deny_public_pacman_scores
        ON public.pacman_scores
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);

      CREATE POLICY deny_public_projects
        ON public.projects
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    SQL
  end

  def down
    # Drop policies first, then disable RLS
    execute <<-SQL
      DROP POLICY IF EXISTS deny_public_ar_internal_metadata ON public.ar_internal_metadata;
      DROP POLICY IF EXISTS deny_public_schema_migrations ON public.schema_migrations;
      DROP POLICY IF EXISTS deny_public_pacman_scores ON public.pacman_scores;
      DROP POLICY IF EXISTS deny_public_projects ON public.projects;
    SQL

    execute <<-SQL
      ALTER TABLE public.ar_internal_metadata DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.schema_migrations DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.pacman_scores DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
    SQL
  end
end

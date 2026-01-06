# Configure database structure dump to exclude Supabase-managed schemas

ActiveRecord::Tasks::DatabaseTasks.structure_dump_flags = [
  '--exclude-schema=auth',
  '--exclude-schema=graphql',
  '--exclude-schema=realtime',
  '--exclude-schema=storage',
  '--exclude-schema=pgbouncer',
  '--exclude-schema=graphql_public'
]

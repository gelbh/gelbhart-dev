namespace :db do
  namespace :test do
    Rake::Task["db:test:purge"].clear

    task purge: :load_config do
      if Rails.env.test?
        test_config = ActiveRecord::Base.configurations.configs_for(env_name: "test").first
        db_name = test_config.database

        ActiveRecord::Base.connection_pool.disconnect! if ActiveRecord::Base.connected?
        ActiveRecord::Base.establish_connection(test_config.configuration_hash.merge(database: "postgres"))

        begin
          ActiveRecord::Base.connection.execute("DROP DATABASE IF EXISTS #{ActiveRecord::Base.connection.quote_table_name(db_name)}")
        rescue ActiveRecord::StatementInvalid => e
          Rails.logger.debug("Could not drop database: #{e.message}") if defined?(Rails.logger)
        end

        ActiveRecord::Base.connection_pool.disconnect!
      else
        ActiveRecord::Tasks::DatabaseTasks.purge_current
      end
    end
  end
end

namespace :fly do
  task :build do
    sh "bin/rails assets:precompile"
  end

  task :release do
    sh "bin/rails db:migrate"
  end

  task :server do
    sh "bin/rails server"
  end
end

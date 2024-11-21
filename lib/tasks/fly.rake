namespace :fly do
  task :build do
    sh "bin/rails assets:precompile"
  end

  task :server do
    sh "bin/rails server"
  end
end

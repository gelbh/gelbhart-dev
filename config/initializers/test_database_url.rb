if Rails.env.test?
  ENV.delete("DATABASE_URL") if ENV["DATABASE_URL"].present?
end

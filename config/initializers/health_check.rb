Rails.application.config.middleware.insert_before 0, Rack::Runtime do
  Class.new do
    def initialize(app)
      @app = app
    end

    def call(env)
      if env["PATH_INFO"] == "/_up"
        [ 200, { "Content-Type" => "text/plain" }, [ "OK" ] ]
      else
        @app.call(env)
      end
    end
  end
end

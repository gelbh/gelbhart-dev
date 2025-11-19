class ErrorsController < ApplicationController
  def not_found
    render_error(404, "The page you are looking for was moved, removed or might have never existed.")
  end

  def internal_server_error
    render_error(500, "Internal server error. Our team has been notified and is working on it.")
  end

  def unprocessable_entity
    render_error(422, "The change you requested was rejected. Please try again.")
  end

  def unsupported_type
    render_error(406, "Only 'text/html' or 'application/json' content types supported..")
  end

  private

  def render_error(code, message)
    @error_code = code
    @error_message = message
    render :error, status: code
  end
end

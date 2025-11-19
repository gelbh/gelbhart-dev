# API test helpers
module ApiHelpers
  def json_response
    JSON.parse(response.body)
  end

  def assert_json_response(expected_status = 200)
    assert_response expected_status
    assert_equal "application/json; charset=utf-8", response.content_type
    json_response
  end

  def assert_json_success
    json = json_response
    assert json["success"] == true || json.key?("status"), "Expected success in JSON response"
    json
  end

  def assert_json_error(expected_status = 400)
    json = assert_json_response(expected_status)
    assert json["success"] == false || json.key?("error") || json.key?("errors"), "Expected error in JSON response"
    json
  end
end


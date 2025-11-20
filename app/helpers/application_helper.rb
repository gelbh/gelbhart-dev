module ApplicationHelper
  def page_title(title)
    base_title = "gelbhart.dev"
    title.empty? ? base_title : "#{title} | #{base_title}"
  end

  def meta_description(description)
    # Ensure description is under 160 characters for SEO
    content_for :meta_description, description.truncate(160)
  end

  def project_link_url(project)
    # Use route helper if route_name is present, otherwise use link_url as-is
    if project.route_name.present?
      begin
        Rails.application.routes.url_helpers.public_send("#{project.route_name}_path")
      rescue NoMethodError
        # Fallback to link_url if route helper doesn't exist
        project.link_url
      end
    else
      project.link_url
    end
  end
end

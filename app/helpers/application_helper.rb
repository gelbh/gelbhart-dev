module ApplicationHelper
  def page_title(title)
    base_title = "gelbhart.dev"
    title.empty? ? base_title : "#{title} | #{base_title}"
  end

  def meta_description(description)
    # Ensure description is under 160 characters for SEO
    content_for :meta_description, description.truncate(160)
  end
end

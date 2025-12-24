# frozen_string_literal: true

module ApplicationHelper
  CANONICAL_BASE_URL = "https://gelbhart.dev".freeze

  def page_title(title)
    base_title = "gelbhart.dev"
    title.empty? ? base_title : "#{title} | #{base_title}"
  end

  # Returns the canonical URL for the current request.
  # Always uses the primary domain (https://gelbhart.dev) and strips query
  # parameters and fragments so search engines see a single, stable URL.
  def canonical_url
    path = request&.path.presence || "/"
    "#{CANONICAL_BASE_URL}#{path}"
  end

  def meta_description(description)
    optimized = description.length > 157 ? description.truncate(157, separator: " ", omission: "") : description
    content_for :meta_description, optimized.strip
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

  def projects_with_pages
    @projects_with_pages ||= Project.with_pages.to_a
  end

  # Structured Data (JSON-LD) Helpers for SEO

  def person_structured_data
    {
      "@context" => "https://schema.org",
      "@type" => "Person",
      "name" => "Tomer Gelbhart",
      "url" => CANONICAL_BASE_URL,
      "jobTitle" => [ "Full-Stack Developer", "MSc Computer Science Student" ],
      "alumniOf" => {
        "@type" => "EducationalOrganization",
        "name" => "University College Dublin"
      },
      "knowsAbout" => [
        "Ruby on Rails",
        "JavaScript",
        "Python",
        "Java",
        "Full-Stack Development",
        "Web Development",
        "API Integration",
        "Machine Learning",
        "Cloud Computing"
      ],
      "sameAs" => [
        "https://www.linkedin.com/in/tomer-gelbhart/",
        "https://github.com/gelbh"
      ]
    }
  end

  def website_structured_data
    {
      "@context" => "https://schema.org",
      "@type" => "WebSite",
      "name" => "gelbhart.dev",
      "url" => CANONICAL_BASE_URL,
      "description" => "Personal portfolio and development projects by Tomer Gelbhart. Full-stack developer specializing in Ruby on Rails and modern web applications.",
      "author" => {
        "@type" => "Person",
        "name" => "Tomer Gelbhart"
      },
      "potentialAction" => {
        "@type" => "SearchAction",
        "target" => {
          "@type" => "EntryPoint",
          "urlTemplate" => "#{CANONICAL_BASE_URL}/?q={search_term_string}"
        },
        "query-input" => "required name=search_term_string"
      }
    }
  end

  def organization_structured_data
    {
      "@context" => "https://schema.org",
      "@type" => "Organization",
      "name" => "gelbhart.dev",
      "url" => CANONICAL_BASE_URL,
      "logo" => asset_url("logos/source/logo_social.svg"),
      "description" => "Personal portfolio and development projects by Tomer Gelbhart",
      "founder" => {
        "@type" => "Person",
        "name" => "Tomer Gelbhart"
      },
      "sameAs" => [
        "https://www.linkedin.com/in/tomer-gelbhart/",
        "https://github.com/gelbh"
      ]
    }
  end

  # Normalize URL for structured data: ensure absolute URL, strip query params and fragments
  def normalize_breadcrumb_url(url)
    return nil if url.blank?

    # If already absolute URL, parse and normalize it
    if url.to_s.start_with?("http://", "https://")
      begin
        uri = URI.parse(url.to_s)
        # Reconstruct URL without query params, fragments, and port (use standard ports)
        scheme = uri.scheme || "https"
        host = uri.host || URI.parse(CANONICAL_BASE_URL).host
        path = uri.path.presence || "/"

        # Remove trailing slash except for root
        path = path.chomp("/") unless path == "/"

        # Build normalized URL
        normalized = "#{scheme}://#{host}#{path}"
        normalized
      rescue URI::InvalidURIError, URI::BadURIError
        # Fallback: if URL parsing fails, try basic normalization
        cleaned = url.to_s.strip.gsub(/\?.*$/, "").gsub(/#.*$/, "")
        # Ensure it's still a valid absolute URL
        cleaned.start_with?("http://", "https://") ? cleaned : "#{CANONICAL_BASE_URL}#{cleaned.start_with?("/") ? cleaned : "/#{cleaned}"}"
      end
    else
      # Relative URL - prepend domain
      path = url.to_s.start_with?("/") ? url.to_s : "/#{url}"
      # Remove query params and fragments from relative URLs
      path = path.split("?").first.split("#").first
      # Remove trailing slash except for root
      path = path.chomp("/") unless path == "/"
      "#{CANONICAL_BASE_URL}#{path}"
    end
  end

  def breadcrumb_structured_data(items)
    # items should be an array of hashes with :name and :url keys
    # Example: [{ name: "Home", url: "/" }, { name: "Projects", url: "/projects" }, { name: "Current Page", url: nil }]
    # For items with nil URLs (typically the current page), use the current request URL
    {
      "@context" => "https://schema.org",
      "@type" => "BreadcrumbList",
      "itemListElement" => items.map.with_index do |item, index|
        # Get URL: use provided URL or fall back to current request URL
        raw_url = item[:url] || request.original_url
        normalized_url = normalize_breadcrumb_url(raw_url)

        # Ensure we have a valid URL
        next nil if normalized_url.blank?

        {
          "@type" => "ListItem",
          "position" => index + 1,
          "name" => item[:name],
          "item" => {
            "@id" => normalized_url,
            "name" => item[:name]
          }
        }
      end.compact
    }
  end

  def software_application_structured_data(name:, description:, url:, application_category: "WebApplication", operating_system: "Web", offers: {})
    {
      "@context" => "https://schema.org",
      "@type" => "SoftwareApplication",
      "name" => name,
      "description" => description,
      "url" => url,
      "applicationCategory" => application_category,
      "operatingSystem" => operating_system,
      "offers" => offers.any? ? {
        "@type" => "Offer",
        **offers
      } : {
        "@type" => "Offer",
        "price" => "0",
        "priceCurrency" => "USD"
      },
      "author" => {
        "@type" => "Person",
        "name" => "Tomer Gelbhart",
        "url" => CANONICAL_BASE_URL
      }
    }
  end

  def contact_page_structured_data
    {
      "@context" => "https://schema.org",
      "@type" => "ContactPage",
      "name" => "Contact - gelbhart.dev",
      "url" => "#{CANONICAL_BASE_URL}/contact",
      "description" => "Get in touch with Tomer Gelbhart for internship opportunities, web development projects, or collaboration.",
      "mainEntity" => {
        "@type" => "Person",
        "name" => "Tomer Gelbhart",
        "email" => "tomer@gelbhart.dev",
        "url" => CANONICAL_BASE_URL
      }
    }
  end

  def faq_structured_data(questions)
    # questions should be an array of hashes with :question and :answer keys
    {
      "@context" => "https://schema.org",
      "@type" => "FAQPage",
      "mainEntity" => questions.map do |qa|
        {
          "@type" => "Question",
          "name" => qa[:question],
          "acceptedAnswer" => {
            "@type" => "Answer",
            "text" => qa[:answer]
          }
        }
      end
    }
  end

  def render_structured_data(data)
    content_tag :script, data.to_json.html_safe, type: "application/ld+json"
  end

  # SEO Helper Methods

  # Determine Open Graph type based on current page
  def og_type
    # Use page-specific OG type if provided, otherwise default based on route
    return content_for(:og_type) if content_for?(:og_type)

    case request.path
    when "/"
      "website"
    when "/contact"
      "profile"
    else
      # For project pages, use article type
      if request.path.match?(/\/projects\/(video-captioner|nasa-exoplanet-explorer|hevy-tracker)/)
        "article"
      else
        "website"
      end
    end
  end

  # Get social media image URL (prefer PNG for better compatibility)
  def social_image_url
    # Allow page-specific social image override
    return content_for(:social_image_url) if content_for?(:social_image_url)

    # Use PNG version for better social media compatibility
    asset_url("logos/social/logo_social.png")
  end

  # Get social image dimensions (standard OG image size)
  def social_image_dimensions
    { width: 1200, height: 630 }
  end

  # Generate WebPage structured data for individual pages
  def webpage_structured_data(name:, url:, description: nil, date_published: nil, date_modified: nil, author: nil)
    data = {
      "@context" => "https://schema.org",
      "@type" => "WebPage",
      "name" => name,
      "url" => (url.present? && url.start_with?("http")) ? url : "#{CANONICAL_BASE_URL}#{url}"
    }

    data["description"] = description if description.present?
    data["datePublished"] = date_published.iso8601 if date_published.present?
    data["dateModified"] = date_modified.iso8601 if date_modified.present?

    if author.present?
      data["author"] = author.is_a?(Hash) ? author : {
        "@type" => "Person",
        "name" => author.to_s
      }
    else
      # Default author
      data["author"] = {
        "@type" => "Person",
        "name" => "Tomer Gelbhart",
        "url" => CANONICAL_BASE_URL
      }
    end

    # Add publisher (organization)
    data["publisher"] = {
      "@type" => "Organization",
      "name" => "gelbhart.dev",
      "logo" => {
        "@type" => "ImageObject",
        "url" => asset_url("logos/source/logo_social.svg")
      }
    }

    # Add main entity if homepage
    if url == "/" || url == CANONICAL_BASE_URL || url == "#{CANONICAL_BASE_URL}/"
      data["mainEntity"] = {
        "@type" => "WebSite",
        "@id" => CANONICAL_BASE_URL
      }
    end

    data
  end

  # Generate Article structured data for project pages and blog posts
  def article_structured_data(title:, url:, description:, date_published: nil, date_modified: nil, image: nil, author: nil, keywords: nil)
    data = {
      "@context" => "https://schema.org",
      "@type" => "Article",
      "headline" => title,
      "url" => (url.present? && url.start_with?("http")) ? url : "#{CANONICAL_BASE_URL}#{url}",
      "description" => description
    }

    data["datePublished"] = date_published.iso8601 if date_published.present?
    data["dateModified"] = date_modified.iso8601 if date_modified.present?
    data["keywords"] = keywords if keywords.present?

    if author.present?
      data["author"] = author.is_a?(Hash) ? author : {
        "@type" => "Person",
        "name" => author.to_s
      }
    else
      data["author"] = {
        "@type" => "Person",
        "name" => "Tomer Gelbhart",
        "url" => CANONICAL_BASE_URL,
        "sameAs" => [
          "https://www.linkedin.com/in/tomer-gelbhart/",
          "https://github.com/gelbh"
        ]
      }
    end

    # Add publisher
    data["publisher"] = {
      "@type" => "Organization",
      "name" => "gelbhart.dev",
      "logo" => {
        "@type" => "ImageObject",
        "url" => asset_url("logos/source/logo_social.svg")
      }
    }

    # Add image if provided
    if image.present?
      image_url = image.is_a?(Hash) ? image[:url] : image
      image_dims = image.is_a?(Hash) && image[:width] ? { width: image[:width], height: image[:height] } : social_image_dimensions

      data["image"] = {
        "@type" => "ImageObject",
        "url" => (image_url.present? && image_url.start_with?("http")) ? image_url : asset_url(image_url),
        "width" => image_dims[:width],
        "height" => image_dims[:height]
      }
    end

    data
  end

  # Generate ImageObject structured data for better image SEO
  def image_object_structured_data(url:, width: nil, height: nil, caption: nil, alt_text: nil, content_url: nil)
    image_url = (url.present? && url.start_with?("http")) ? url : asset_url(url)
    dims = width && height ? { width: width, height: height } : social_image_dimensions

    data = {
      "@context" => "https://schema.org",
      "@type" => "ImageObject",
      "url" => image_url,
      "width" => dims[:width],
      "height" => dims[:height]
    }

    data["caption"] = caption if caption.present?
    data["alternateName"] = alt_text if alt_text.present?
    data["contentUrl"] = (content_url.present? && content_url.start_with?("http")) ? content_url : asset_url(content_url) if content_url.present?

    # Add license if needed
    data["license"] = CANONICAL_BASE_URL

    data
  end
end

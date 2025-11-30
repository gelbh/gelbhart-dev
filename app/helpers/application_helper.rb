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

  def projects_with_pages
    @projects_with_pages ||= Project.with_pages.to_a
  end

  # Structured Data (JSON-LD) Helpers for SEO
  # These helpers generate JSON-LD structured data for better search engine understanding
  # and AI-driven search optimization (GEO - Generative Engine Optimization)

  def person_structured_data
    {
      "@context" => "https://schema.org",
      "@type" => "Person",
      "name" => "Tomer Gelbhart",
      "url" => "https://gelbhart.dev",
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
      "url" => "https://gelbhart.dev",
      "description" => "Personal portfolio and development projects by Tomer Gelbhart. Full-stack developer specializing in Ruby on Rails and modern web applications.",
      "author" => {
        "@type" => "Person",
        "name" => "Tomer Gelbhart"
      },
      "potentialAction" => {
        "@type" => "SearchAction",
        "target" => {
          "@type" => "EntryPoint",
          "urlTemplate" => "https://gelbhart.dev/?q={search_term_string}"
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
      "url" => "https://gelbhart.dev",
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

  def breadcrumb_structured_data(items)
    # items should be an array of hashes with :name and :url keys
    # Example: [{ name: "Home", url: "/" }, { name: "Projects", url: "/projects" }]
    {
      "@context" => "https://schema.org",
      "@type" => "BreadcrumbList",
      "itemListElement" => items.map.with_index do |item, index|
        {
          "@type" => "ListItem",
          "position" => index + 1,
          "name" => item[:name],
          "item" => item[:url].start_with?("http") ? item[:url] : "https://gelbhart.dev#{item[:url]}"
        }
      end
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
        "url" => "https://gelbhart.dev"
      }
    }
  end

  def contact_page_structured_data
    {
      "@context" => "https://schema.org",
      "@type" => "ContactPage",
      "name" => "Contact - gelbhart.dev",
      "url" => "https://gelbhart.dev/contact",
      "description" => "Get in touch with Tomer Gelbhart for internship opportunities, web development projects, or collaboration.",
      "mainEntity" => {
        "@type" => "Person",
        "name" => "Tomer Gelbhart",
        "email" => "tomer@gelbhart.dev",
        "url" => "https://gelbhart.dev"
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
end

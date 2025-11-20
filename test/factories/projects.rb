FactoryBot.define do
  factory :project do
    sequence(:title) { |n| "Project #{n}" }
    subtitle { "Project Subtitle" }
    description { "A detailed description of the project" }
    icon { "bx-code-alt" }
    color { "primary" }
    link_text { "Learn More" }
    link_url { "/project-path" }
    link_icon { "bx-right-arrow-alt" }
    route_name { "project" }
    badges { [ { text: "Badge 1", color: "primary", url: "https://example.com" } ] }
    position { 0 }
    published { true }
    featured { true }

    trait :unpublished do
      published { false }
    end

    trait :not_featured do
      featured { false }
    end

    trait :with_multiple_badges do
      badges { [
        { text: "Badge 1", color: "primary", url: "https://example.com" },
        { text: "Badge 2", color: "success", url: "https://example2.com" }
      ] }
    end

    trait :with_github_url do
      github_url { "https://github.com/user/project" }
    end

    trait :external_link do
      link_url { "https://external-site.com" }
      link_target { "_blank" }
      link_rel { "noopener" }
    end
  end
end

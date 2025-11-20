require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  # Validations
  test "validates presence of title" do
    project = build(:project, title: nil)
    assert_not project.valid?
    assert_includes project.errors[:title], "can't be blank"
  end

  test "validates presence of subtitle" do
    project = build(:project, subtitle: nil)
    assert_not project.valid?
    assert_includes project.errors[:subtitle], "can't be blank"
  end

  test "validates presence of description" do
    project = build(:project, description: nil)
    assert_not project.valid?
    assert_includes project.errors[:description], "can't be blank"
  end

  test "validates presence of position" do
    project = build(:project, position: nil)
    assert_not project.valid?
    assert_includes project.errors[:position], "can't be blank"
  end

  test "validates position is an integer" do
    project = build(:project, position: 1.5)
    assert_not project.valid?
    assert_includes project.errors[:position], "must be an integer"
  end

  test "validates position is greater than or equal to 0" do
    project = build(:project, position: -1)
    assert_not project.valid?
    assert_includes project.errors[:position], "must be greater than or equal to 0"
  end

  test "valid project with all required attributes" do
    project = build(:project)
    assert project.valid?
  end

  # Defaults
  test "published defaults to true" do
    project = Project.new(
      title: "Test Project",
      subtitle: "Subtitle",
      description: "Description",
      position: 0
    )
    assert_equal true, project.published
  end

  test "featured defaults to true" do
    project = Project.new(
      title: "Test Project",
      subtitle: "Subtitle",
      description: "Description",
      position: 0
    )
    assert_equal true, project.featured
  end

  test "link_icon defaults to bx-right-arrow-alt" do
    project = Project.new(
      title: "Test Project",
      subtitle: "Subtitle",
      description: "Description",
      position: 0
    )
    assert_equal "bx-right-arrow-alt", project.link_icon
  end

  test "badges defaults to empty array" do
    project = Project.new(
      title: "Test Project",
      subtitle: "Subtitle",
      description: "Description",
      position: 0
    )
    assert_equal [], project.badges
  end

  # Scopes
  test "featured scope returns only featured projects" do
    featured_project = create(:project, featured: true)
    not_featured = create(:project, featured: false)

    featured = Project.featured

    assert_includes featured, featured_project
    assert_not_includes featured, not_featured
  end

  test "published scope returns only published projects" do
    published_project = create(:project, published: true)
    unpublished = create(:project, published: false)

    published = Project.published

    assert_includes published, published_project
    assert_not_includes published, unpublished
  end

  test "ordered scope orders projects by position" do
    create(:project, position: 3, title: "Third")
    create(:project, position: 1, title: "First")
    create(:project, position: 2, title: "Second")

    ordered = Project.ordered

    assert_equal "First", ordered.first.title
    assert_equal "Second", ordered.second.title
    assert_equal "Third", ordered.third.title
  end

  test "scopes can be chained" do
    featured_published = create(:project, featured: true, published: true, position: 1)
    featured_unpublished = create(:project, featured: true, published: false, position: 2)
    not_featured_published = create(:project, featured: false, published: true, position: 3)
    not_featured_unpublished = create(:project, featured: false, published: false, position: 4)

    result = Project.featured.published.ordered

    assert_includes result, featured_published
    assert_not_includes result, featured_unpublished
    assert_not_includes result, not_featured_published
    assert_not_includes result, not_featured_unpublished
  end

  # Instance methods
  test "normalized_badges converts string keys to symbol keys" do
    project = create(:project, badges: [
      { "text" => "Badge 1", "color" => "primary", "url" => "https://example.com" },
      { "text" => "Badge 2", "color" => "success", "url" => "https://example2.com" }
    ])

    normalized = project.normalized_badges

    assert_equal 2, normalized.count
    assert_equal :text, normalized.first.keys.first
    assert_equal "Badge 1", normalized.first[:text]
    assert_equal "primary", normalized.first[:color]
    assert_equal "https://example.com", normalized.first[:url]
  end

  test "normalized_badges handles empty badges array" do
    project = create(:project, badges: [])

    normalized = project.normalized_badges

    assert_equal [], normalized
  end

  test "normalized_badges handles badges with symbol keys" do
    project = create(:project, badges: [
      { text: "Badge 1", color: "primary", url: "https://example.com" }
    ])

    normalized = project.normalized_badges

    assert_equal 1, normalized.count
    assert_equal "Badge 1", normalized.first[:text]
  end

  test "normalized_badges handles badges with mixed key types" do
    project = create(:project, badges: [
      { "text" => "Badge 1", "color" => "primary", url: "https://example.com" }
    ])

    normalized = project.normalized_badges

    assert_equal 1, normalized.count
    assert_equal "Badge 1", normalized.first[:text]
    assert_equal "primary", normalized.first[:color]
    assert_equal "https://example.com", normalized.first[:url]
  end
end

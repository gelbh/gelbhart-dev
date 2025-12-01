class Project < ApplicationRecord
  # Validations
  validates :title, presence: true
  validates :subtitle, presence: true
  validates :description, presence: true
  validates :position, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  # Scopes
  scope :featured, -> { where(featured: true) }
  scope :published, -> { where(published: true) }
  scope :ordered, -> { order(:position) }
  scope :with_pages, -> { published.where.not(route_name: nil).ordered }

  # IndexNow: Notify search engines when project is created or updated
  after_commit :notify_indexnow, if: :should_notify_indexnow?

  # Convert badges JSONB to array with symbol keys for easier access in views
  def normalized_badges
    badges.map { |badge| badge.deep_symbolize_keys }
  end

  private

  def should_notify_indexnow?
    # Only notify if project is published and has a publicly accessible route
    published? && route_name.present?
  end

  def notify_indexnow
    url = project_url
    return if url.blank?

    IndexNowService.new.notify(url)
  end

  def project_url
    # Use route helper if route_name is present, otherwise use link_url
    if route_name.present?
      begin
        Rails.application.routes.url_helpers.public_send("#{route_name}_path")
      rescue NoMethodError
        # Fallback to link_url if route helper doesn't exist
        link_url
      end
    else
      link_url
    end
  end
end

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

  # Convert badges JSONB to array with symbol keys for easier access in views
  def normalized_badges
    badges.map { |badge| badge.deep_symbolize_keys }
  end
end

# frozen_string_literal: true

# Helper for generating responsive images with srcset and sizes attributes
# Implements modern responsive image best practices for optimal loading performance
module ResponsiveImageHelper
  # Default widths for responsive images (in pixels)
  # These match common device widths and Bootstrap breakpoints
  DEFAULT_WIDTHS = [ 320, 480, 768, 992, 1200, 1920 ].freeze

  # Common sizes configurations for different use cases
  SIZES_PRESETS = {
    full: "100vw",
    half: "(min-width: 768px) 50vw, 100vw",
    third: "(min-width: 992px) 33.33vw, (min-width: 768px) 50vw, 100vw",
    card: "(min-width: 1200px) 400px, (min-width: 992px) 33.33vw, (min-width: 768px) 50vw, 100vw",
    hero: "(min-width: 1200px) 1200px, 100vw"
  }.freeze

  # Generate a responsive image tag with srcset support
  #
  # @param source [String] The image source path (e.g., "hevy-tracker/main.webp")
  # @param widths [Array<Integer>] Array of width values for srcset (defaults to DEFAULT_WIDTHS)
  # @param sizes [String, Symbol] Either a sizes string or a preset symbol (:full, :half, :third, :card, :hero)
  # @param options [Hash] Additional options passed to image_tag (alt, class, loading, etc.)
  #
  # @example Basic usage
  #   responsive_image_tag("projects/hero.webp", alt: "Project hero image")
  #
  # @example With custom widths and sizes preset
  #   responsive_image_tag("projects/card.webp",
  #     widths: [400, 800, 1200],
  #     sizes: :card,
  #     alt: "Project card",
  #     class: "img-fluid")
  #
  # @example With explicit sizes attribute
  #   responsive_image_tag("projects/banner.webp",
  #     sizes: "(min-width: 1200px) 1140px, (min-width: 992px) 960px, 100vw",
  #     alt: "Banner image")
  #
  def responsive_image_tag(source, widths: nil, sizes: nil, **options)
    # Ensure lazy loading by default (modern best practice)
    options[:loading] ||= "lazy"

    # Set decoding to async for better performance
    options[:decoding] ||= "async"

    # Check if source image exists and we can generate variants
    if image_variants_available?(source)
      widths ||= DEFAULT_WIDTHS
      srcset = generate_srcset(source, widths)

      # Resolve sizes - could be a preset symbol or custom string
      resolved_sizes = resolve_sizes(sizes, widths)

      options[:srcset] = srcset if srcset.present?
      options[:sizes] = resolved_sizes if resolved_sizes.present?
    end

    image_tag(source, **options)
  end

  # Generate a picture element with WebP and fallback formats
  # Useful for maximum browser compatibility with modern formats
  #
  # @param source [String] The image source path (without extension for auto-detection)
  # @param widths [Array<Integer>] Array of width values for srcset
  # @param sizes [String, Symbol] Sizes attribute or preset
  # @param options [Hash] Additional options for the img tag
  #
  # @example
  #   responsive_picture_tag("projects/hero",
  #     formats: [:webp, :jpg],
  #     widths: [400, 800, 1200],
  #     sizes: :full,
  #     alt: "Hero image",
  #     class: "img-fluid")
  #
  def responsive_picture_tag(source, formats: [ :webp, :jpg ], widths: nil, sizes: nil, **options)
    widths ||= DEFAULT_WIDTHS
    resolved_sizes = resolve_sizes(sizes, widths)

    content_tag(:picture) do
      sources = formats[0..-2].map do |format|
        source_with_format = change_extension(source, format)
        srcset = generate_srcset(source_with_format, widths)

        tag(:source,
          type: mime_type_for(format),
          srcset: srcset,
          sizes: resolved_sizes
        )
      end.join.html_safe

      # Fallback image (last format)
      fallback_format = formats.last
      fallback_source = change_extension(source, fallback_format)
      fallback_srcset = generate_srcset(fallback_source, widths)

      fallback_options = options.merge(
        srcset: fallback_srcset,
        sizes: resolved_sizes,
        loading: options[:loading] || "lazy",
        decoding: options[:decoding] || "async"
      )

      sources + image_tag(fallback_source, **fallback_options)
    end
  end

  private

  # Generate srcset string from source and widths
  # @param source [String] Base image path
  # @param widths [Array<Integer>] Width values
  # @return [String] srcset attribute value
  def generate_srcset(source, widths)
    widths.filter_map do |width|
      variant_path = generate_variant_path(source, width)
      # Only include if the asset exists
      if asset_exists?(variant_path) || Rails.env.development?
        "#{image_path(variant_path)} #{width}w"
      end
    end.join(", ")
  end

  # Generate a variant path for a given width
  # Converts "image.webp" to "image-800w.webp" for width 800
  # @param source [String] Original image path
  # @param width [Integer] Target width
  # @return [String] Variant image path
  def generate_variant_path(source, width)
    extension = File.extname(source)
    base_name = File.basename(source, extension)
    directory = File.dirname(source)

    if directory == "."
      "#{base_name}-#{width}w#{extension}"
    else
      "#{directory}/#{base_name}-#{width}w#{extension}"
    end
  end

  # Resolve sizes attribute from preset or custom string
  # @param sizes [String, Symbol, nil] Sizes value or preset
  # @param widths [Array<Integer>] Widths array (used for auto-generating sizes if needed)
  # @return [String, nil] Resolved sizes attribute
  def resolve_sizes(sizes, widths)
    case sizes
    when Symbol
      SIZES_PRESETS[sizes] || SIZES_PRESETS[:full]
    when String
      sizes
    when nil
      # Default to full viewport width
      SIZES_PRESETS[:full]
    end
  end

  # Check if image variants are available for the source
  # In production, this checks the asset manifest
  # In development, we assume they could be generated
  # @param source [String] Image path
  # @return [Boolean]
  def image_variants_available?(source)
    # In development, always try to use srcset (Rails will handle missing assets)
    return true if Rails.env.development?

    # In production, check if at least one variant exists
    DEFAULT_WIDTHS.any? { |w| asset_exists?(generate_variant_path(source, w)) }
  end

  # Check if an asset exists in the asset pipeline
  # @param path [String] Asset path
  # @return [Boolean]
  def asset_exists?(path)
    Rails.application.assets&.find_asset(path).present? ||
      Rails.application.assets_manifest&.find_sources(path)&.any?
  rescue StandardError
    false
  end

  # Change file extension
  # @param source [String] Original path
  # @param new_extension [Symbol, String] New extension (without dot)
  # @return [String] Path with new extension
  def change_extension(source, new_extension)
    directory = File.dirname(source)
    base_name = File.basename(source, ".*")
    ext = new_extension.to_s.start_with?(".") ? new_extension : ".#{new_extension}"

    if directory == "."
      "#{base_name}#{ext}"
    else
      "#{directory}/#{base_name}#{ext}"
    end
  end

  # Get MIME type for image format
  # @param format [Symbol, String] Image format
  # @return [String] MIME type
  def mime_type_for(format)
    {
      webp: "image/webp",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      avif: "image/avif",
      gif: "image/gif"
    }[format.to_sym] || "image/#{format}"
  end
end

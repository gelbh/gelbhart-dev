/**
 * Style Browser Component
 *
 * Reusable component for browsing and displaying Snazzy Maps styles.
 * Uses DOM manipulation for clean, accessible markup.
 */
export class StyleBrowser {
  constructor(containerElement) {
    this.containerElement = containerElement;
  }

  /**
   * Renders a grid of styles
   * @param {Array} styles - Array of style objects
   * @param {Function} onStyleSelect - Callback when a style is selected
   */
  renderStyles(styles, onStyleSelect) {
    if (!this.containerElement) return;

    // Clear existing content
    this.containerElement.innerHTML = "";

    if (!styles || styles.length === 0) {
      return;
    }

    styles.forEach((style) => {
      const styleCard = this.createStyleCard(style, onStyleSelect);
      this.containerElement.appendChild(styleCard);
    });
  }

  /**
   * Creates a style card element
   * @param {Object} style - Style object
   * @param {Function} onStyleSelect - Callback when style is selected
   * @returns {HTMLElement} Style card element
   */
  createStyleCard(style, onStyleSelect) {
    const col = document.createElement("div");
    col.className = "col-md-4 col-sm-6 d-flex";

    const card = document.createElement("div");
    card.className = "card style-modal-card h-100 w-100";
    card.style.position = "relative"; // For absolute positioning of URL link

    // URL link in top right corner (if url exists)
    if (style.url) {
      const urlLink = document.createElement("a");
      urlLink.href = style.url;
      urlLink.target = "_blank";
      urlLink.rel = "noopener noreferrer";
      urlLink.className = "style-modal-card-url-icon";
      urlLink.innerHTML = '<i class="bx bx-link-external"></i>';
      urlLink.setAttribute("aria-label", "View on Snazzy Maps");
      urlLink.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      card.appendChild(urlLink);
    }

    // Image at the top of the card (if imageUrl exists)
    if (style.imageUrl) {
      const imageWrapper = document.createElement("div");
      imageWrapper.className = "style-modal-card-image-wrapper";
      const image = document.createElement("img");
      image.src = style.imageUrl;
      image.alt = style.name || "Map style preview";
      image.className = "style-modal-card-image";
      imageWrapper.appendChild(image);
      card.appendChild(imageWrapper);
    }

    // Card body with flexbox for uniform height
    const cardBody = document.createElement("div");
    cardBody.className = "card-body p-3 d-flex flex-column";

    // Style name
    const title = document.createElement("h5");
    title.className = "h6 mb-2 text-white fw-semibold";
    title.textContent = style.name || "Unnamed Style";
    cardBody.appendChild(title);

    // Style description with truncation
    if (style.description) {
      const description = document.createElement("p");
      description.className = "text-white-50 small mb-3 flex-grow-1";
      description.style.display = "-webkit-box";
      description.style.webkitLineClamp = "3";
      description.style.webkitBoxOrient = "vertical";
      description.style.overflow = "hidden";
      description.textContent = style.description;
      cardBody.appendChild(description);
    } else {
      // Spacer if no description to maintain consistent height
      const spacer = document.createElement("div");
      spacer.className = "flex-grow-1 mb-3";
      cardBody.appendChild(spacer);
    }

    // Bottom section container (tags + URL + button) - pushed to bottom
    const bottomSection = document.createElement("div");
    bottomSection.className = "mt-auto";

    // Tags container
    const tagsWrapper = document.createElement("div");
    tagsWrapper.className = "mb-3";

    if (style.tags && style.tags.length > 0) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "d-flex flex-wrap gap-1";

      style.tags.slice(0, 3).forEach((tag) => {
        const tagBadge = document.createElement("span");
        tagBadge.className =
          "badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 small";
        tagBadge.textContent = tag;
        tagsContainer.appendChild(tagBadge);
      });

      if (style.tags.length > 3) {
        const moreBadge = document.createElement("span");
        moreBadge.className =
          "badge bg-secondary bg-opacity-25 text-white-50 border border-white border-opacity-10 small";
        moreBadge.textContent = `+${style.tags.length - 3}`;
        tagsContainer.appendChild(moreBadge);
      }

      tagsWrapper.appendChild(tagsContainer);
    }
    bottomSection.appendChild(tagsWrapper);

    // Load button
    const loadBtn = document.createElement("button");
    loadBtn.className = "btn btn-sm btn-primary w-100";
    loadBtn.textContent = "Load Style";
    loadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (onStyleSelect) {
        onStyleSelect(style);
      }
    });
    bottomSection.appendChild(loadBtn);

    cardBody.appendChild(bottomSection);

    card.appendChild(cardBody);
    col.appendChild(card);

    return col;
  }

  /**
   * Shows loading state
   */
  showLoading() {
    if (!this.containerElement) return;
    this.containerElement.innerHTML = "";
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "col-12 text-center py-5";
    loadingDiv.innerHTML = `
      <div class="spinner-border text-primary mb-3" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-white-50 mb-0">Loading styles...</p>
    `;
    this.containerElement.appendChild(loadingDiv);
  }

  /**
   * Shows empty state
   */
  showEmpty() {
    if (!this.containerElement) return;
    this.containerElement.innerHTML = "";
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "col-12 text-center py-5";
    emptyDiv.innerHTML = `
      <p class="h5 mb-2 text-white-50">No styles found</p>
      <p class="small text-white-50 mb-0">Try adjusting your search or filters</p>
    `;
    this.containerElement.appendChild(emptyDiv);
  }

  /**
   * Shows error state
   * @param {string} message - Error message
   */
  showError(message) {
    if (!this.containerElement) return;
    this.containerElement.innerHTML = "";
    const errorDiv = document.createElement("div");
    errorDiv.className = "col-12";
    const alert = document.createElement("div");
    alert.className = "alert alert-danger";
    alert.textContent = message || "Failed to load styles";
    errorDiv.appendChild(alert);
    this.containerElement.appendChild(errorDiv);
  }
}

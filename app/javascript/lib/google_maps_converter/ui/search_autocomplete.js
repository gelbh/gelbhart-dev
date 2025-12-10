/**
 * Search Autocomplete Component
 *
 * Manages autocomplete dropdown for Snazzy Maps search with recent searches,
 * popular suggestions, and tag/color matching.
 */
export class SearchAutocomplete {
  constructor(containerElement, options = {}) {
    this.containerElement = containerElement;
    this.onSelect = options.onSelect || (() => {});
    this.onDismiss = options.onDismiss || (() => {});
    this.selectedIndex = -1;
    this.suggestions = [];
    this.isVisible = false;
  }

  /**
   * Shows the autocomplete dropdown with suggestions
   * @param {Array} suggestions - Array of suggestion objects with {text, type, icon}
   * @param {string} query - Current search query
   */
  show(suggestions = [], query = "") {
    this.suggestions = suggestions;
    this.selectedIndex = -1;
    this.isVisible = suggestions.length > 0;

    if (!this.isVisible) {
      this.hide();
      return;
    }

    this.render(suggestions, query);
    this.containerElement.classList.remove("d-none");
    this.containerElement.setAttribute("aria-expanded", "true");
    this.containerElement.setAttribute("aria-busy", "false");
  }

  /**
   * Hides the autocomplete dropdown
   */
  hide() {
    this.isVisible = false;
    this.selectedIndex = -1;
    this.containerElement.classList.add("d-none");
    this.containerElement.setAttribute("aria-expanded", "false");
    // Clear all options
    const items = this.containerElement.querySelectorAll('[role="option"]');
    items.forEach((item) => {
      item.setAttribute("aria-selected", "false");
    });
  }

  /**
   * Renders the autocomplete dropdown
   * @param {Array} suggestions - Array of suggestion objects
   * @param {string} query - Current search query
   */
  render(suggestions, query) {
    if (!suggestions || suggestions.length === 0) {
      this.hide();
      return;
    }

    this.containerElement.innerHTML = "";

    // Group suggestions by type
    const grouped = this.groupSuggestions(suggestions);

    // Render each group
    Object.entries(grouped).forEach(([type, items]) => {
      if (items.length === 0) return;

      const group = document.createElement("div");
      group.className = "style-autocomplete-group";
      group.setAttribute("data-group-type", type);

      const header = document.createElement("div");
      header.className = "style-autocomplete-header";
      header.textContent = this.getGroupLabel(type);
      group.appendChild(header);

      items.forEach((item, index) => {
        const suggestionItem = this.createSuggestionItem(item, query, index);
        group.appendChild(suggestionItem);
      });

      this.containerElement.appendChild(group);
    });
  }

  /**
   * Groups suggestions by type
   * @param {Array} suggestions - Array of suggestions
   * @returns {Object} Grouped suggestions
   */
  groupSuggestions(suggestions) {
    const groups = {
      recent: [],
      popular: [],
      tags: [],
      colors: [],
    };

    suggestions.forEach((suggestion) => {
      if (groups[suggestion.type]) {
        groups[suggestion.type].push(suggestion);
      }
    });

    return groups;
  }

  /**
   * Gets the label for a suggestion group
   * @param {string} type - Group type
   * @returns {string} Label text
   */
  getGroupLabel(type) {
    const labels = {
      recent: "Recent Searches",
      popular: "Popular Searches",
      tags: "Tags",
      colors: "Colors",
    };
    return labels[type] || type;
  }

  /**
   * Creates a suggestion item element
   * @param {Object} suggestion - Suggestion object
   * @param {string} query - Current search query
   * @param {number} index - Item index
   * @returns {HTMLElement} Suggestion item element
   */
  createSuggestionItem(suggestion, query, index) {
    const item = document.createElement("div");
    item.className = "style-autocomplete-item";
    item.setAttribute("role", "option");
    item.setAttribute("data-index", index);
    item.setAttribute("aria-selected", "false");
    item.setAttribute("id", `autocomplete-option-${index}`);
    item.tabIndex = -1;

    if (index === this.selectedIndex) {
      item.classList.add("selected");
      item.setAttribute("aria-selected", "true");
    }

    // Icon
    if (suggestion.icon) {
      const icon = document.createElement("i");
      icon.className = `bx ${suggestion.icon} me-2`;
      icon.setAttribute("aria-hidden", "true");
      item.appendChild(icon);
    }

    // Text with highlighting
    const textSpan = document.createElement("span");
    textSpan.className = "style-autocomplete-text";
    textSpan.innerHTML = this.highlightMatch(suggestion.text, query);
    item.appendChild(textSpan);

    // Click handler
    item.addEventListener("click", () => {
      this.selectSuggestion(suggestion);
    });

    // Keyboard navigation
    item.addEventListener("mouseenter", () => {
      this.setSelectedIndex(index);
    });

    return item;
  }

  /**
   * Highlights matching text in suggestion
   * @param {string} text - Text to highlight
   * @param {string} query - Search query
   * @returns {string} HTML with highlighted matches
   */
  highlightMatch(text, query) {
    if (!query || !text) return this.escapeHtml(text);

    const escapedText = this.escapeHtml(text);
    const escapedQuery = this.escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return escapedText.replace(
      regex,
      '<mark class="style-autocomplete-highlight">$1</mark>'
    );
  }

  /**
   * Escapes HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sets the selected index and updates UI
   * @param {number} index - Index to select
   */
  setSelectedIndex(index) {
    // Remove previous selection
    const previous = this.containerElement.querySelector(
      `.style-autocomplete-item[data-index="${this.selectedIndex}"]`
    );
    if (previous) {
      previous.classList.remove("selected");
      previous.setAttribute("aria-selected", "false");
    }

    this.selectedIndex = index;

    // Add new selection
    if (index >= 0 && index < this.suggestions.length) {
      const current = this.containerElement.querySelector(
        `.style-autocomplete-item[data-index="${index}"]`
      );
      if (current) {
        current.classList.add("selected");
        current.setAttribute("aria-selected", "true");
        current.scrollIntoView({ block: "nearest", behavior: "smooth" });
        // Update aria-activedescendant on container
        this.containerElement.setAttribute(
          "aria-activedescendant",
          current.getAttribute("id")
        );
      }
    } else {
      this.containerElement.removeAttribute("aria-activedescendant");
    }
  }

  /**
   * Handles keyboard navigation
   * @param {string} key - Key pressed
   * @returns {boolean} True if key was handled
   */
  handleKey(key) {
    if (!this.isVisible) return false;

    switch (key) {
      case "ArrowDown":
        this.navigateDown();
        return true;
      case "ArrowUp":
        this.navigateUp();
        return true;
      case "Enter":
        if (this.selectedIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedIndex]);
          return true;
        }
        return false;
      case "Escape":
        this.hide();
        this.onDismiss();
        return true;
      default:
        return false;
    }
  }

  /**
   * Navigates down in suggestions
   */
  navigateDown() {
    if (this.selectedIndex < this.suggestions.length - 1) {
      this.setSelectedIndex(this.selectedIndex + 1);
    } else {
      this.setSelectedIndex(0);
    }
  }

  /**
   * Navigates up in suggestions
   */
  navigateUp() {
    if (this.selectedIndex > 0) {
      this.setSelectedIndex(this.selectedIndex - 1);
    } else {
      this.setSelectedIndex(this.suggestions.length - 1);
    }
  }

  /**
   * Selects a suggestion
   * @param {Object} suggestion - Suggestion to select
   */
  selectSuggestion(suggestion) {
    this.hide();
    this.onSelect(suggestion);
  }
}

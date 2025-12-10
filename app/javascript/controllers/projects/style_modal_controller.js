import { Controller } from "@hotwired/stimulus";
import {
  fetchStyles,
  fetchStyleById,
  parseStyleJson,
  fetchAvailableFilters,
} from "lib/google_maps_converter/services/snazzy_maps_service";
import { StyleBrowser } from "lib/google_maps_converter/ui/style_browser";
import { SearchAutocomplete } from "lib/google_maps_converter/ui/search_autocomplete";

/**
 * Style Modal Controller
 *
 * Handles the Snazzy Maps style browser modal functionality.
 * Allows users to browse, search, filter, and load styles from Snazzy Maps.
 * Communicates with the converter controller via outlets to load selected styles.
 */
export default class extends Controller {
  static targets = [
    "styleModal",
    "styleModalOverlay",
    "openStyleModalBtn",
    "closeStyleModalBtn",
    "styleSearchInput",
    "styleSearchClear",
    "styleSearchLoading",
    "autocompleteContainer",
    "styleSortSelect",
    "tagFiltersContainer",
    "colorFiltersContainer",
    "clearFiltersBtn",
    "filterControlsSection",
    "styleResultsGrid",
    "resultsCount",
    "styleModalLoading",
    "styleModalError",
    "styleModalEmpty",
    "paginationPrev",
    "paginationNext",
    "paginationInfo",
    "paginationPageSize",
    "searchStatus",
  ];

  static outlets = ["google-maps-converter"];

  connect() {
    this.modalState = {
      searchText: "",
      sort: "popular",
      selectedTags: new Set(),
      selectedColors: new Set(),
      currentPage: 1,
      pageSize: 24,
      totalPages: 1,
      totalResults: 0,
      availableTags: [],
      availableColors: [],
      isLoading: false,
      filtersVisible: true,
      highestPageLoaded: 1, // Track the highest page number we've successfully loaded
      hasKnownTotal: false, // Whether we have a reliable total count from the API
    };
    this.currentStyles = [];
    this.filterOptionsLoaded = false;
    this.currentRequestAbortController = null;
    this.searchHistory = this.loadSearchHistory();
    this.popularSearches = [
      "dark",
      "minimal",
      "colorful",
      "retro",
      "monochrome",
      "night",
      "satellite",
      "terrain",
    ];

    // Initialize style browser component
    if (this.hasStyleResultsGridTarget) {
      this.styleBrowser = new StyleBrowser(this.styleResultsGridTarget);
    }

    // Initialize autocomplete component
    if (this.hasAutocompleteContainerTarget) {
      this.autocomplete = new SearchAutocomplete(
        this.autocompleteContainerTarget,
        {
          onSelect: (suggestion) => {
            this.selectAutocompleteSuggestion(suggestion);
          },
          onDismiss: () => {
            this.styleSearchInputTarget?.focus();
          },
        }
      );
    }

    this.initialize();
  }

  disconnect() {
    // Cleanup event listeners
    if (this.modalKeyboardHandler) {
      document.removeEventListener("keydown", this.modalKeyboardHandler);
    }
    if (this.autocompleteClickHandler) {
      document.removeEventListener("click", this.autocompleteClickHandler);
    }
    if (this.hasStyleModalOverlayTarget && this.overlayClickHandler) {
      this.styleModalOverlayTarget.removeEventListener(
        "click",
        this.overlayClickHandler
      );
    }
    if (this.hasStyleModalTarget && this.modalClickHandler) {
      this.styleModalTarget.removeEventListener(
        "click",
        this.modalClickHandler
      );
    }
    // Cancel any pending requests
    if (this.currentRequestAbortController) {
      this.currentRequestAbortController.abort();
    }
    // Clear any pending debounced search
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  initialize() {
    // Adaptive debounce helper
    this.debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    // Store debounce timeout for cancellation
    this.debounceTimeout = null;

    // Adaptive debounced search - shorter delay for short queries
    this.debouncedSearch = (query) => {
      // Clear any pending debounced search
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }

      const queryLength = query?.trim().length || 0;
      const delay = queryLength < 3 ? 200 : queryLength < 6 ? 400 : 600;
      this.debounceTimeout = setTimeout(() => {
        this.modalState.currentPage = 1;
        this.loadStyles();
        this.debounceTimeout = null;
      }, delay);
    };

    // Handle modal overlay/backdrop click - store reference for cleanup
    if (this.hasStyleModalOverlayTarget) {
      this.overlayClickHandler = (e) => {
        // Close when clicking directly on the backdrop
        if (e.target === this.styleModalOverlayTarget) {
          e.stopPropagation();
          this.closeStyleModal();
        }
      };
      this.styleModalOverlayTarget.addEventListener(
        "click",
        this.overlayClickHandler,
        true // Use capture phase to catch the event early
      );
    }

    // Also handle clicks on the modal element itself (outside content)
    if (this.hasStyleModalTarget) {
      this.modalClickHandler = (e) => {
        // Close if clicking on the modal element itself (not on dialog or content)
        if (
          e.target === this.styleModalTarget &&
          !e.target.closest(".modal-dialog")
        ) {
          this.closeStyleModal();
        }
      };
      this.styleModalTarget.addEventListener("click", this.modalClickHandler);
    }

    // Handle keyboard shortcuts for modal
    this.modalKeyboardHandler = (e) => {
      this.handleModalKeydown(e);
    };
    document.addEventListener("keydown", this.modalKeyboardHandler);

    // Handle clicks outside autocomplete to dismiss it
    this.autocompleteClickHandler = (e) => {
      if (
        this.autocomplete?.isVisible &&
        !this.autocompleteContainerTarget.contains(e.target) &&
        e.target !== this.styleSearchInputTarget
      ) {
        this.autocomplete.hide();
      }
    };
    document.addEventListener("click", this.autocompleteClickHandler);

    // Update clear button visibility on input change
    if (this.hasStyleSearchInputTarget) {
      this.styleSearchInputTarget.addEventListener("input", () => {
        this.updateSearchUI();
      });
      this.styleSearchInputTarget.addEventListener("focus", () => {
        this.showAutocomplete();
      });
    }
  }

  openStyleModal() {
    // Use Bootstrap modal structure
    this.styleModalTarget.classList.remove("d-none");
    this.styleModalTarget.classList.add("show");
    this.styleModalTarget.style.display = "block";
    // Remove aria-hidden when modal is open to fix accessibility warning
    this.styleModalTarget.removeAttribute("aria-hidden");
    this.styleModalTarget.setAttribute("aria-modal", "true");
    document.body.classList.add("modal-open");
    if (this.hasStyleModalOverlayTarget) {
      this.styleModalOverlayTarget.classList.add("show");
    }
    // Sync sort dropdown with state
    if (this.hasStyleSortSelectTarget) {
      this.styleSortSelectTarget.value = this.modalState.sort;
    }
    if (!this.filterOptionsLoaded) {
      this.loadFilterOptions();
    }
    this.loadStyles();
    this.updateSearchUI();
    this.styleSearchInputTarget?.focus();
  }

  closeStyleModal() {
    // Remove focus from any element inside the modal to fix aria-hidden warning
    const activeElement = document.activeElement;
    if (activeElement && this.styleModalTarget.contains(activeElement)) {
      activeElement.blur();
    }

    this.styleModalTarget.classList.add("d-none");
    this.styleModalTarget.classList.remove("show");
    this.styleModalTarget.style.display = "none";
    this.styleModalTarget.setAttribute("aria-hidden", "true");
    this.styleModalTarget.removeAttribute("aria-modal");
    document.body.classList.remove("modal-open");
    if (this.hasStyleModalOverlayTarget) {
      this.styleModalOverlayTarget.classList.remove("show");
    }
  }

  async loadFilterOptions() {
    try {
      const filterData = await fetchAvailableFilters(3);
      this.modalState.availableTags = filterData.tags || [];
      this.modalState.availableColors = filterData.colors || [];
      this.renderFilterOptions();
      this.filterOptionsLoaded = true;
    } catch (error) {
      console.warn("Failed to load filter options:", error);
      this.filterOptionsLoaded = true;
    }
  }

  renderFilterOptions() {
    // Render tag filters
    const tagLoadingEl = document.getElementById("tag-filters-loading");
    if (tagLoadingEl) {
      tagLoadingEl.remove();
    }

    this.tagFiltersContainerTarget.innerHTML = "";
    if (this.modalState.availableTags.length === 0) {
      this.tagFiltersContainerTarget.innerHTML =
        '<span class="text-white-50 small">No tags available</span>';
    } else {
      this.modalState.availableTags.forEach((tag) => {
        const checkbox = document.createElement("label");
        checkbox.className =
          "style-modal-filter-item d-flex align-items-center gap-2 px-3 py-2 rounded small cursor-pointer";
        checkbox.innerHTML = `
          <input
            type="checkbox"
            value="${tag}"
            class="form-check-input"
            ${this.modalState.selectedTags.has(tag) ? "checked" : ""}
          />
          <span class="text-white-50">${tag}</span>
        `;
        checkbox.querySelector("input").addEventListener("change", (e) => {
          if (e.target.checked) {
            this.modalState.selectedTags.add(tag);
            checkbox.classList.add("active");
          } else {
            this.modalState.selectedTags.delete(tag);
            checkbox.classList.remove("active");
          }
          this.modalState.currentPage = 1;
          this.loadStyles();
        });
        if (this.modalState.selectedTags.has(tag)) {
          checkbox.classList.add("active");
        }
        this.tagFiltersContainerTarget.appendChild(checkbox);
      });
    }

    // Render color filters
    const colorLoadingEl = document.getElementById("color-filters-loading");
    if (colorLoadingEl) {
      colorLoadingEl.remove();
    }

    this.colorFiltersContainerTarget.innerHTML = "";
    if (this.modalState.availableColors.length === 0) {
      this.colorFiltersContainerTarget.innerHTML =
        '<span class="text-white-50 small">No colors available</span>';
    } else {
      this.modalState.availableColors.forEach((color) => {
        const checkbox = document.createElement("label");
        checkbox.className =
          "style-modal-filter-item d-flex align-items-center gap-2 px-3 py-2 rounded small cursor-pointer";
        checkbox.innerHTML = `
          <input
            type="checkbox"
            value="${color}"
            class="form-check-input"
            ${this.modalState.selectedColors.has(color) ? "checked" : ""}
          />
          <span class="text-white-50">${color}</span>
        `;
        checkbox.querySelector("input").addEventListener("change", (e) => {
          if (e.target.checked) {
            this.modalState.selectedColors.add(color);
            checkbox.classList.add("active");
          } else {
            this.modalState.selectedColors.delete(color);
            checkbox.classList.remove("active");
          }
          this.modalState.currentPage = 1;
          this.loadStyles();
        });
        if (this.modalState.selectedColors.has(color)) {
          checkbox.classList.add("active");
        }
        this.colorFiltersContainerTarget.appendChild(checkbox);
      });
    }
  }

  async loadStyles() {
    // Cancel previous request if still pending
    if (this.currentRequestAbortController) {
      this.currentRequestAbortController.abort();
    }

    // Create new abort controller for this request
    this.currentRequestAbortController = new AbortController();

    // Show optimistic UI (keep previous results visible)
    const previousStyles =
      this.currentStyles.length > 0 ? [...this.currentStyles] : null;

    if (this.modalState.isLoading) return;

    this.modalState.isLoading = true;
    this.hideModalError();
    this.hideModalEmpty();
    this.showModalLoading();
    this.showSearchLoading();

    try {
      const tags = Array.from(this.modalState.selectedTags);
      const colors = Array.from(this.modalState.selectedColors);

      // Check if request was aborted
      if (this.currentRequestAbortController.signal.aborted) {
        return;
      }

      const response = await fetchStyles({
        sort: this.modalState.sort,
        tag: tags.length > 0 ? tags : undefined,
        color: colors.length > 0 ? colors : undefined,
        text: this.modalState.searchText || undefined,
        page: this.modalState.currentPage,
        pageSize: this.modalState.pageSize,
      });

      // Check again if request was aborted after fetch
      if (this.currentRequestAbortController.signal.aborted) {
        return;
      }

      this.currentStyles = response.styles || [];

      // Update highest page loaded if we successfully loaded this page
      if (this.currentStyles.length > 0) {
        this.modalState.highestPageLoaded = Math.max(
          this.modalState.highestPageLoaded,
          this.modalState.currentPage
        );
      }

      // Handle pagination metadata
      if (response.totalPages !== null && response.totalPages !== undefined) {
        // API provided totalPages directly (most reliable)
        this.modalState.hasKnownTotal = true;
        this.modalState.totalPages = response.totalPages;
        this.modalState.totalResults = response.total ?? 0;
      } else if (response.hasKnownTotal && response.total !== null) {
        // We have a reliable total count from the API, calculate pages
        this.modalState.hasKnownTotal = true;
        this.modalState.totalResults = response.total;
        this.modalState.totalPages = Math.ceil(
          response.total / this.modalState.pageSize
        );
      } else if (response.hasFullPage) {
        // We got a full page, which suggests there might be more pages
        // Estimate total pages based on highest page loaded
        this.modalState.hasKnownTotal = false;
        this.modalState.totalPages = Math.max(
          this.modalState.totalPages,
          this.modalState.highestPageLoaded + 1 // Assume at least one more page exists
        );
        // Estimate total results (may be inaccurate, but better than nothing)
        this.modalState.totalResults =
          this.modalState.highestPageLoaded * this.modalState.pageSize +
          (response.hasFullPage
            ? this.modalState.pageSize
            : this.currentStyles.length);
      } else {
        // We got less than a full page, so this is likely the last page
        this.modalState.hasKnownTotal = false;
        this.modalState.totalPages = this.modalState.highestPageLoaded;
        this.modalState.totalResults =
          (this.modalState.highestPageLoaded - 1) * this.modalState.pageSize +
          this.currentStyles.length;
      }

      // Save successful search to history
      if (this.modalState.searchText) {
        this.saveToSearchHistory(this.modalState.searchText);
      }

      this.renderStyles();
      this.updatePagination();
      this.updateResultsCount();
    } catch (error) {
      // Don't show error if request was aborted
      if (error.name === "AbortError") {
        return;
      }
      console.error("Failed to load styles:", error);
      this.showModalError(`Failed to load styles: ${error.message}`);
      this.currentStyles = [];
      this.renderStyles();
    } finally {
      this.modalState.isLoading = false;
      this.hideModalLoading();
      this.hideSearchLoading();
      this.currentRequestAbortController = null;
    }
  }

  renderStyles() {
    if (!this.styleBrowser) return;

    if (this.currentStyles.length === 0) {
      this.styleBrowser.showEmpty();
      return;
    }

    const searchQuery = this.modalState.searchText || "";
    this.styleBrowser.renderStyles(
      this.currentStyles,
      async (style) => {
        await this.handleStyleSelection(style.id, style);
        this.closeStyleModal();
      },
      searchQuery
    );
  }

  updatePagination() {
    if (this.paginationPrevTarget) {
      this.paginationPrevTarget.disabled = this.modalState.currentPage === 1;
    }
    if (this.paginationNextTarget) {
      // Disable Next button if:
      // 1. We have a known total and we're on the last page, OR
      // 2. We don't have a known total but we're on the highest page loaded AND we didn't get a full page
      const isOnLastKnownPage =
        this.modalState.currentPage >= this.modalState.totalPages;
      const hasNoMorePages =
        !this.modalState.hasKnownTotal &&
        this.modalState.currentPage >= this.modalState.highestPageLoaded &&
        this.currentStyles.length < this.modalState.pageSize;

      this.paginationNextTarget.disabled = isOnLastKnownPage || hasNoMorePages;
    }
    if (this.paginationInfoTarget) {
      const totalPagesText = this.modalState.hasKnownTotal
        ? `${this.modalState.totalPages}`
        : `${this.modalState.totalPages}+`;
      this.paginationInfoTarget.textContent = `Page ${this.modalState.currentPage} of ${totalPagesText}`;
    }
  }

  updateResultsCount() {
    if (!this.resultsCountTarget) return;
    const { totalResults } = this.modalState;
    const countText =
      totalResults > 0
        ? `${totalResults} style${totalResults !== 1 ? "s" : ""} found`
        : "No styles found";
    this.resultsCountTarget.textContent = countText;

    // Announce to screen readers
    if (this.hasSearchStatusTarget) {
      this.searchStatusTarget.textContent = countText;
      // Clear after announcement
      setTimeout(() => {
        if (this.hasSearchStatusTarget) {
          this.searchStatusTarget.textContent = "";
        }
      }, 1000);
    }
  }

  clearFilters() {
    this.modalState.searchText = "";
    this.modalState.selectedTags.clear();
    this.modalState.selectedColors.clear();
    this.modalState.sort = "popular";
    this.modalState.currentPage = 1;
    this.modalState.highestPageLoaded = 1;
    this.modalState.hasKnownTotal = false;
    this.styleSearchInputTarget.value = "";
    if (this.hasStyleSortSelectTarget) {
      this.styleSortSelectTarget.value = "popular";
    }
    this.renderFilterOptions();
    this.loadStyles();
  }

  handleStyleSearch() {
    const query = this.styleSearchInputTarget.value.trim();
    const previousQuery = this.modalState.searchText;
    this.modalState.searchText = query;
    this.updateSearchUI();
    this.showAutocomplete();

    // If query is empty and we had a previous query, reset immediately
    if (!query && previousQuery) {
      // Cancel any pending debounced search
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }
      this.modalState.currentPage = 1;
      this.modalState.highestPageLoaded = 1;
      this.modalState.hasKnownTotal = false;
      this.loadStyles();
      return;
    }

    // Don't search for empty queries if there was no previous query
    if (!query) {
      return;
    }

    this.modalState.currentPage = 1;
    this.modalState.highestPageLoaded = 1;
    this.modalState.hasKnownTotal = false;
    this.debouncedSearch(query);
  }

  handleSearchKeydown(event) {
    // Handle autocomplete keyboard navigation
    if (this.autocomplete?.isVisible) {
      if (this.autocomplete.handleKey(event.key)) {
        event.preventDefault();
        return;
      }
    }

    // Enter key - trigger immediate search
    if (event.key === "Enter") {
      event.preventDefault();
      this.autocomplete?.hide();
      const query = this.styleSearchInputTarget.value.trim();
      if (query) {
        this.modalState.searchText = query;
        this.modalState.currentPage = 1;
        this.modalState.highestPageLoaded = 1;
        this.modalState.hasKnownTotal = false;
        this.saveToSearchHistory(query);
        this.loadStyles();
      }
    }

    // Escape key - clear search when focused
    if (event.key === "Escape") {
      if (this.modalState.searchText) {
        event.preventDefault();
        this.clearSearch();
      } else {
        this.autocomplete?.hide();
      }
    }
  }

  clearSearch() {
    // Cancel any pending debounced search
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.modalState.searchText = "";
    if (this.hasStyleSearchInputTarget) {
      this.styleSearchInputTarget.value = "";
    }
    this.updateSearchUI();
    this.autocomplete?.hide();
    this.modalState.currentPage = 1;
    this.modalState.highestPageLoaded = 1;
    this.modalState.hasKnownTotal = false;
    this.loadStyles();
  }

  updateSearchUI() {
    const hasText = this.styleSearchInputTarget?.value.trim().length > 0;
    if (this.hasStyleSearchClearTarget) {
      if (hasText) {
        this.styleSearchClearTarget.classList.remove("d-none");
      } else {
        this.styleSearchClearTarget.classList.add("d-none");
      }
    }
  }

  showSearchLoading() {
    if (this.hasStyleSearchLoadingTarget) {
      this.styleSearchLoadingTarget.classList.remove("d-none");
    }
  }

  hideSearchLoading() {
    if (this.hasStyleSearchLoadingTarget) {
      this.styleSearchLoadingTarget.classList.add("d-none");
    }
  }

  showAutocomplete() {
    if (!this.autocomplete) return;

    const query = this.styleSearchInputTarget?.value.trim() || "";
    const suggestions = this.buildAutocompleteSuggestions(query);
    this.autocomplete.show(suggestions, query);

    // Update ARIA attributes
    if (this.hasStyleSearchInputTarget) {
      this.styleSearchInputTarget.setAttribute(
        "aria-expanded",
        suggestions.length > 0 ? "true" : "false"
      );
    }
    if (this.hasAutocompleteContainerTarget) {
      this.autocompleteContainerTarget.setAttribute(
        "aria-expanded",
        suggestions.length > 0 ? "true" : "false"
      );
    }
  }

  buildAutocompleteSuggestions(query) {
    const suggestions = [];
    const queryLower = query.toLowerCase();

    // Recent searches
    this.searchHistory
      .filter((item) => !query || item.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .forEach((item) => {
        suggestions.push({
          text: item,
          type: "recent",
          icon: "bx-history",
        });
      });

    // Popular searches
    if (!query || query.length < 2) {
      this.popularSearches.slice(0, 3).forEach((item) => {
        if (!this.searchHistory.includes(item)) {
          suggestions.push({
            text: item,
            type: "popular",
            icon: "bx-trending-up",
          });
        }
      });
    }

    // Tag matches
    if (query && this.modalState.availableTags.length > 0) {
      this.modalState.availableTags
        .filter((tag) => tag.toLowerCase().includes(queryLower))
        .slice(0, 3)
        .forEach((tag) => {
          suggestions.push({
            text: tag,
            type: "tags",
            icon: "bx-tag",
          });
        });
    }

    // Color matches
    if (query && this.modalState.availableColors.length > 0) {
      this.modalState.availableColors
        .filter((color) => color.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .forEach((color) => {
          suggestions.push({
            text: color,
            type: "colors",
            icon: "bx-palette",
          });
        });
    }

    return suggestions;
  }

  selectAutocompleteSuggestion(suggestion) {
    if (!suggestion || !suggestion.text) return;

    this.modalState.searchText = suggestion.text;
    if (this.hasStyleSearchInputTarget) {
      this.styleSearchInputTarget.value = suggestion.text;
      this.styleSearchInputTarget.setAttribute("aria-expanded", "false");
    }
    if (this.hasAutocompleteContainerTarget) {
      this.autocompleteContainerTarget.setAttribute("aria-expanded", "false");
    }
    this.updateSearchUI();
    this.saveToSearchHistory(suggestion.text);
    this.modalState.currentPage = 1;
    this.modalState.highestPageLoaded = 1;
    this.modalState.hasKnownTotal = false;
    this.loadStyles();
  }

  loadSearchHistory() {
    try {
      const stored = localStorage.getItem("snazzy_maps_search_history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveToSearchHistory(query) {
    if (!query || !query.trim()) return;

    try {
      const trimmed = query.trim();
      // Remove if already exists
      this.searchHistory = this.searchHistory.filter(
        (item) => item !== trimmed
      );
      // Add to beginning
      this.searchHistory.unshift(trimmed);
      // Keep only last 10
      this.searchHistory = this.searchHistory.slice(0, 10);
      // Save to localStorage
      localStorage.setItem(
        "snazzy_maps_search_history",
        JSON.stringify(this.searchHistory)
      );
    } catch {
      // Ignore localStorage errors (e.g., private browsing)
    }
  }

  handleStyleSort() {
    this.modalState.sort = this.styleSortSelectTarget.value;
    this.modalState.currentPage = 1;
    this.modalState.highestPageLoaded = 1;
    this.modalState.hasKnownTotal = false;
    this.loadStyles();
  }

  handlePaginationPrev() {
    if (this.modalState.currentPage > 1) {
      this.modalState.currentPage--;
      this.loadStyles();
      this.styleResultsGridTarget?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  handlePaginationNext() {
    if (this.modalState.currentPage < this.modalState.totalPages) {
      this.modalState.currentPage++;
      this.loadStyles();
      this.styleResultsGridTarget?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  handlePaginationPageSize() {
    this.modalState.pageSize = parseInt(
      this.paginationPageSizeTarget.value,
      10
    );
    this.modalState.currentPage = 1;
    this.loadStyles();
  }

  async handleStyleSelection(styleId, cachedStyle = null) {
    if (!styleId) return;

    // Show loading in converter controller via outlet
    if (this.hasGoogleMapsConverterOutlet) {
      this.googleMapsConverterOutlet.showLoading(true);
    }

    try {
      let selectedStyle = cachedStyle;

      if (cachedStyle && cachedStyle.json) {
        const v1Json = parseStyleJson(cachedStyle);
        if (v1Json) {
          const formatted = JSON.stringify(v1Json, null, 2);
          // Load style into converter controller via outlet
          if (this.hasGoogleMapsConverterOutlet) {
            this.googleMapsConverterOutlet.loadStyleIntoEditor(formatted);
            // Auto-convert after loading
            setTimeout(() => {
              if (this.googleMapsConverterOutlet.convert) {
                this.googleMapsConverterOutlet.convert();
              }
            }, 100);
          } else {
            // Fallback: find controller directly
            const converterElement = document.querySelector(
              '[data-controller*="google-maps-converter"]'
            );
            if (converterElement) {
              const controller =
                this.application.getControllerForElementAndIdentifier(
                  converterElement,
                  "google-maps-converter"
                );
              if (controller) {
                controller.loadStyleIntoEditor(formatted);
                // Auto-convert after loading
                setTimeout(() => {
                  if (controller.convert) {
                    controller.convert();
                  }
                }, 100);
              }
            }
          }
          return;
        }
      }

      const response = await fetchStyleById(styleId);

      if (!selectedStyle) {
        selectedStyle = response;
        if (Array.isArray(response)) {
          selectedStyle = response[0];
        } else if (response.results && Array.isArray(response.results)) {
          selectedStyle = response.results[0];
        } else if (response.data) {
          selectedStyle = response.data;
        }
      }

      if (!selectedStyle) {
        throw new Error("Selected style not found in API response");
      }

      let v1Json = null;

      if (selectedStyle.parsedJson) {
        v1Json = selectedStyle.parsedJson;
      } else if (selectedStyle.json) {
        v1Json = parseStyleJson(selectedStyle);
        if (!v1Json) {
          try {
            if (typeof selectedStyle.json === "string") {
              v1Json = JSON.parse(selectedStyle.json);
            } else {
              v1Json = selectedStyle.json;
            }
          } catch (e) {
            console.warn("Failed to parse style JSON:", e);
          }
        }
      } else if (selectedStyle.styles) {
        v1Json = { styles: selectedStyle.styles };
      } else if (Array.isArray(selectedStyle)) {
        v1Json = { styles: selectedStyle };
      } else if (selectedStyle.variant || selectedStyle.styles) {
        v1Json = selectedStyle;
      }

      if (!v1Json) {
        throw new Error(
          `Style does not contain valid JSON. The style may not be available, may require authentication, or may be in an unsupported format.`
        );
      }

      const formatted = JSON.stringify(v1Json, null, 2);
      // Load style into converter controller via outlet
      if (this.hasGoogleMapsConverterOutlet) {
        this.googleMapsConverterOutlet.loadStyleIntoEditor(formatted);
        // Auto-convert after loading
        setTimeout(() => {
          if (this.googleMapsConverterOutlet.convert) {
            this.googleMapsConverterOutlet.convert();
          }
        }, 100);
      } else {
        // Fallback: find controller directly
        const converterElement = document.querySelector(
          '[data-controller*="google-maps-converter"]'
        );
        if (converterElement) {
          const controller =
            this.application.getControllerForElementAndIdentifier(
              converterElement,
              "google-maps-converter"
            );
          if (controller) {
            controller.loadStyleIntoEditor(formatted);
            // Auto-convert after loading
            setTimeout(() => {
              if (controller.convert) {
                controller.convert();
              }
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error("Error loading style:", error);
      // Show error in converter controller via outlet
      if (this.hasGoogleMapsConverterOutlet) {
        this.googleMapsConverterOutlet.showError(
          `Failed to load style: ${error.message}`
        );
      }
    } finally {
      // Hide loading in converter controller via outlet
      if (this.hasGoogleMapsConverterOutlet) {
        this.googleMapsConverterOutlet.showLoading(false);
      }
    }
  }

  showModalLoading() {
    if (this.hasStyleModalLoadingTarget) {
      this.styleModalLoadingTarget.classList.remove("d-none");
    }
    if (this.styleBrowser) {
      this.styleBrowser.showLoading();
    }
  }

  hideModalLoading() {
    if (this.hasStyleModalLoadingTarget) {
      this.styleModalLoadingTarget.classList.add("d-none");
    }
  }

  showModalError(message) {
    this.styleModalErrorTarget.textContent = message;
    this.styleModalErrorTarget.classList.remove("d-none");
  }

  hideModalError() {
    this.styleModalErrorTarget.classList.add("d-none");
  }

  showModalEmpty() {
    if (this.hasStyleModalEmptyTarget) {
      this.styleModalEmptyTarget.classList.remove("d-none");
    }
    if (this.styleBrowser) {
      const suggestedSearches = this.getSuggestedSearches(
        this.modalState.searchText
      );
      this.styleBrowser.showEmpty({
        searchQuery: this.modalState.searchText,
        suggestedSearches,
        popularTags: this.modalState.availableTags.slice(0, 5),
        popularColors: this.modalState.availableColors.slice(0, 5),
      });
    }
  }

  getSuggestedSearches(query) {
    if (!query || query.length < 2) {
      return this.popularSearches.slice(0, 5);
    }

    const queryLower = query.toLowerCase();
    const suggestions = [];

    // Find similar tags
    this.modalState.availableTags.forEach((tag) => {
      if (
        tag.toLowerCase().includes(queryLower) ||
        this.isSimilar(tag, query)
      ) {
        suggestions.push(tag);
      }
    });

    // Find similar colors
    this.modalState.availableColors.forEach((color) => {
      if (
        color.toLowerCase().includes(queryLower) ||
        this.isSimilar(color, query)
      ) {
        suggestions.push(color);
      }
    });

    // Add popular searches if no matches
    if (suggestions.length === 0) {
      suggestions.push(...this.popularSearches.slice(0, 3));
    }

    return suggestions.slice(0, 5);
  }

  isSimilar(str1, str2) {
    // Simple similarity check - if strings share significant characters
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1.length < 3 || s2.length < 3) return false;
    // Check if one contains the other or they share at least 60% of characters
    return (
      s1.includes(s2) || s2.includes(s1) || this.levenshteinRatio(s1, s2) > 0.6
    );
  }

  levenshteinRatio(str1, str2) {
    // Simple Levenshtein distance ratio
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  hideModalEmpty() {
    if (this.hasStyleModalEmptyTarget) {
      this.styleModalEmptyTarget.classList.add("d-none");
    }
  }

  // Handle modal keyboard shortcuts
  handleModalKeydown(event) {
    if (this.styleModalTarget.classList.contains("d-none")) return;

    if (event.key === "Escape") {
      // If autocomplete is visible, hide it first
      if (this.autocomplete?.isVisible) {
        this.autocomplete.hide();
        event.preventDefault();
        return;
      }
      // If search has text, clear it
      if (this.modalState.searchText) {
        this.clearSearch();
        event.preventDefault();
        return;
      }
      // Otherwise close modal
      this.closeStyleModal();
    }
  }

  handleDialogClick(event) {
    // Close modal when clicking on the dialog (outside the content)
    if (event.target === event.currentTarget) {
      this.closeStyleModal();
    }
  }

  stopPropagation(event) {
    // Prevent closing when clicking inside modal content
    event.stopPropagation();
  }
}

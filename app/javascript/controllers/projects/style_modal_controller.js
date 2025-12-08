import { Controller } from "@hotwired/stimulus";
import {
  fetchStyles,
  fetchStyleById,
  parseStyleJson,
  fetchAvailableFilters,
} from "lib/google_maps_converter/services/snazzy_maps_service";
import { StyleBrowser } from "lib/google_maps_converter/ui/style_browser";

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

    // Initialize style browser component
    if (this.hasStyleResultsGridTarget) {
      this.styleBrowser = new StyleBrowser(this.styleResultsGridTarget);
    }

    this.initialize();
  }

  disconnect() {
    // Cleanup event listeners
    if (this.modalKeyboardHandler) {
      document.removeEventListener("keydown", this.modalKeyboardHandler);
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
  }

  initialize() {
    // Debounce helper
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

    this.debouncedSearch = this.debounce(() => {
      this.modalState.currentPage = 1;
      this.loadStyles();
    }, 400);

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
    if (this.modalState.isLoading) return;

    this.modalState.isLoading = true;
    this.hideModalError();
    this.hideModalEmpty();
    this.showModalLoading();

    try {
      const tags = Array.from(this.modalState.selectedTags);
      const colors = Array.from(this.modalState.selectedColors);

      const response = await fetchStyles({
        sort: this.modalState.sort,
        tag: tags.length > 0 ? tags : undefined,
        color: colors.length > 0 ? colors : undefined,
        text: this.modalState.searchText || undefined,
        page: this.modalState.currentPage,
        pageSize: this.modalState.pageSize,
      });

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

      this.renderStyles();
      this.updatePagination();
      this.updateResultsCount();
    } catch (error) {
      console.error("Failed to load styles:", error);
      this.showModalError(`Failed to load styles: ${error.message}`);
      this.currentStyles = [];
      this.renderStyles();
    } finally {
      this.modalState.isLoading = false;
      this.hideModalLoading();
    }
  }

  renderStyles() {
    if (!this.styleBrowser) return;

    if (this.currentStyles.length === 0) {
      this.styleBrowser.showEmpty();
      return;
    }

    this.styleBrowser.renderStyles(this.currentStyles, async (style) => {
      await this.handleStyleSelection(style.id, style);
      this.closeStyleModal();
    });
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
    this.resultsCountTarget.textContent =
      totalResults > 0
        ? `${totalResults} style${totalResults !== 1 ? "s" : ""} found`
        : "No styles found";
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
    this.modalState.searchText = this.styleSearchInputTarget.value;
    this.modalState.currentPage = 1;
    this.modalState.highestPageLoaded = 1;
    this.modalState.hasKnownTotal = false;
    this.debouncedSearch();
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
      this.styleBrowser.showEmpty();
    }
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
      this.closeStyleModal();
    }
    if (
      event.key === "Enter" &&
      document.activeElement === this.styleSearchInputTarget
    ) {
      event.preventDefault();
      this.loadStyles();
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

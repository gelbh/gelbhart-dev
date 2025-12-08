/**
 * Validation Display Component
 *
 * Reusable component for displaying validation errors.
 * Uses DOM manipulation instead of HTML strings for clean, accessible markup.
 */
export class ValidationDisplay {
  constructor(containerElement) {
    this.containerElement = containerElement;
  }

  /**
   * Shows validation errors
   * @param {Array} errors - Array of validation error objects
   * @param {Object} v2Result - The V2 result object for context
   */
  showErrors(errors, v2Result) {
    if (!this.containerElement) return;
    if (!errors || errors.length === 0) {
      this.hide();
      return;
    }

    // Clear existing content
    this.containerElement.innerHTML = "";

    // Create summary
    const summary = document.createElement("div");
    summary.className = "alert alert-warning mb-3";
    const summaryText = document.createElement("p");
    summaryText.className = "mb-0";
    summaryText.innerHTML = `<strong>${errors.length} validation error${
      errors.length !== 1 ? "s" : ""
    } found</strong>`;
    summary.appendChild(summaryText);
    this.containerElement.appendChild(summary);

    // Group errors by path
    const errorsByPath = {};
    errors.forEach((error) => {
      const path = error.instancePath || error.schemaPath || "/";
      if (!errorsByPath[path]) {
        errorsByPath[path] = [];
      }
      errorsByPath[path].push(error);
    });

    // Display errors grouped by path
    Object.entries(errorsByPath).forEach(([path, pathErrors]) => {
      const pathContainer = document.createElement("div");
      pathContainer.className =
        "mb-3 p-3 bg-dark rounded border-start border-4 border-danger";

      // Path header
      const pathHeader = document.createElement("div");
      pathHeader.className = "mb-2 fw-bold";
      const pathLabel = document.createElement("strong");
      pathLabel.textContent = "Path: ";
      const pathCode = document.createElement("code");
      pathCode.className = "bg-dark px-2 py-1 rounded small";
      pathCode.textContent = path || "/";
      pathHeader.appendChild(pathLabel);
      pathHeader.appendChild(pathCode);
      pathContainer.appendChild(pathHeader);

      // Error details
      pathErrors.forEach((error) => {
        const errorDiv = document.createElement("div");
        errorDiv.className = "mb-2 p-2 bg-dark bg-opacity-50 rounded";

        // Error message
        const errorMsg = document.createElement("div");
        errorMsg.className = "mb-1 text-danger fw-medium";
        const errorLabel = document.createElement("strong");
        errorLabel.textContent = "Error: ";
        errorMsg.appendChild(errorLabel);
        errorMsg.appendChild(
          document.createTextNode(error.message || "Unknown error")
        );
        errorDiv.appendChild(errorMsg);

        // Error params
        if (error.params) {
          const paramsDiv = document.createElement("div");
          paramsDiv.className = "mb-1 text-muted small";
          const paramsLabel = document.createElement("strong");
          paramsLabel.textContent = "Details: ";
          paramsDiv.appendChild(paramsLabel);
          const paramsText = Object.entries(error.params)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(", ");
          paramsDiv.appendChild(document.createTextNode(paramsText));
          errorDiv.appendChild(paramsDiv);
        }

        // Show actual value if available
        if (path && v2Result) {
          const value = this.getNestedValue(v2Result, path);
          if (value !== undefined) {
            const valueDiv = document.createElement("div");
            valueDiv.className = "mt-2 p-2 bg-dark border rounded";
            const valueLabel = document.createElement("strong");
            valueLabel.textContent = "Value: ";
            const valueCode = document.createElement("code");
            valueCode.className = "font-monospace small";
            valueCode.textContent = JSON.stringify(value);
            valueDiv.appendChild(valueLabel);
            valueDiv.appendChild(valueCode);
            errorDiv.appendChild(valueDiv);
          }
        }

        pathContainer.appendChild(errorDiv);
      });

      this.containerElement.appendChild(pathContainer);
    });

    // Show container
    this.containerElement.classList.remove("d-none");
    this.containerElement.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  /**
   * Hides validation errors
   */
  hide() {
    if (this.containerElement) {
      this.containerElement.classList.add("d-none");
    }
  }

  /**
   * Gets a nested value from an object using a path string
   * @param {Object} obj - The object to traverse
   * @param {string} path - The path string (e.g., "/styles/0/featureType")
   * @returns {*} The value at the path, or undefined
   */
  getNestedValue(obj, path) {
    if (!path || path === "/") {
      return obj;
    }

    const parts = path.split("/").filter(Boolean);
    let current = obj;

    for (const part of parts) {
      if (current == null) {
        return undefined;
      }

      const index = Number.parseInt(part, 10);
      current = !Number.isNaN(index) ? current[index] : current[part];
    }

    return current;
  }
}

import { Controller } from "@hotwired/stimulus";
import { convertV1ToV2 } from "lib/google_maps_converter/core/converter";
import { SimpleEditor } from "lib/google_maps_converter/ui/simple_editor";
import { validateV2 } from "lib/google_maps_converter/services/validation_service";
import { ValidationDisplay } from "lib/google_maps_converter/ui/validation_display";
import {
  readJsonFile,
  downloadJsonFile,
} from "lib/google_maps_converter/services/file_service";
import {
  UI_TIMEOUTS,
  DEFAULT_FILENAMES,
} from "lib/google_maps_converter/core/constants";

/**
 * Google Maps Converter Controller
 *
 * Handles conversion from V1 to V2 format with validation.
 */
export default class extends Controller {
  static targets = [
    "v1Input",
    "v2Output",
    "convertBtn",
    "errorDisplay",
    "validationStatus",
    "validationErrors",
    "fileInput",
    "downloadBtn",
    "copyBtn",
  ];

  connect() {
    if (!this.hasV1InputTarget || !this.hasV2OutputTarget) {
      console.error("Google Maps Converter: Required targets not found");
      return;
    }

    this.editor = new SimpleEditor(this.v1InputTarget, this.v2OutputTarget);
    this.validationDisplay = this.hasValidationErrorsTarget
      ? new ValidationDisplay(this.validationErrorsTarget)
      : null;
    this.currentV2Output = null;

    // Sync textarea heights
    this.setupHeightSync();
  }

  disconnect() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setupHeightSync() {
    // Set initial heights to be equal
    this.syncHeights();

    // Track last known heights to detect which one changed
    this.lastV1Height = this.v1InputTarget.offsetHeight;
    this.lastV2Height = this.v2OutputTarget.offsetHeight;

    // Use ResizeObserver to detect when textareas are resized
    // ResizeObserver is widely supported (all modern browsers since 2017)
    this.resizeObserver = new ResizeObserver((entries) => {
      // Find which textarea changed
      for (const entry of entries) {
        const currentHeight = entry.target.offsetHeight;
        if (entry.target === this.v1InputTarget) {
          if (Math.abs(currentHeight - this.lastV1Height) > 1) {
            this.lastV1Height = currentHeight;
            this.syncToHeight(currentHeight);
          }
        } else if (entry.target === this.v2OutputTarget) {
          if (Math.abs(currentHeight - this.lastV2Height) > 1) {
            this.lastV2Height = currentHeight;
            this.syncToHeight(currentHeight);
          }
        }
      }
    });

    this.resizeObserver.observe(this.v1InputTarget);
    this.resizeObserver.observe(this.v2OutputTarget);
  }

  syncToHeight(targetHeight) {
    if (!this.v1InputTarget || !this.v2OutputTarget) return;

    // Set both to the target height
    this.v1InputTarget.style.height = `${targetHeight}px`;
    this.v2OutputTarget.style.height = `${targetHeight}px`;

    // Update last known heights
    this.lastV1Height = targetHeight;
    this.lastV2Height = targetHeight;
  }

  syncHeights() {
    if (!this.v1InputTarget || !this.v2OutputTarget) return;

    const v1Height = this.v1InputTarget.offsetHeight;
    const v2Height = this.v2OutputTarget.offsetHeight;

    // Use the taller of the two heights to sync both
    const targetHeight = Math.max(v1Height, v2Height);
    this.syncToHeight(targetHeight);
  }

  async convert() {
    if (!this.editor) {
      this.showError("Editor not initialized");
      return;
    }

    if (this.isConverting) {
      return; // Prevent multiple simultaneous conversions
    }

    const input = this.editor.getV1Value();

    if (!input) {
      this.showError("Please enter V1 JSON to convert");
      return;
    }

    this.isConverting = true;
    this.hideError();
    this.updateValidationStatus("pending", "Validating...");
    this.setConvertButtonLoading(true);

    try {
      const v2Result = convertV1ToV2(input);
      this.currentV2Output = v2Result;

      const formatted = JSON.stringify(v2Result, null, 2);
      this.editor.setV2Value(formatted);

      // Validate output
      const validation = await validateV2(v2Result);
      if (validation.valid) {
        this.updateValidationStatus("valid", "Valid ✓");
        this.hideValidationErrors();
      } else {
        this.updateValidationStatus("invalid", "Invalid ✗");
        if (this.validationDisplay) {
          this.validationDisplay.showErrors(validation.errors, v2Result);
        }
      }
    } catch (error) {
      let errorMessage = "Conversion error";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        errorMessage = "An unexpected error occurred during conversion";
      }
      this.showError(`Conversion error: ${errorMessage}`);
      this.editor.setV2Value("");
      this.currentV2Output = null;
      this.updateValidationStatus("invalid", "Error");
    } finally {
      this.isConverting = false;
      this.setConvertButtonLoading(false);
    }
  }

  setConvertButtonLoading(loading) {
    if (!this.hasConvertBtnTarget) return;

    if (loading) {
      this.convertBtnTarget.disabled = true;
      const originalText = this.convertBtnTarget.innerHTML;
      this.convertBtnTarget.dataset.originalText = originalText;
      this.convertBtnTarget.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Converting...';
    } else {
      this.convertBtnTarget.disabled = false;
      const originalText = this.convertBtnTarget.dataset.originalText;
      if (originalText) {
        this.convertBtnTarget.innerHTML = originalText;
      }
    }
  }

  showError(message) {
    if (this.hasErrorDisplayTarget) {
      this.errorDisplayTarget.textContent = message;
      this.errorDisplayTarget.classList.remove("d-none");
    }
  }

  hideError() {
    this.errorDisplayTarget?.classList.add("d-none");
  }

  updateValidationStatus(status, text) {
    if (!this.hasValidationStatusTarget) return;

    const statusClasses = {
      valid: "badge bg-success",
      invalid: "badge bg-danger",
      pending: "badge bg-warning",
    };

    this.validationStatusTarget.className =
      statusClasses[status] || "badge bg-secondary";
    this.validationStatusTarget.textContent = text;
    this.validationStatusTarget.classList.toggle("d-none", !text);
  }

  hideValidationErrors() {
    if (this.validationDisplay) {
      this.validationDisplay.hide();
    }
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await readJsonFile(file);
      this.editor.setV1Value(content);
      this.hideError();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to read file";
      this.showError(errorMessage);
    } finally {
      // Reset file input
      event.target.value = "";
    }
  }

  download() {
    if (!this.currentV2Output) {
      this.showError("No output to download. Please convert V1 JSON first.");
      return;
    }

    try {
      downloadJsonFile(this.currentV2Output, DEFAULT_FILENAMES.V2_STYLE);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to download file";
      this.showError(errorMessage);
    }
  }

  async copy() {
    const outputValue = this.editor.getV2Value();
    if (!outputValue) {
      this.showError("No output to copy. Please convert V1 JSON first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(outputValue);
      // Visual feedback
      if (this.hasCopyBtnTarget) {
        const originalText = this.copyBtnTarget.textContent;
        this.copyBtnTarget.textContent = "Copied!";
        this.copyBtnTarget.classList.remove("btn-outline-light");
        this.copyBtnTarget.classList.add("btn-success");
        setTimeout(() => {
          this.copyBtnTarget.textContent = originalText;
          this.copyBtnTarget.classList.remove("btn-success");
          this.copyBtnTarget.classList.add("btn-outline-light");
        }, UI_TIMEOUTS.COPY_FEEDBACK);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to copy to clipboard";
      this.showError(`Failed to copy: ${errorMessage}`);
    }
  }

  // Outlet methods for style modal controller
  loadStyleIntoEditor(styleJson) {
    if (!this.editor) return;
    this.editor.setV1Value(styleJson);
    this.hideError();
  }

  showLoading(show) {
    // Optional: Add loading indicator if needed
    if (show && this.hasConvertBtnTarget) {
      this.convertBtnTarget.disabled = true;
    } else if (this.hasConvertBtnTarget) {
      this.convertBtnTarget.disabled = false;
    }
  }
}

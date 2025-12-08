/**
 * Simple Textarea Editor
 *
 * Minimal textarea-based editor for MVP phase.
 * Provides simple get/set value API without CodeMirror complexity.
 */
export class SimpleEditor {
  constructor(v1InputElement, v2OutputElement) {
    this.v1InputElement = v1InputElement;
    this.v2OutputElement = v2OutputElement;
  }

  /**
   * Get V1 input value
   * @returns {string} The input value, trimmed
   */
  getV1Value() {
    if (!this.v1InputElement) {
      return "";
    }
    const value = this.v1InputElement.value;
    return value ? value.trim() : "";
  }

  /**
   * Set V1 input value
   * @param {string} value - The value to set
   */
  setV1Value(value) {
    if (this.v1InputElement) {
      this.v1InputElement.value = value || "";
    }
  }

  /**
   * Get V2 output value
   * @returns {string} The output value
   */
  getV2Value() {
    if (!this.v2OutputElement) {
      return "";
    }
    return this.v2OutputElement.value || "";
  }

  /**
   * Set V2 output value
   * @param {string} value - The value to set
   */
  setV2Value(value) {
    if (this.v2OutputElement) {
      this.v2OutputElement.value = value || "";
    }
  }
}

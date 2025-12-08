/**
 * File Service
 *
 * Handles file upload and download operations.
 * Pure service with no UI concerns.
 */

import { DEFAULT_FILENAMES } from "../core/constants.js";

/**
 * Reads a JSON file and returns its content
 * @param {File} file - The file to read
 * @returns {Promise<string>} The file content as a string
 * @throws {Error} If file reading fails or content is invalid JSON
 */
export async function readJsonFile(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        // Validate it's valid JSON
        JSON.parse(content);
        resolve(content);
      } catch (error) {
        reject(new Error(`Invalid JSON file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Downloads a JSON object as a file
 * @param {Object} data - The data object to download
 * @param {string} filename - The filename (default: uses DEFAULT_FILENAMES.V2_STYLE)
 */
export function downloadJsonFile(data, filename = DEFAULT_FILENAMES.V2_STYLE) {
  if (!data) {
    throw new Error("No data to download");
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

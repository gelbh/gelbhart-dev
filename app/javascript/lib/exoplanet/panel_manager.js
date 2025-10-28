/**
 * PanelManager
 *
 * Manages draggable overlay panels in the exoplanet viewer.
 * Handles drag start, dragging, and drag end for repositioning panels.
 */
export class PanelManager {
  constructor() {
    this.draggedPanel = null;
    this.panelOffset = { x: 0, y: 0 };

    // Bind methods
    this.boundPanelDragStart = this.onPanelDragStart.bind(this);
    this.boundPanelDrag = this.onPanelDrag.bind(this);
    this.boundPanelDragEnd = this.onPanelDragEnd.bind(this);
  }

  /**
   * Initialize panel dragging functionality
   */
  initialize() {
    const dragHandles = document.querySelectorAll("[data-drag-handle]");

    dragHandles.forEach((handle) => {
      handle.addEventListener("mousedown", this.boundPanelDragStart);
      handle.addEventListener("touchstart", this.boundPanelDragStart, {
        passive: false,
      });
    });
  }

  /**
   * Start dragging a panel
   */
  onPanelDragStart(event) {
    event.preventDefault();

    this.draggedPanel = event.currentTarget.closest(".exoplanet-overlay-panel");
    if (!this.draggedPanel) return;

    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;

    const rect = this.draggedPanel.getBoundingClientRect();
    this.panelOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    document.addEventListener("mousemove", this.boundPanelDrag);
    document.addEventListener("touchmove", this.boundPanelDrag, {
      passive: false,
    });
    document.addEventListener("mouseup", this.boundPanelDragEnd);
    document.addEventListener("touchend", this.boundPanelDragEnd);

    this.draggedPanel.style.transition = "none";
    this.draggedPanel.style.cursor = "grabbing";
  }

  /**
   * Drag the panel
   */
  onPanelDrag(event) {
    if (!this.draggedPanel) return;

    event.preventDefault();

    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;

    let newX = clientX - this.panelOffset.x;
    let newY = clientY - this.panelOffset.y;

    const margin = 20;
    const maxX = window.innerWidth - this.draggedPanel.offsetWidth - margin;
    const maxY = window.innerHeight - this.draggedPanel.offsetHeight - margin;

    newX = Math.max(margin, Math.min(newX, maxX));
    newY = Math.max(margin, Math.min(newY, maxY));

    this.draggedPanel.style.left = `${newX}px`;
    this.draggedPanel.style.top = `${newY}px`;
    this.draggedPanel.style.right = "auto";
    this.draggedPanel.style.bottom = "auto";
  }

  /**
   * End dragging
   */
  onPanelDragEnd() {
    if (!this.draggedPanel) return;

    document.removeEventListener("mousemove", this.boundPanelDrag);
    document.removeEventListener("touchmove", this.boundPanelDrag);
    document.removeEventListener("mouseup", this.boundPanelDragEnd);
    document.removeEventListener("touchend", this.boundPanelDragEnd);

    this.draggedPanel.style.transition = "";
    this.draggedPanel.style.cursor = "";

    this.draggedPanel = null;
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    const dragHandles = document.querySelectorAll("[data-drag-handle]");

    dragHandles.forEach((handle) => {
      handle.removeEventListener("mousedown", this.boundPanelDragStart);
      handle.removeEventListener("touchstart", this.boundPanelDragStart);
    });

    // Clean up any active drag listeners
    if (this.draggedPanel) {
      this.onPanelDragEnd();
    }
  }
}

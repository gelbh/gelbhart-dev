import { Controller } from "@hotwired/stimulus";
import { CircuitFieldRenderer } from "lib/circuit_field/renderer";

/**
 * WebGL circuit-field background — lazy-init, pauses off-screen,
 * respects prefers-reduced-motion (CSS gradient/grid fallback only).
 */
export default class extends Controller {
  static targets = ["canvas"];
  static values = {
    fixed: { type: Boolean, default: false },
    intensity: { type: Number, default: 1 },
  };

  connect() {
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.visible = false;
    this.running = false;
    this.rafId = null;
    this.renderer = null;

    this._onReducedMotionChange = () => this._syncMotionPreference();
    this._onResize = () => this._resize();
    this._onMouseMove = (event) => this._handleMouseMove(event);
    this._onVisibilityChange = () => this._syncVisibility();

    if (this.reducedMotion.matches) {
      this.element.classList.add("circuit-field--disabled");
      return;
    }

    this.reducedMotion.addEventListener("change", this._onReducedMotionChange);
    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("visibilitychange", this._onVisibilityChange);

    if (this.fixedValue) {
      window.addEventListener("mousemove", this._onMouseMove, { passive: true });
    } else {
      this.element.addEventListener("mousemove", this._onMouseMove, {
        passive: true,
      });
    }

    this._observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.visible = entry?.isIntersecting ?? false;
        this._syncVisibility();
      },
      { rootMargin: "100px 0px", threshold: 0 }
    );
    this._observer.observe(this.element);
  }

  disconnect() {
    this._stop();
    this._observer?.disconnect();
    this.reducedMotion.removeEventListener("change", this._onReducedMotionChange);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    window.removeEventListener("mousemove", this._onMouseMove);
    this.element.removeEventListener("mousemove", this._onMouseMove);
    this.renderer?.destroy();
    this.renderer = null;
  }

  _syncMotionPreference() {
    if (this.reducedMotion.matches) {
      this.element.classList.add("circuit-field--disabled");
      this._stop();
      this.renderer?.destroy();
      this.renderer = null;
    } else {
      this.element.classList.remove("circuit-field--disabled");
      this._syncVisibility();
    }
  }

  _syncVisibility() {
    if (
      this.reducedMotion.matches ||
      !this.visible ||
      document.hidden
    ) {
      this._stop();
      return;
    }
    this._ensureRenderer();
    this._start();
  }

  _ensureRenderer() {
    if (this.renderer || !this.hasCanvasTarget) return;

    this.renderer = new CircuitFieldRenderer(this.canvasTarget, {
      intensity: this.intensityValue,
    });

    if (!this.renderer.init()) {
      this.renderer.destroy();
      this.renderer = null;
      this.element.classList.add("circuit-field--disabled");
    }
  }

  _start() {
    if (this.running || !this.renderer) return;
    this.running = true;
    this._resize();

    const tick = (time) => {
      if (!this.running) return;
      this.renderer.render(time);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _resize() {
    this.renderer?.resize();
  }

  _handleMouseMove(event) {
    if (!this.renderer) return;

    if (this.fixedValue) {
      this.renderer.setMouse(
        event.clientX / window.innerWidth,
        event.clientY / window.innerHeight
      );
      return;
    }

    const rect = this.canvasTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.renderer.setMouse(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height
    );
  }
}

import { Controller } from "@hotwired/stimulus";
import eases from "eases";

export default class extends Controller {
  static values = {
    target: Number,
    duration: { type: Number, default: 2000 },
    suffix: { type: String, default: "" },
  };

  connect() {
    this.formatter = new Intl.NumberFormat("en-US");
    this.animationFrameId = null;

    this.ensureTargetValue();
    this.element.textContent = this.formatter.format(0) + this.suffixValue;

    const card = this.element.closest(".fade-in-view");
    if (card) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.animateCounter();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(card);
    } else {
      this.animateCounter();
    }
  }

  animateCounter() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.ensureTargetValue();

    const target = this.isValidValue(this.targetValue) ? this.targetValue : 0;
    const startTime = performance.now();
    const startValue = 0;

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.durationValue, 1);
      const eased = eases.quartOut(progress);
      const currentValue = Math.floor(
        startValue + (target - startValue) * eased
      );

      this.element.textContent =
        this.formatter.format(currentValue) + this.suffixValue;

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        this.element.textContent =
          this.formatter.format(target) + this.suffixValue;
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(updateCounter);
  }

  disconnect() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  ensureTargetValue() {
    if (this.isValidValue(this.targetValue)) return;

    const attributeValue = this.element.getAttribute(
      "data-counter-target-value"
    );
    if (attributeValue !== null) {
      const parsed = parseFloat(attributeValue);
      if (!isNaN(parsed)) {
        this.targetValue = parsed;
      }
    }
  }

  isValidValue(value) {
    return value !== undefined && value !== null && !isNaN(value);
  }
}

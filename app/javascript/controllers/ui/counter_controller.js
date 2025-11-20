import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="counter"
export default class extends Controller {
  static values = {
    target: Number,
    duration: { type: Number, default: 2000 },
    suffix: { type: String, default: "" }
  }

  connect() {
    // Set initial value to 0
    this.element.textContent = "0" + this.suffixValue
    
    // Wait for the parent card to fade in before starting animation
    const card = this.element.closest('.fade-in-view')
    if (card) {
      // Start animation as soon as element is visible
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Start immediately when visible - no delay
            this.animateCounter()
            observer.disconnect()
          }
        })
      }, { threshold: 0.2 }) // Start earlier (when 20% visible)
      
      observer.observe(card)
    } else {
      // Fallback if no fade-in-view parent
      this.animateCounter()
    }
  }

  animateCounter() {
    const target = this.targetValue
    const duration = this.durationValue
    const element = this.element
    const suffix = this.suffixValue
    const startTime = performance.now()
    const startValue = 0

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.floor(startValue + (target - startValue) * easeOutQuart)
      
      element.textContent = currentValue.toLocaleString() + suffix
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      } else {
        element.textContent = target.toLocaleString() + suffix
      }
    }

    requestAnimationFrame(updateCounter)
  }
}

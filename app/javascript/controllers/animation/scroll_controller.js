import { Controller } from "@hotwired/stimulus"

// Handles fade-in animations when elements scroll into view
export default class extends Controller {
  static targets = ["element"]

  connect() {
    // Progressive enhancement: only arm the hidden/reveal state when an
    // observer can actually reveal it. Without `.reveal-ready` the CSS leaves
    // content fully visible, so disabled/failed JS never blanks a section.
    if (!("IntersectionObserver" in window)) return

    document.documentElement.classList.add("reveal-ready")

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    )

    // Observe all fade-in-view elements
    const elements = document.querySelectorAll('.fade-in-view')
    elements.forEach(element => {
      this.observer.observe(element)
    })
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        // Optionally unobserve after animation completes
        this.observer.unobserve(entry.target)
      }
    })
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

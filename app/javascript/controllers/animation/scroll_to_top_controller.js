import { Controller } from "@hotwired/stimulus"

// Back to top button that appears when scrolling down
export default class extends Controller {
  static targets = ["button"]

  connect() {
    this.checkScroll()
    window.addEventListener('scroll', this.checkScroll.bind(this))
  }

  disconnect() {
    window.removeEventListener('scroll', this.checkScroll.bind(this))
  }

  checkScroll() {
    const button = this.buttonTarget
    if (window.scrollY > 300) {
      button.classList.add('visible')
    } else {
      button.classList.remove('visible')
    }
  }

  scrollToTop(event) {
    event.preventDefault()
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

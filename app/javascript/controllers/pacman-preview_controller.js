import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="pacman-preview"
export default class extends Controller {
  static targets = ["sprite"]
  
  connect() {
    this.frameIndex = 0
    this.sprites = [
      '/assets/pacman-game/pacman/pacman_open_more.png',
      '/assets/pacman-game/pacman/pacman_open_less.png',
      '/assets/pacman-game/pacman/pacman_closed.png',
      '/assets/pacman-game/pacman/pacman_open_less.png'
    ]
    
    // Start animation
    this.startAnimation()
  }
  
  disconnect() {
    this.stopAnimation()
  }
  
  startAnimation() {
    // Cycle through sprites every 150ms
    this.animationInterval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.sprites.length
      if (this.hasSpriteTarget) {
        this.spriteTarget.src = this.sprites[this.frameIndex]
      }
    }, 150)
  }
  
  stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval)
    }
  }
}

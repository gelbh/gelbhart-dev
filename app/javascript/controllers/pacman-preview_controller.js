import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="pacman-preview"
export default class extends Controller {
  static targets = ["sprite"]
  static values = { assetManifest: Object }

  connect() {
    this.frameIndex = 0

    // Get asset paths (handles both development and production)
    const getAssetPath = (filename) => {
      const assetKey = `pacman-game/${filename}`
      if (this.hasAssetManifestValue && this.assetManifestValue[assetKey]) {
        return this.assetManifestValue[assetKey]
      }
      return `/assets/${assetKey}`
    }

    this.sprites = [
      getAssetPath('pacman/pacman_open_more.png'),
      getAssetPath('pacman/pacman_open_less.png'),
      getAssetPath('pacman/pacman_closed.png'),
      getAssetPath('pacman/pacman_open_less.png')
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

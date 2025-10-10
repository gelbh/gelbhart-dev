/**
 * SpriteManager - Handles sprite loading and selection for the Pac-Man game
 *
 * Manages:
 * - Preloading all sprite images for performance
 * - Asset path resolution for development and production
 * - Sprite selection for Pac-Man animations
 * - Sprite selection for ghost states and directions
 */
export class SpriteManager {
  constructor(assetPaths = {}) {
    this.assetPaths = assetPaths
    this.spriteCache = {}
  }

  /**
   * Preload all sprite images to prevent HTTP requests during gameplay
   * Critical for production performance on limited resources
   */
  preload() {
    // Preload Pac-Man sprites
    const pacmanSprites = ['pacman/pacman_open_more.png', 'pacman/pacman_open_less.png', 'pacman/pacman_closed.png']
    pacmanSprites.forEach(sprite => {
      const img = new Image()
      img.src = this.getAssetPath(sprite)
      this.spriteCache[sprite] = img.src
    })

    // Preload all ghost sprites
    const ghostColors = ['blinky', 'pinky', 'inky', 'clyde']
    const directions = ['right', 'down', 'up']
    const frames = [1, 2]

    ghostColors.forEach(ghost => {
      directions.forEach(dir => {
        frames.forEach(frame => {
          const sprite = `ghosts/${ghost}-${dir}-${frame}.png`
          const img = new Image()
          img.src = this.getAssetPath(sprite)
          this.spriteCache[sprite] = img.src
        })
      })
    })

    // Preload frightened sprites
    ;['blue', 'white'].forEach(color => {
      frames.forEach(frame => {
        const sprite = `ghosts/frightened-${color}-${frame}.png`
        const img = new Image()
        img.src = this.getAssetPath(sprite)
        this.spriteCache[sprite] = img.src
      })
    })

    // Preload eyes sprites
    directions.forEach(dir => {
      const sprite = `ghosts/eyes-${dir}.png`
      const img = new Image()
      img.src = this.getAssetPath(sprite)
      this.spriteCache[sprite] = img.src
    })

    console.log("🎨 Preloaded", Object.keys(this.spriteCache).length, "sprite images")
  }

  /**
   * Get the correct asset path for development or production
   */
  getAssetPath(filename) {
    const assetKey = `pacman-game/${filename}`

    // Use asset manifest for production fingerprinted paths
    if (this.assetPaths && this.assetPaths[assetKey]) {
      return this.assetPaths[assetKey]
    }
    // Fallback to direct asset path (for development)
    return `/assets/${assetKey}`
  }

  /**
   * Get Pac-Man sprite based on animation state
   */
  getPacmanSprite(animationState) {
    const sprites = ['pacman/pacman_open_more.png', 'pacman/pacman_open_less.png', 'pacman/pacman_closed.png']
    return this.getAssetPath(sprites[animationState])
  }

  /**
   * Get ghost sprite based on color, direction, and animation frame
   */
  getGhostSprite(color, direction, frame) {
    const ghostName = color === 'red' ? 'blinky' :
                      color === 'pink' ? 'pinky' :
                      color === 'cyan' ? 'inky' : 'clyde'

    // For left direction, we use right sprites but will flip with CSS
    const spriteDirection = direction === 'left' ? 'right' : direction

    return this.getAssetPath(`ghosts/${ghostName}-${spriteDirection}-${frame}.png`)
  }

  /**
   * Get frightened ghost sprite
   */
  getFrightenedSprite(frame, ending = false) {
    const color = ending ? 'white' : 'blue'
    return this.getAssetPath(`ghosts/frightened-${color}-${frame}.png`)
  }

  /**
   * Get ghost eyes sprite for when ghost is eaten
   */
  getEyesSprite(direction) {
    // For left direction, we use right sprites but will flip with CSS
    const spriteDirection = direction === 'left' ? 'right' : direction
    return this.getAssetPath(`ghosts/eyes-${spriteDirection}.png`)
  }
}

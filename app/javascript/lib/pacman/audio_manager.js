/**
 * AudioManager - Handles all sound effects for the Pac-Man game
 *
 * Manages loading, playing, and stopping game audio including:
 * - Beginning jingle
 * - Chomp sounds
 * - Death sound
 * - Power pellet sounds
 * - Ghost eating sounds
 */
export class AudioManager {
  constructor(assetPaths = {}) {
    this.assetPaths = assetPaths
    this.audioFiles = {}
    this.soundsEnabled = false
    this.chompPlaying = false
  }

  /**
   * Initialize the sound system by loading all audio files
   */
  initialize() {
    try {
      // Create Audio objects for each sound effect
      this.audioFiles = {
        beginning: new Audio(this.getAudioPath('pacman_beginning.wav')),
        chomp: new Audio(this.getAudioPath('pacman_chomp.wav')),
        death: new Audio(this.getAudioPath('pacman_death.wav')),
        eatFruit: new Audio(this.getAudioPath('pacman_eatfruit.wav')),
        eatGhost: new Audio(this.getAudioPath('pacman_eatghost.wav')),
        extraPac: new Audio(this.getAudioPath('pacman_extrapac.wav')),
        intermission: new Audio(this.getAudioPath('pacman_intermission.wav'))
      }

      // Configure audio properties
      Object.values(this.audioFiles).forEach(audio => {
        audio.volume = 0.4 // Set volume to 40% (not too loud)
        audio.preload = 'auto' // Preload for instant playback
      })

      this.soundsEnabled = true
      console.log("🔊 Sound system initialized with authentic Pac-Man sounds!")
      return true
    } catch (error) {
      console.warn("⚠️ Could not initialize audio system:", error)
      this.soundsEnabled = false
      return false
    }
  }

  /**
   * Get the correct audio path for development or production
   */
  getAudioPath(filename) {
    const assetKey = `pacman-game/sounds/${filename}`
    if (this.assetPaths && this.assetPaths[assetKey]) {
      // Rails asset_path() already includes /assets/ prefix
      return this.assetPaths[assetKey]
    }
    // In development, use direct path
    return `/assets/pacman-game/sounds/${filename}`
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play
   * @param {boolean} restart - Whether to restart if already playing
   */
  play(soundName, restart = false) {
    if (!this.soundsEnabled || !this.audioFiles[soundName]) return

    try {
      const audio = this.audioFiles[soundName]

      if (restart) {
        audio.currentTime = 0
      }

      // Only play if not already playing or if restart is requested
      if (audio.paused || restart) {
        audio.play().catch(err => {
          // Silently handle autoplay policy restrictions
          console.warn(`Could not play ${soundName}:`, err.message)
        })
      }

      if (soundName === 'chomp') {
        this.chompPlaying = true
      }
    } catch (error) {
      console.warn(`Error playing ${soundName}:`, error)
    }
  }

  /**
   * Stop a specific sound
   * @param {string} soundName - Name of the sound to stop
   */
  stop(soundName) {
    if (!this.soundsEnabled || !this.audioFiles[soundName]) return

    try {
      const audio = this.audioFiles[soundName]
      audio.pause()
      audio.currentTime = 0

      if (soundName === 'chomp') {
        this.chompPlaying = false
      }
    } catch (error) {
      console.warn(`Error stopping ${soundName}:`, error)
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll() {
    if (!this.soundsEnabled) return

    try {
      Object.values(this.audioFiles).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
      this.chompPlaying = false
    } catch (error) {
      console.warn("Error stopping sounds:", error)
    }
  }

  /**
   * Pause all currently playing sounds (without resetting position)
   */
  pauseAll() {
    if (!this.soundsEnabled) return

    try {
      Object.values(this.audioFiles).forEach(audio => {
        if (!audio.paused) {
          audio.pause()
        }
      })
    } catch (error) {
      console.warn("Error pausing sounds:", error)
    }
  }

  /**
   * Resume all paused sounds
   */
  resumeAll() {
    if (!this.soundsEnabled) return

    try {
      Object.values(this.audioFiles).forEach(audio => {
        // Only resume if the audio has a current time (was playing before)
        if (audio.paused && audio.currentTime > 0) {
          audio.play().catch(err => {
            console.warn("Could not resume audio:", err.message)
          })
        }
      })
    } catch (error) {
      console.warn("Error resuming sounds:", error)
    }
  }

  /**
   * Get a specific audio element (for event listeners)
   */
  getAudio(soundName) {
    return this.audioFiles[soundName]
  }
}

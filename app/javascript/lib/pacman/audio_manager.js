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
import localforage from "localforage";

export class AudioManager {
  constructor(assetPaths = {}) {
    this.assetPaths = assetPaths;
    this.audioFiles = {};
    this.soundsEnabled = false;
    this.chompPlaying = false;

    // Audio categories for volume control
    this.musicTracks = ["beginning", "intermission"];
    this.sfxTracks = ["chomp", "death", "eatFruit", "eatGhost", "extraPac"];

    // Load preferences from localforage (async, will be loaded in initialize)
    this.preferences = {
      musicVolume: 0.4,
      sfxVolume: 0.4,
      isMuted: true,
    };
    this.musicVolume = this.preferences.musicVolume;
    this.sfxVolume = this.preferences.sfxVolume;
    this.isMuted = this.preferences.isMuted;
  }

  /**
   * Load audio preferences from localforage
   * @returns {Promise<Object>} Audio preferences
   */
  async loadPreferences() {
    try {
      const saved = await localforage.getItem("pacman_audio_preferences");
      if (saved) {
        const prefs = typeof saved === "string" ? JSON.parse(saved) : saved;
        return {
          musicVolume: prefs.musicVolume ?? 0.4,
          sfxVolume: prefs.sfxVolume ?? 0.4,
          isMuted: prefs.isMuted ?? false,
        };
      }
    } catch (error) {
      console.warn("Could not load audio preferences:", error);
    }

    // Default preferences - muted by default
    return {
      musicVolume: 0.4,
      sfxVolume: 0.4,
      isMuted: true,
    };
  }

  /**
   * Save audio preferences to localforage
   */
  async savePreferences() {
    try {
      const prefs = {
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
        isMuted: this.isMuted,
      };
      await localforage.setItem("pacman_audio_preferences", prefs);
    } catch (error) {
      console.warn("Could not save audio preferences:", error);
    }
  }

  /**
   * Set music volume (0.0 to 1.0)
   */
  async setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
    await this.savePreferences();
  }

  /**
   * Set SFX volume (0.0 to 1.0)
   */
  async setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
    await this.savePreferences();
  }

  /**
   * Toggle mute on/off
   */
  async toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateVolumes();
    await this.savePreferences();
    return this.isMuted;
  }

  /**
   * Set mute state
   */
  async setMute(muted) {
    this.isMuted = muted;
    this.updateVolumes();
    await this.savePreferences();
  }

  /**
   * Update all audio file volumes based on current settings
   */
  updateVolumes() {
    if (!this.soundsEnabled) return;

    Object.entries(this.audioFiles).forEach(([name, audio]) => {
      if (this.isMuted) {
        audio.volume = 0;
      } else if (this.musicTracks.includes(name)) {
        audio.volume = this.musicVolume;
      } else if (this.sfxTracks.includes(name)) {
        audio.volume = this.sfxVolume;
      }
    });
  }

  /**
   * Initialize the sound system by loading all audio files
   */
  async initialize() {
    try {
      // Load preferences from localforage
      this.preferences = await this.loadPreferences();
      this.musicVolume = this.preferences.musicVolume;
      this.sfxVolume = this.preferences.sfxVolume;
      this.isMuted = this.preferences.isMuted;

      // Create Audio objects for each sound effect
      this.audioFiles = {
        beginning: new Audio(this.getAudioPath("pacman_beginning.wav")),
        chomp: new Audio(this.getAudioPath("pacman_chomp.wav")),
        death: new Audio(this.getAudioPath("pacman_death.wav")),
        eatFruit: new Audio(this.getAudioPath("pacman_eatfruit.wav")),
        eatGhost: new Audio(this.getAudioPath("pacman_eatghost.wav")),
        extraPac: new Audio(this.getAudioPath("pacman_extrapac.wav")),
        intermission: new Audio(this.getAudioPath("pacman_intermission.wav")),
      };

      // Configure audio properties
      Object.values(this.audioFiles).forEach((audio) => {
        audio.preload = "auto"; // Preload for instant playback
      });

      this.soundsEnabled = true;

      // Apply saved volume preferences
      this.updateVolumes();

      return true;
    } catch (error) {
      console.warn("⚠️ Could not initialize audio system:", error);
      this.soundsEnabled = false;
      return false;
    }
  }

  /**
   * Get the correct audio path for development or production
   */
  getAudioPath(filename) {
    const assetKey = `pacman-game/sounds/${filename}`;
    if (this.assetPaths && this.assetPaths[assetKey]) {
      // Rails asset_path() already includes /assets/ prefix
      return this.assetPaths[assetKey];
    }
    // In development, use direct path
    return `/assets/pacman-game/sounds/${filename}`;
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play
   * @param {boolean} restart - Whether to restart if already playing
   */
  play(soundName, restart = false) {
    if (!this.soundsEnabled || !this.audioFiles[soundName]) return;

    try {
      const audio = this.audioFiles[soundName];

      if (restart) {
        audio.currentTime = 0;
      }

      // Only play if not already playing or if restart is requested
      if (audio.paused || restart) {
        audio.play().catch((err) => {
          // Silently handle autoplay policy restrictions
          console.warn(`Could not play ${soundName}:`, err.message);
        });
      }

      if (soundName === "chomp") {
        this.chompPlaying = true;
      }
    } catch (error) {
      console.warn(`Error playing ${soundName}:`, error);
    }
  }

  /**
   * Stop a specific sound
   * @param {string} soundName - Name of the sound to stop
   */
  stop(soundName) {
    if (!this.soundsEnabled || !this.audioFiles[soundName]) return;

    try {
      const audio = this.audioFiles[soundName];
      audio.pause();
      audio.currentTime = 0;

      if (soundName === "chomp") {
        this.chompPlaying = false;
      }
    } catch (error) {
      console.warn(`Error stopping ${soundName}:`, error);
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll() {
    if (!this.soundsEnabled) return;

    try {
      Object.values(this.audioFiles).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      this.chompPlaying = false;
    } catch (error) {
      console.warn("Error stopping sounds:", error);
    }
  }

  /**
   * Pause all currently playing sounds (without resetting position)
   */
  pauseAll() {
    if (!this.soundsEnabled) return;

    try {
      Object.values(this.audioFiles).forEach((audio) => {
        if (!audio.paused) {
          audio.pause();
        }
      });
    } catch (error) {
      console.warn("Error pausing sounds:", error);
    }
  }

  /**
   * Resume all paused sounds
   */
  resumeAll() {
    if (!this.soundsEnabled) return;

    try {
      Object.values(this.audioFiles).forEach((audio) => {
        // Only resume if the audio has a current time (was playing before)
        if (audio.paused && audio.currentTime > 0) {
          audio.play().catch((err) => {
            console.warn("Could not resume audio:", err.message);
          });
        }
      });
    } catch (error) {
      console.warn("Error resuming sounds:", error);
    }
  }

  /**
   * Get a specific audio element (for event listeners)
   */
  getAudio(soundName) {
    return this.audioFiles[soundName];
  }
}

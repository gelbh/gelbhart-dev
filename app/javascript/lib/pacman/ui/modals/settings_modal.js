/**
 * Settings Modal
 *
 * Displays audio settings controls (music volume, SFX volume, mute toggle)
 */
import {
  createModal,
  createModalContent,
  createModalHeader,
  createModalButtons,
  createModalButton,
  bindModalActions,
  setupKeyboardHandler,
  modalExists,
} from "../modal_system.js";

/**
 * Show settings modal (audio controls only)
 * @param {number} musicVolume - Current music volume (0.0 to 1.0)
 * @param {number} sfxVolume - Current SFX volume (0.0 to 1.0)
 * @param {boolean} isMuted - Whether audio is currently muted
 * @param {Object} callbacks - { onMusicVolumeChange, onSFXVolumeChange, onMuteToggle, onClose }
 * @returns {HTMLElement|null} The created modal element or null if already exists
 */
export function showSettingsModal(
  musicVolume,
  sfxVolume,
  isMuted,
  callbacks = {}
) {
  if (modalExists("pacman-settings-modal")) {
    return null;
  }

  const { onMusicVolumeChange, onSFXVolumeChange, onMuteToggle, onClose } =
    callbacks;

  const settingsSection = `
    <div class="settings-section">
      <div class="settings-control">
        <div class="settings-control-header">
          <label class="settings-label">
            <i class="bx bx-music"></i>
            <span>Music Volume</span>
          </label>
          <button class="settings-mute-btn ${
            isMuted ? "muted" : ""
          }" data-action="mute" title="Toggle Mute (M)">
            <i class="bx ${isMuted ? "bx-volume-mute" : "bx-volume-full"}"></i>
          </button>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value="${Math.round(musicVolume * 100)}"
          class="settings-volume-slider"
          data-action="music-volume"
        >
      </div>

      <div class="settings-control">
        <label class="settings-label">
          <i class="bx bxs-volume"></i>
          <span>SFX Volume</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value="${Math.round(sfxVolume * 100)}"
          class="settings-volume-slider"
          data-action="sfx-volume"
        >
      </div>
    </div>
  `;

  const buttons = createModalButtons(
    createModalButton("back", "Back to Menu", "bx-arrow-back", "primary")
  );

  const content = [
    createModalHeader("🔊", "Audio Settings"),
    settingsSection,
    buttons,
  ].join("");

  const modal = createModal(
    "pacman-settings-modal",
    createModalContent(content)
  );

  const musicSlider = modal.querySelector('[data-action="music-volume"]');
  const sfxSlider = modal.querySelector('[data-action="sfx-volume"]');
  const muteBtn = modal.querySelector('[data-action="mute"]');

  if (onMusicVolumeChange) {
    musicSlider.addEventListener("input", (e) => {
      onMusicVolumeChange(parseInt(e.target.value) / 100);
    });
  }

  if (onSFXVolumeChange) {
    sfxSlider.addEventListener("input", (e) => {
      onSFXVolumeChange(parseInt(e.target.value) / 100);
    });
  }

  if (onMuteToggle) {
    muteBtn.addEventListener("click", () => {
      onMuteToggle();
      const isNowMuted = muteBtn.classList.toggle("muted");
      muteBtn.querySelector("i").className = `bx ${
        isNowMuted ? "bx-volume-mute" : "bx-volume-full"
      }`;
    });
  }

  const closeHandler = () => {
    modal.remove();
    onClose?.();
  };

  const keydownHandler = setupKeyboardHandler(
    {
      m: () => {
        if (onMuteToggle) {
          muteBtn.click();
        }
      },
    },
    closeHandler
  );

  bindModalActions(modal, {
    back: () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
    },
  });

  return modal;
}

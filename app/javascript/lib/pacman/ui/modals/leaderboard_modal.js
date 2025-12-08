/**
 * Leaderboard Modal
 *
 * Displays global leaderboard and player's personal scores with tabbed interface
 */
import he from "he";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import format from "date-fns/format";
import differenceInDays from "date-fns/differenceInDays";
import {
  createModal,
  createModalContent,
  createModalHeader,
  createModalButtons,
  createModalButton,
  bindModalActions,
  setupKeyboardHandler,
  modalExists,
} from "../modal_system";

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const daysDiff = differenceInDays(now, date);

  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  if (daysDiff < 7) return formatDistanceToNow(date, { addSuffix: true });
  return format(date, "MMM d, yyyy");
}

/**
 * Show leaderboard modal
 * @param {Object} leaderboardData - { global: [], player: { name, scores: [] } }
 * @param {Function} onClose - Callback when modal is closed
 * @returns {HTMLElement|null} The created modal element or null if already exists or no data
 */
export async function showLeaderboardModal(leaderboardData, onClose) {
  if (modalExists("leaderboard-modal")) {
    return null;
  }

  if (!leaderboardData) {
    return null;
  }

  const { global = [], player = null } = leaderboardData;

  const globalHTML =
    global && global.length > 0
      ? global
          .map(
            (entry, index) => `
    <div class="leaderboard-row ${
      player && entry.player_name === player.name ? "highlighted" : ""
    }">
      <span class="rank">#${index + 1}</span>
      <span class="player-name">${he.encode(entry.player_name)}</span>
      <span class="win-badge">${entry.is_win ? "🏆" : ""}</span>
      <span class="score">${entry.score}</span>
    </div>
  `
          )
          .join("")
      : '<div class="no-scores">No scores yet. Be the first!</div>';

  const playerHTML =
    player && player.scores && player.scores.length > 0
      ? player.scores
          .map(
            (entry, index) => `
    <div class="leaderboard-row">
      <span class="rank">#${index + 1}</span>
      <span class="score">${entry.score}</span>
      <span class="win-badge">${entry.is_win ? "🏆" : ""}</span>
      <span class="date">${formatDate(entry.played_at)}</span>
    </div>
  `
          )
          .join("")
      : '<div class="no-scores">Play to see your scores here!</div>';

  const tabsHtml = [
    '<button class="leaderboard-tab active" data-tab="global">Top Players</button>',
    player
      ? '<button class="leaderboard-tab" data-tab="player">My Scores</button>'
      : "",
  ]
    .filter(Boolean)
    .join("");

  const leaderboardContent = `
    <div class="leaderboard-tabs">${tabsHtml}</div>

    <div class="leaderboard-container">
      <div class="leaderboard-panel active" data-panel="global">
        <div class="leaderboard-header">
          <span>Rank</span>
          <span>Player</span>
          <span></span>
          <span>Score</span>
        </div>
        <div class="leaderboard-list">${globalHTML}</div>
      </div>

      ${
        player
          ? `
        <div class="leaderboard-panel" data-panel="player">
          <div class="leaderboard-header player-header">
            <span>Rank</span>
            <span>Score</span>
            <span></span>
            <span>Date</span>
          </div>
          <div class="leaderboard-list">${playerHTML}</div>
        </div>
      `
          : ""
      }
    </div>
  `;

  const buttons = createModalButtons(
    createModalButton("close", "Close", "bx-x", "secondary")
  );

  const content = [
    createModalHeader("🏆", "Leaderboard"),
    leaderboardContent,
    buttons,
  ].join("");

  const html = createModalContent(content, "leaderboard-content");
  const modal = createModal("leaderboard-modal", html);

  const tabs = modal.querySelectorAll(".leaderboard-tab");
  const panels = modal.querySelectorAll(".leaderboard-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      modal
        .querySelector(`[data-panel="${targetTab}"]`)
        .classList.add("active");
    });
  });

  const closeHandler = () => {
    modal.remove();
    onClose?.();
  };

  const keydownHandler = setupKeyboardHandler(
    {
      l: () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      },
    },
    null
  );

  bindModalActions(modal, {
    close: () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
    },
  });

  return modal;
}

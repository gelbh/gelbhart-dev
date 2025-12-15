/**
 * Item Types Configuration
 *
 * Centralized configuration for all item types used in the Pac-Man game.
 * This configuration is shared between ItemManager and UIManager.
 */
export const itemTypes = {
  speedBoost: {
    emoji: "⚡",
    name: "Speed Boost",
    color: "#FFD700",
    points: 100,
    duration: 5000,
    positive: true,
  },
  shield: {
    emoji: "🛡️",
    name: "Shield",
    color: "#00CED1",
    points: 150,
    duration: 6000,
    positive: true,
  },
  freeze: {
    emoji: "❄️",
    name: "Ghost Freeze",
    color: "#87CEEB",
    points: 200,
    duration: 3000,
    positive: true,
  },
  doublePoints: {
    emoji: "⭐",
    name: "Double Points",
    color: "#FF69B4",
    points: 100,
    duration: 10000,
    positive: true,
  },
  extraLife: {
    emoji: "❤️",
    name: "Extra Life",
    color: "#FF0000",
    points: 500,
    duration: 0,
    positive: true,
  },
};

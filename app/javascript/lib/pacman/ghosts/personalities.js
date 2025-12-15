/**
 * GhostPersonalities - Personality-specific AI behavior functions
 *
 * Each ghost has unique targeting behavior:
 * - Blinky (chase): Aggressive chaser with prediction
 * - Pinky (ambush): Ambusher targeting ahead of Pac-Man
 * - Inky (patrol): Flanker coordinating with Blinky
 * - Clyde (scatter): Zone controller with unpredictable behavior
 */

/**
 * Calculate target for Blinky (chase personality)
 * Relentless pursuer with prediction and speed boost when few dots remain
 * @param {Object} ghost - Ghost object
 * @param {Object} gameState - Game state {pacmanPosition, pacmanVelocity, dotsRemaining, totalDots}
 * @returns {Object} - Target position {x, y} and speed boost
 */
export function calculateChaseTarget(ghost, gameState) {
  const { pacmanPosition, pacmanVelocity, dotsRemaining, totalDots } =
    gameState;

  // Direct chase with slight prediction based on Pac-Man's momentum
  const predictionTime = 0.33; // Predict 0.33 seconds ahead (20 frames at 60fps)
  const targetX = pacmanPosition.x + pacmanVelocity.x * predictionTime;
  const targetY = pacmanPosition.y + pacmanVelocity.y * predictionTime;

  // Speed boost when few dots remain (Cruise Elroy mode)
  // Use cached dot counts for performance (avoid filtering every frame)
  let speedBoost = 1;
  if (dotsRemaining < totalDots * 0.3) {
    // Less than 30% dots remaining
    speedBoost = 1.3; // 30% faster
  } else if (dotsRemaining < totalDots * 0.5) {
    // Less than 50% dots
    speedBoost = 1.15; // 15% faster
  }

  // Add slight randomness to prevent perfect prediction avoidance
  let finalTargetX = targetX;
  let finalTargetY = targetY;
  if (Math.random() < 0.1) {
    // 10% chance every frame
    finalTargetX += (Math.random() - 0.5) * 100;
    finalTargetY += (Math.random() - 0.5) * 100;
  }

  return {
    x: finalTargetX,
    y: finalTargetY,
    speedBoost,
  };
}

/**
 * Calculate target for Pinky (ambush personality)
 * Advanced prediction ambush with flanking behavior
 * @param {Object} ghost - Ghost object
 * @param {Object} gameState - Game state {pacmanPosition, pacmanVelocity}
 * @param {number} scatterTimer - Ghost's scatter timer for circling behavior
 * @returns {Object} - Target position {x, y}
 */
export function calculateAmbushTarget(ghost, gameState, scatterTimer) {
  const { pacmanPosition, pacmanVelocity } = gameState;

  // Predict Pac-Man's position based on velocity AND acceleration
  const lookAheadTime = 1.0; // Predict 1 second ahead
  const velocityMagnitude = Math.sqrt(
    Math.pow(pacmanVelocity.x, 2) + Math.pow(pacmanVelocity.y, 2)
  );

  let targetX, targetY;

  // If Pac-Man is moving, predict future position
  if (velocityMagnitude > 0) {
    targetX = pacmanPosition.x + pacmanVelocity.x * lookAheadTime;
    targetY = pacmanPosition.y + pacmanVelocity.y * lookAheadTime;

    // Add flanking behavior - try to cut off from the side
    const angleToIntercept = Math.atan2(targetY - ghost.y, targetX - ghost.x);
    const flankOffset = 150;
    targetX += Math.cos(angleToIntercept + Math.PI / 2) * flankOffset;
    targetY += Math.sin(angleToIntercept + Math.PI / 2) * flankOffset;
  } else {
    // If Pac-Man is stationary, circle around to cut off escape
    const circleAngle = scatterTimer * 1.2 + Math.PI / 2; // 0.02 * 60 = 1.2 rad/s
    targetX = pacmanPosition.x + Math.cos(circleAngle) * 150;
    targetY = pacmanPosition.y + Math.sin(circleAngle) * 150;
  }

  return { x: targetX, y: targetY };
}

/**
 * Calculate target for Inky (patrol personality)
 * Coordinated flanking with Blinky to create pincer attacks
 * @param {Object} ghost - Ghost object
 * @param {Object} gameState - Game state {pacmanPosition}
 * @param {Array} allGhosts - Array of all ghosts (needs Blinky at index 0)
 * @param {number} scatterTimer - Ghost's scatter timer for side alternation
 * @returns {Object} - Target position {x, y}
 */
export function calculatePatrolTarget(
  ghost,
  gameState,
  allGhosts,
  scatterTimer
) {
  const { pacmanPosition } = gameState;
  const blinky = allGhosts[0];

  // Defensive check: If Blinky doesn't exist, fall back to direct chase
  if (!blinky) {
    return { x: pacmanPosition.x, y: pacmanPosition.y };
  }

  // Calculate where Pac-Man is trying to escape
  const escapeAngle = Math.atan2(
    pacmanPosition.y - blinky.y,
    pacmanPosition.x - blinky.x
  );

  // Position perpendicular to Blinky's chase to create a pincer attack
  const distanceFromPacman = 100;
  const perpAngle = escapeAngle + Math.PI / 2;

  // Alternate sides based on timer for unpredictability (every 3 seconds)
  const side = Math.floor(scatterTimer / 3) % 2 === 0 ? 1 : -1;

  let targetX =
    pacmanPosition.x + Math.cos(perpAngle) * distanceFromPacman * side;
  let targetY =
    pacmanPosition.y + Math.sin(perpAngle) * distanceFromPacman * side;

  // Add vertical advantage - prefer being above Pac-Man in open field
  if (Math.abs(ghost.y - pacmanPosition.y) < 100) {
    targetY = pacmanPosition.y - 200; // Position above
  }

  return { x: targetX, y: targetY };
}

/**
 * Calculate target for Clyde (scatter personality)
 * Unpredictable ambusher with zone control behavior
 * @param {Object} ghost - Ghost object
 * @param {Object} gameState - Game state {pacmanPosition}
 * @param {number} scatterTimer - Ghost's scatter timer for orbit behavior
 * @param {number} deltaTime - Time since last frame in seconds
 * @returns {Object} - Target position {x, y}
 */
export function calculateScatterTarget(
  ghost,
  gameState,
  scatterTimer,
  deltaTime
) {
  const { pacmanPosition } = gameState;

  const distanceToPacman = Math.sqrt(
    Math.pow(pacmanPosition.x - ghost.x, 2) +
      Math.pow(pacmanPosition.y - ghost.y, 2)
  );

  let targetX, targetY;

  // Zone-based behavior: Chase from optimal distance
  if (distanceToPacman < 150) {
    // Too close, maintain distance while cutting off escape
    const retreatAngle = Math.atan2(
      ghost.y - pacmanPosition.y,
      ghost.x - pacmanPosition.x
    );
    const maintainDistance = 200;

    // Don't just flee - position to block escape routes
    const blockAngle =
      retreatAngle + (Math.sin(scatterTimer * 3) * Math.PI) / 3; // 0.05 * 60 = 3 rad/s
    targetX = pacmanPosition.x + Math.cos(blockAngle) * maintainDistance;
    targetY = pacmanPosition.y + Math.sin(blockAngle) * maintainDistance;
  } else if (distanceToPacman > 400) {
    // Too far, close in aggressively
    targetX = pacmanPosition.x;
    targetY = pacmanPosition.y;
  } else {
    // Optimal zone - orbit and wait for opportunity
    // Initialize orbit angle if not set
    if (!ghost.orbitAngle)
      ghost.orbitAngle = Math.atan2(
        pacmanPosition.y - ghost.y,
        pacmanPosition.x - ghost.x
      );

    // Rotate orbit angle at constant angular velocity (1.8 rad/s)
    ghost.orbitAngle += 1.8 * deltaTime;

    const orbitRadius = 250;
    targetX = pacmanPosition.x + Math.cos(ghost.orbitAngle) * orbitRadius;
    targetY = pacmanPosition.y + Math.sin(ghost.orbitAngle) * orbitRadius;
  }

  return { x: targetX, y: targetY };
}

/**
 * Calculate frightened target (flee from Pac-Man)
 * @param {Object} ghost - Ghost object
 * @param {Object} gameState - Game state {pacmanPosition}
 * @returns {Object} - Target position {x, y}
 */
export function calculateFrightenedTarget(ghost, gameState) {
  const { pacmanPosition } = gameState;

  // Run away from Pac-Man with more erratic movement
  const fleeAngle = Math.atan2(
    ghost.y - pacmanPosition.y,
    ghost.x - pacmanPosition.x
  );
  const fleeDistance = 200;
  const targetX = ghost.x + Math.cos(fleeAngle) * fleeDistance;
  const targetY = ghost.y + Math.sin(fleeAngle) * fleeDistance;

  return { x: targetX, y: targetY };
}

/**
 * Calculate scatter mode target (corner positions)
 * @param {number} ghostIndex - Index of ghost (0-3)
 * @param {Object} gameState - Game state {pacmanPosition}
 * @returns {Object} - Target position {x, y}
 */
export function calculateScatterModeTarget(ghostIndex, gameState) {
  const { pacmanPosition } = gameState;

  // Safety check: return center position if pacmanPosition is invalid
  if (
    !pacmanPosition ||
    pacmanPosition.x === undefined ||
    pacmanPosition.y === undefined
  ) {
    return {
      x: window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2,
    };
  }

  // Validate ghostIndex is within bounds
  const validIndex = Math.max(0, Math.min(3, Math.floor(ghostIndex)));

  // Brief scatter mode - each ghost goes to their home corner
  // Blinky NEVER scatters - always aggressive!
  const corners = [
    { x: window.innerWidth * 0.9, y: pacmanPosition.y - 300 }, // Blinky: unused
    { x: window.innerWidth * 0.1, y: pacmanPosition.y - 300 }, // Pinky: top-left
    { x: window.innerWidth * 0.9, y: pacmanPosition.y + 500 }, // Inky: bottom-right
    { x: window.innerWidth * 0.1, y: pacmanPosition.y + 500 }, // Clyde: bottom-left
  ];

  return corners[validIndex];
}

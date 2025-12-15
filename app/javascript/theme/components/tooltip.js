/**
 * Tooltip initialization
 * @requires https://getbootstrap.com
 * @requires https://popper.js.org/
 */

const BOOTSTRAP_WAIT_MAX_ATTEMPTS = 10;
const BOOTSTRAP_WAIT_INTERVAL = 100;
const DEFAULT_ANIMATION_DELAY = 900;
const DEFAULT_TRANSITION_DURATION = 800;
const TRANSITION_BUFFER = 100;

const POPPER_CONFIG = {
  modifiers: [
    {
      name: "computeStyles",
      options: {
        adaptive: true,
        gpuAcceleration: true,
      },
    },
    {
      name: "preventOverflow",
      options: {
        boundary: "viewport",
        padding: 8,
      },
    },
    {
      name: "flip",
      options: {
        boundary: "viewport",
        padding: 8,
      },
    },
    {
      name: "offset",
      options: {
        offset: [0, 8],
      },
    },
  ],
};

function initializeTooltips() {
  if (typeof window.bootstrap === "undefined") {
    return;
  }

  const existingTooltips = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  existingTooltips.forEach((element) => {
    const tooltipInstance = window.bootstrap.Tooltip.getInstance(element);
    if (tooltipInstance) {
      tooltipInstance.dispose();
    }
  });

  const tooltipTriggerList = Array.from(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );

  if (tooltipTriggerList.length === 0) {
    return;
  }

  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    try {
      const hasHoverTransform =
        tooltipTriggerEl.classList.contains("badge-hover");
      const showDelay = hasHoverTransform ? 200 : 100;

      const tooltipInstance = new window.bootstrap.Tooltip(tooltipTriggerEl, {
        trigger: "hover",
        placement: tooltipTriggerEl.getAttribute("data-bs-placement") || "top",
        popperConfig: POPPER_CONFIG,
        delay: { show: showDelay, hide: 0 },
      });

      tooltipTriggerEl.addEventListener("shown.bs.tooltip", () => {
        const transitionDelay = hasHoverTransform ? 350 : 100;

        setTimeout(() => {
          if (tooltipInstance?._popper) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                tooltipInstance._popper.update();
              });
            });
          }
        }, transitionDelay);
      });
    } catch (error) {
      // Silently fail - tooltips are non-critical
    }
  });
}

function waitForBootstrap(callback, maxAttempts = BOOTSTRAP_WAIT_MAX_ATTEMPTS) {
  if (typeof window.bootstrap !== "undefined" && window.bootstrap.Tooltip) {
    callback();
    return;
  }

  if (maxAttempts <= 0) {
    return;
  }

  setTimeout(() => {
    waitForBootstrap(callback, maxAttempts - 1);
  }, BOOTSTRAP_WAIT_INTERVAL);
}

function waitForAnimations(callback) {
  const animatedElements = document.querySelectorAll(".fade-in-up");
  let maxDelay = 0;

  animatedElements.forEach((el) => {
    const computedStyle = window.getComputedStyle(el);
    const animationDuration =
      parseFloat(computedStyle.animationDuration) * 1000 ||
      DEFAULT_TRANSITION_DURATION;
    const animationDelay = parseFloat(computedStyle.animationDelay) * 1000 || 0;
    const totalTime = animationDuration + animationDelay;
    maxDelay = Math.max(maxDelay, totalTime);
  });

  const waitTime =
    maxDelay > 0 ? maxDelay + TRANSITION_BUFFER : DEFAULT_ANIMATION_DELAY;

  setTimeout(callback, waitTime);
}

function initOnReady() {
  const init = () => {
    waitForBootstrap(() => {
      waitForAnimations(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(initializeTooltips);
        });
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

function reinitializeTooltips() {
  waitForBootstrap(() => {
    waitForAnimations(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(initializeTooltips);
      });
    });
  });
}

initOnReady();

document.addEventListener("turbo:load", reinitializeTooltips);
document.addEventListener("turbo:render", reinitializeTooltips);

export default initializeTooltips;

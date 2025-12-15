/**
 * Popover initialization
 * @requires https://getbootstrap.com
 * @requires https://popper.js.org/
 */

const BOOTSTRAP_WAIT_MAX_ATTEMPTS = 10;
const BOOTSTRAP_WAIT_INTERVAL = 100;
const WRAPPER_LEAVE_DELAY = 300;
const POPOVER_LEAVE_DELAY = 200;

function initializePopovers() {
  if (typeof window.bootstrap === "undefined") {
    return;
  }

  const existingPopovers = document.querySelectorAll(
    '[data-bs-toggle="popover"]'
  );
  existingPopovers.forEach((element) => {
    const popoverInstance = window.bootstrap.Popover.getInstance(element);
    if (popoverInstance) {
      popoverInstance.dispose();
    }
  });

  const popoverTriggerList = Array.from(
    document.querySelectorAll('[data-bs-toggle="popover"]')
  );

  if (popoverTriggerList.length === 0) {
    return;
  }

  popoverTriggerList.forEach((popoverTriggerEl) => {
    try {
      const popoverInstance = new window.bootstrap.Popover(popoverTriggerEl, {
        trigger: "click",
        html: popoverTriggerEl.getAttribute("data-bs-html") === "true",
        placement: popoverTriggerEl.getAttribute("data-bs-placement") || "top",
        customClass: "tech-popover",
      });

      const wrapper = popoverTriggerEl.closest(
        ".tech-badge-wrapper, .tech-item-wrapper"
      );

      if (wrapper) {
        let hideTimeout = null;

        const cancelHide = () => {
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        };

        wrapper.addEventListener("mouseleave", () => {
          hideTimeout = setTimeout(() => {
            if (popoverInstance?._isShown) {
              const popoverElement = document.querySelector(
                ".popover.tech-popover"
              );
              if (!popoverElement?.matches(":hover")) {
                popoverInstance.hide();
              }
            }
          }, WRAPPER_LEAVE_DELAY);
        });

        wrapper.addEventListener("mouseenter", cancelHide);

        popoverTriggerEl.addEventListener("shown.bs.popover", () => {
          const popoverElement = document.querySelector(
            ".popover.tech-popover"
          );
          if (popoverElement) {
            popoverElement.addEventListener(
              "mouseleave",
              () => {
                cancelHide();
                hideTimeout = setTimeout(() => {
                  if (popoverInstance?._isShown) {
                    popoverInstance.hide();
                  }
                }, POPOVER_LEAVE_DELAY);
              },
              { once: true }
            );
          }
        });
      }
    } catch (error) {
      // Silently fail - popovers are non-critical
    }
  });
}

function waitForBootstrap(callback, maxAttempts = BOOTSTRAP_WAIT_MAX_ATTEMPTS) {
  if (typeof window.bootstrap !== "undefined" && window.bootstrap.Popover) {
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

function initOnReady() {
  const init = () => {
    waitForBootstrap(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(initializePopovers);
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

function reinitializePopovers() {
  waitForBootstrap(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(initializePopovers);
    });
  });
}

initOnReady();

document.addEventListener("turbo:load", reinitializePopovers);
document.addEventListener("turbo:render", reinitializePopovers);

export default initializePopovers;

import CounterController from "../counter_controller";

describe("CounterController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "counter");
    element.setAttribute("data-counter-target-value", "1000");
    element.setAttribute("data-counter-duration-value", "2000");
    element.setAttribute("data-counter-suffix-value", "");
    controller = global.setupController("counter", CounterController, element);
  });

  afterEach(() => {
    global.cleanupController(element, controller);
  });

  test("connect sets initial value to 0", () => {
    // Counter controller sets initial value in connect
    // Check that text content matches initial value (0 with suffix)
    expect(element.textContent).toMatch(/^0/);
  });

  test("animateCounter animates from 0 to target", (done) => {
    // Create new element with different values
    const newElement = document.createElement("div");
    newElement.setAttribute("data-controller", "counter");
    newElement.setAttribute("data-counter-target-value", "100");
    newElement.setAttribute("data-counter-duration-value", "100");
    newElement.setAttribute("data-counter-suffix-value", "");

    const newController = global.setupController(
      "counter",
      CounterController,
      newElement
    );

    // Ensure values are properly set from data attributes
    // Parse from data-counter-*-value attributes
    const targetVal = newElement.dataset.counterTargetValue;
    const durationVal = newElement.dataset.counterDurationValue;
    const suffixVal = newElement.dataset.counterSuffixValue || "";

    if (targetVal !== undefined && !newController.targetValue) {
      newController.targetValue = Number(targetVal);
    }
    if (durationVal !== undefined && !newController.durationValue) {
      newController.durationValue = Number(durationVal);
    }
    if (suffixVal !== undefined && newController.suffixValue === undefined) {
      newController.suffixValue = suffixVal;
    }

    // Trigger animation manually
    newController.animateCounter();

    setTimeout(() => {
      const value = parseInt(newElement.textContent.replace(/,/g, ""));
      expect(value).toBeGreaterThanOrEqual(90);
      global.cleanupController(newElement, newController);
      done();
    }, 150);
  });

  test("animateCounter includes suffix", (done) => {
    // Create new element with suffix
    const newElement = document.createElement("div");
    newElement.setAttribute("data-controller", "counter");
    newElement.setAttribute("data-counter-target-value", "100");
    newElement.setAttribute("data-counter-duration-value", "50");
    newElement.setAttribute("data-counter-suffix-value", "%");

    const newController = global.setupController(
      "counter",
      CounterController,
      newElement
    );

    // Ensure values are properly set from data attributes
    const targetVal = newElement.dataset.counterTargetValue;
    const durationVal = newElement.dataset.counterDurationValue;
    const suffixVal = newElement.dataset.counterSuffixValue || "";

    if (targetVal !== undefined && !newController.targetValue) {
      newController.targetValue = Number(targetVal);
    }
    if (durationVal !== undefined && !newController.durationValue) {
      newController.durationValue = Number(durationVal);
    }
    if (suffixVal !== undefined && newController.suffixValue === undefined) {
      newController.suffixValue = suffixVal;
    }

    // Trigger animation manually
    newController.animateCounter();

    setTimeout(() => {
      expect(newElement.textContent).toContain("%");
      global.cleanupController(newElement, newController);
      done();
    }, 100);
  });
});

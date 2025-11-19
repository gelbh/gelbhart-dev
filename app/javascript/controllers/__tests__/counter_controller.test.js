import CounterController from "../counter_controller";

describe("CounterController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "counter");
    element.setAttribute("data-counter-target-value", "1000");
    document.body.appendChild(element);

    controller = new CounterController();
    controller.element = element;
    controller.targetValue = 1000;
    controller.durationValue = 2000;
    controller.suffixValue = "";
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
  });

  test("connect sets initial value to 0", () => {
    controller.connect();
    expect(element.textContent).toBe("0");
  });

  test("animateCounter animates from 0 to target", (done) => {
    controller.targetValue = 100;
    controller.durationValue = 100; // Short duration for testing

    controller.animateCounter();

    setTimeout(() => {
      expect(parseInt(element.textContent.replace(/,/g, ""))).toBeGreaterThanOrEqual(90);
      done();
    }, 150);
  });

  test("animateCounter includes suffix", () => {
    controller.targetValue = 100;
    controller.durationValue = 50;
    controller.suffixValue = "%";

    controller.animateCounter();

    setTimeout(() => {
      expect(element.textContent).toContain("%");
    }, 100);
  });
});


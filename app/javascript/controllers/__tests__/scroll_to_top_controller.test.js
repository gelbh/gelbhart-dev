import ScrollToTopController from "../scroll_to_top_controller";

describe("ScrollToTopController", () => {
  let controller;
  let element;
  let button;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "scroll-to-top");
    button = document.createElement("button");
    button.setAttribute("data-scroll-to-top-target", "button");
    element.appendChild(button);
    document.body.appendChild(element);

    controller = new ScrollToTopController();
    controller.element = element;
    controller.buttonTarget = button;

    global.window.scrollY = 0;
    global.window.scrollTo = jest.fn();
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
  });

  test("connect adds scroll event listener", () => {
    global.window.addEventListener = jest.fn();
    controller.connect();
    expect(global.window.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  test("checkScroll shows button when scrolled down", () => {
    global.window.scrollY = 400;
    controller.checkScroll();
    expect(button.classList.contains("visible")).toBe(true);
  });

  test("checkScroll hides button when at top", () => {
    global.window.scrollY = 100;
    controller.checkScroll();
    expect(button.classList.contains("visible")).toBe(false);
  });

  test("scrollToTop scrolls to top smoothly", () => {
    const event = { preventDefault: jest.fn() };
    controller.scrollToTop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(global.window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth"
    });
  });
});


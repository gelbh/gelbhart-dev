import CodeTyperController from "../code_typer_controller";

describe("CodeTyperController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "code-typer");
    document.body.appendChild(element);

    controller = new CodeTyperController();
    controller.element = element;
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
  });

  test("controller initializes", () => {
    expect(controller).toBeDefined();
  });
});


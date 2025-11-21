import PacmanInputController from "../pacman/input_controller";

// Mock TouchControlsManager
jest.mock("lib/pacman/touch_controls_manager", () => {
  return {
    TouchControlsManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      cleanup: jest.fn(),
      ensureTouchControls: jest.fn(),
      hide: jest.fn(),
    })),
  };
});

describe("PacmanInputController", () => {
  let controller;
  let element;
  let mockGameController;
  let mockTouchControls;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock game controller with all required methods
    mockGameController = {
      handleMovement: jest.fn(),
      requestStart: jest.fn(),
      toggleMute: jest.fn(),
      showMenu: jest.fn(),
      getGameState: jest.fn(() => ({
        isGameActive: true,
        isStarting: false,
        isDying: false,
      })),
    };

    // Create element
    element = document.createElement("div");
    element.setAttribute("data-controller", "pacman-input");

    // Mock TouchControlsManager constructor
    const {
      TouchControlsManager,
    } = require("lib/pacman/touch_controls_manager");
    mockTouchControls = {
      initialize: jest.fn(),
      cleanup: jest.fn(),
      ensureTouchControls: jest.fn(),
      hide: jest.fn(),
    };
    TouchControlsManager.mockReturnValue(mockTouchControls);

    // Mock document.querySelector for menu modal checks
    document.querySelector = jest.fn(() => null);

    // Setup controller with skipConnect to manually control initialization
    controller = global.setupController(
      "pacman-input",
      PacmanInputController,
      element,
      true
    );

    // Mock outlet
    Object.defineProperty(controller, "hasPacmanGameOutlet", {
      get: () => false,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.cleanupController(element, controller);
    jest.restoreAllMocks();
  });

  test("controller initializes", () => {
    expect(controller).toBeDefined();
    expect(controller.element).toBe(element);
  });

  test("connect initializes TouchControlsManager", () => {
    const {
      TouchControlsManager,
    } = require("lib/pacman/touch_controls_manager");
    controller.connect();
    expect(TouchControlsManager).toHaveBeenCalled();
    expect(controller.touchControlsManager).toBe(mockTouchControls);
  });

  test("connect adds keydown event listener", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    controller.connect();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
    addEventListenerSpy.mockRestore();
  });

  test("disconnect removes keydown event listener and cleans up touch controls", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
    controller.connect();
    controller.disconnect();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
    expect(mockTouchControls.cleanup).toHaveBeenCalled();
    removeEventListenerSpy.mockRestore();
  });

  test("getGameController uses outlet when available", () => {
    Object.defineProperty(controller, "hasPacmanGameOutlet", {
      get: () => true,
      configurable: true,
    });
    Object.defineProperty(controller, "pacmanGameOutlet", {
      get: () => mockGameController,
      configurable: true,
    });

    controller.getGameController();
    expect(controller.gameController).toBe(mockGameController);
  });

  test("getGameController uses element property when outlet not available", () => {
    element._pacmanGameController = mockGameController;
    controller.getGameController();
    expect(controller.gameController).toBe(mockGameController);
  });

  test("getGameController uses application method as fallback", () => {
    const mockGetController = jest.fn(() => mockGameController);
    controller.application.getControllerForElementAndIdentifier =
      mockGetController;

    controller.getGameController();
    expect(mockGetController).toHaveBeenCalledWith(element, "pacman-game");
    expect(controller.gameController).toBe(mockGameController);
  });

  test("pacmanGameOutletConnected initializes touch controls when outlet connects", () => {
    Object.defineProperty(controller, "hasPacmanGameOutlet", {
      get: () => true,
      configurable: true,
    });
    Object.defineProperty(controller, "pacmanGameOutlet", {
      get: () => mockGameController,
      configurable: true,
    });

    controller.connect();
    controller.pacmanGameOutletConnected();

    expect(controller.gameController).toBe(mockGameController);
    expect(mockTouchControls.initialize).toHaveBeenCalled();
  });

  test("initializeTouchControls calls TouchControlsManager.initialize with callbacks", () => {
    controller.gameController = mockGameController;
    controller.connect(); // Initializes touchControlsManager
    controller.initializeTouchControls();

    expect(mockTouchControls.initialize).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  test("getGameState returns game state from game controller", () => {
    controller.gameController = mockGameController;
    const gameState = controller.getGameState();

    expect(mockGameController.getGameState).toHaveBeenCalled();
    expect(gameState).toEqual({
      isGameActive: true,
      isStarting: false,
      isDying: false,
    });
  });

  test("getGameState returns default state when game controller not available", () => {
    controller.gameController = null;
    // Mock getGameController to not find a controller
    const getGameControllerSpy = jest
      .spyOn(controller, "getGameController")
      .mockImplementation(() => {
        // Don't set gameController
      });

    const gameState = controller.getGameState();

    expect(gameState).toEqual({
      isGameActive: false,
      isStarting: false,
      isDying: false,
    });

    getGameControllerSpy.mockRestore();
  });

  test("requestGameStart calls game controller requestStart", () => {
    controller.gameController = mockGameController;
    controller.requestGameStart();

    expect(mockGameController.requestStart).toHaveBeenCalled();
  });

  test("requestGameStart does nothing when game controller not available", () => {
    controller.gameController = null;
    // Mock getGameController to not find a controller
    const getGameControllerSpy = jest
      .spyOn(controller, "getGameController")
      .mockImplementation(() => {
        // Don't set gameController
      });

    controller.requestGameStart();

    expect(mockGameController.requestStart).not.toHaveBeenCalled();

    getGameControllerSpy.mockRestore();
  });

  test("handleMovement calls game controller when game is active", () => {
    controller.gameController = mockGameController;
    controller.handleMovement(0, -1, { x: 0, y: -1 }, "up");

    expect(mockGameController.getGameState).toHaveBeenCalled();
    expect(mockGameController.handleMovement).toHaveBeenCalledWith(
      { x: 0, y: -1 },
      "up"
    );
  });

  test("handleMovement does not call game controller when game is starting", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: true,
      isStarting: true,
      isDying: false,
    });
    controller.gameController = mockGameController;

    controller.handleMovement(0, -1, { x: 0, y: -1 }, "up");

    expect(mockGameController.handleMovement).not.toHaveBeenCalled();
  });

  test("handleMovement does not call game controller when game is not active", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: false,
      isStarting: false,
      isDying: false,
    });
    controller.gameController = mockGameController;

    controller.handleMovement(0, -1, { x: 0, y: -1 }, "up");

    expect(mockGameController.handleMovement).not.toHaveBeenCalled();
  });

  test("handleMovement does not call game controller when player is dying", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: true,
      isStarting: false,
      isDying: true,
    });
    controller.gameController = mockGameController;

    controller.handleMovement(0, -1, { x: 0, y: -1 }, "up");

    expect(mockGameController.handleMovement).not.toHaveBeenCalled();
  });

  test("handleKeydown handles M key for mute toggle", () => {
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "m" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.getGameState).toHaveBeenCalled();
    expect(mockGameController.toggleMute).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown handles M key only when game is active or starting", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: false,
      isStarting: false,
      isDying: false,
    });
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "m" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.toggleMute).not.toHaveBeenCalled();
  });

  test("handleKeydown handles Escape key for menu", () => {
    controller.gameController = mockGameController;
    document.querySelector.mockReturnValue(null); // No menu modal open
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.getGameState).toHaveBeenCalled();
    expect(document.querySelector).toHaveBeenCalledWith(".pacman-menu-modal");
    expect(mockGameController.showMenu).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown does not show menu if modal already open", () => {
    controller.gameController = mockGameController;
    document.querySelector.mockReturnValue({}); // Menu modal already open
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.showMenu).not.toHaveBeenCalled();
  });

  test("handleKeydown handles ArrowUp key for movement", () => {
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.handleMovement).toHaveBeenCalledWith(
      { x: 0, y: -1 },
      "up"
    );
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown handles ArrowDown key for movement", () => {
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.handleMovement).toHaveBeenCalledWith(
      { x: 0, y: 1 },
      "down"
    );
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown handles ArrowLeft key for movement", () => {
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.handleMovement).toHaveBeenCalledWith(
      { x: -1, y: 0 },
      "left"
    );
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown handles ArrowRight key for movement", () => {
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.handleMovement).toHaveBeenCalledWith(
      { x: 1, y: 0 },
      "right"
    );
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown handles WASD keys for movement", () => {
    controller.gameController = mockGameController;
    controller.connect();

    const testCases = [
      { key: "w", direction: "up", velocity: { x: 0, y: -1 } },
      { key: "W", direction: "up", velocity: { x: 0, y: -1 } },
      { key: "s", direction: "down", velocity: { x: 0, y: 1 } },
      { key: "S", direction: "down", velocity: { x: 0, y: 1 } },
      { key: "a", direction: "left", velocity: { x: -1, y: 0 } },
      { key: "A", direction: "left", velocity: { x: -1, y: 0 } },
      { key: "d", direction: "right", velocity: { x: 1, y: 0 } },
      { key: "D", direction: "right", velocity: { x: 1, y: 0 } },
    ];

    testCases.forEach(({ key, direction, velocity }) => {
      jest.clearAllMocks();
      const event = new KeyboardEvent("keydown", { key });
      event.preventDefault = jest.fn();

      controller.handleKeydown(event);

      expect(mockGameController.handleMovement).toHaveBeenCalledWith(
        velocity,
        direction
      );
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  test("handleKeydown auto-starts game on first movement key when game not active", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: false,
      isStarting: false,
      isDying: false,
    });
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.requestStart).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockGameController.handleMovement).not.toHaveBeenCalled();
  });

  test("handleKeydown prevents movement during intro music", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: true,
      isStarting: true,
      isDying: false,
    });
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.handleMovement).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown prevents movement when player is dying", () => {
    mockGameController.getGameState.mockReturnValue({
      isGameActive: true,
      isStarting: false,
      isDying: true,
    });
    controller.gameController = mockGameController;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    expect(mockGameController.handleMovement).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("handleKeydown handles missing game controller gracefully", () => {
    controller.gameController = null;
    controller.connect();

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    event.preventDefault = jest.fn();

    // Should not throw
    expect(() => controller.handleKeydown(event)).not.toThrow();
  });

  test("handleKeydown uses requestAnimationFrame when game controller not immediately available", () => {
    // Ensure gameController starts as null
    controller.gameController = null;
    // Ensure element doesn't have the controller reference
    element._pacmanGameController = undefined;
    // Ensure application method doesn't find controller
    controller.application.getControllerForElementAndIdentifier = jest.fn(
      () => null
    );
    controller.connect();

    // First call to getGameController should not find it, keeping it null
    // Second call (inside handleKeydown) should also not find it
    const originalGetGameController =
      controller.getGameController.bind(controller);
    let callCount = 0;
    const getGameControllerSpy = jest
      .spyOn(controller, "getGameController")
      .mockImplementation(() => {
        callCount++;
        // Always keep it null for first two calls
        originalGetGameController();
        if (
          !element._pacmanGameController &&
          !controller.hasPacmanGameOutlet &&
          !controller.application.getControllerForElementAndIdentifier(
            element,
            "pacman-game"
          )
        ) {
          controller.gameController = null;
        }
      });

    const rafSpy = jest.spyOn(window, "requestAnimationFrame");
    rafSpy.mockImplementation((cb) => {
      // In the animation frame, simulate controller becoming available
      controller.gameController = mockGameController;
      cb();
      return 1;
    });

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    event.preventDefault = jest.fn();

    controller.handleKeydown(event);

    // Should call requestAnimationFrame when gameController is still null after getGameController
    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
    getGameControllerSpy.mockRestore();
  });

  test("ensureTouchControls calls TouchControlsManager.ensureTouchControls", () => {
    controller.connect();
    controller.ensureTouchControls();

    expect(mockTouchControls.ensureTouchControls).toHaveBeenCalled();
  });

  test("hideJoystick calls TouchControlsManager.hide", () => {
    controller.connect();
    controller.hideJoystick();

    expect(mockTouchControls.hide).toHaveBeenCalled();
  });
});

import PacmanMenuController from "../pacman/menu_controller";

// Mock LeaderboardManager
jest.mock("lib/pacman/leaderboard_manager", () => {
  return {
    LeaderboardManager: jest.fn().mockImplementation(() => ({
      getPlayerName: jest.fn(() => null),
      savePlayerName: jest.fn(),
      submitScore: jest.fn(() =>
        Promise.resolve({ success: true, score: { id: 1 } })
      ),
      fetchLeaderboardData: jest.fn(() =>
        Promise.resolve({
          global: [],
          player: null,
        })
      ),
    })),
  };
});

describe("PacmanMenuController", () => {
  let controller;
  let element;
  let mockGameController;
  let mockLeaderboardManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    // Mock game controller outlet
    mockGameController = {
      showLeaderboardModal: jest.fn(),
      showMenu: jest.fn(),
      stopGame: jest.fn(),
    };

    // Create element
    element = document.createElement("div");
    element.setAttribute("data-controller", "pacman-menu");

    // Mock LeaderboardManager constructor
    const { LeaderboardManager } = require("lib/pacman/leaderboard_manager");
    mockLeaderboardManager = {
      getPlayerName: jest.fn(() => null),
      savePlayerName: jest.fn(),
      submitScore: jest.fn(() =>
        Promise.resolve({ success: true, score: { id: 1 } })
      ),
      fetchLeaderboardData: jest.fn(() =>
        Promise.resolve({
          global: [],
          player: null,
        })
      ),
    };
    LeaderboardManager.mockReturnValue(mockLeaderboardManager);

    // Setup controller
    controller = global.setupController(
      "pacman-menu",
      PacmanMenuController,
      element
    );

    // Mock outlet
    Object.defineProperty(controller, "hasPacmanGameOutlet", {
      get: () => true,
      configurable: true,
    });
    Object.defineProperty(controller, "pacmanGameOutlet", {
      get: () => mockGameController,
      configurable: true,
    });

    // Clear localStorage
    global.localStorage.clear();
  });

  afterEach(() => {
    global.cleanupController(element, controller);
    global.localStorage.clear();
    jest.restoreAllMocks();
  });

  test("controller initializes", () => {
    expect(controller).toBeDefined();
    expect(controller.element).toBe(element);
  });

  test("connect initializes LeaderboardManager", () => {
    const { LeaderboardManager } = require("lib/pacman/leaderboard_manager");
    expect(LeaderboardManager).toHaveBeenCalled();
    expect(controller.leaderboardManager).toBe(mockLeaderboardManager);
  });

  test("getPlayerName returns player name from LeaderboardManager", () => {
    mockLeaderboardManager.getPlayerName.mockReturnValue("TestPlayer");
    const playerName = controller.getPlayerName();

    expect(mockLeaderboardManager.getPlayerName).toHaveBeenCalled();
    expect(playerName).toBe("TestPlayer");
  });

  test("getPlayerName returns null when no player name set", () => {
    mockLeaderboardManager.getPlayerName.mockReturnValue(null);
    const playerName = controller.getPlayerName();

    expect(playerName).toBeNull();
  });

  test("savePlayerName saves player name via LeaderboardManager", () => {
    controller.savePlayerName("TestPlayer");

    expect(mockLeaderboardManager.savePlayerName).toHaveBeenCalledWith(
      "TestPlayer"
    );
  });

  test("submitScore submits score via LeaderboardManager", async () => {
    const result = await controller.submitScore("TestPlayer", 1000, true);

    expect(mockLeaderboardManager.submitScore).toHaveBeenCalledWith(
      "TestPlayer",
      1000,
      true
    );
    expect(result.success).toBe(true);
  });

  test("submitScore handles API errors gracefully", async () => {
    mockLeaderboardManager.submitScore.mockRejectedValue(
      new Error("API Error")
    );

    await expect(
      controller.submitScore("TestPlayer", 1000, true)
    ).rejects.toThrow("API Error");

    expect(mockLeaderboardManager.submitScore).toHaveBeenCalledWith(
      "TestPlayer",
      1000,
      true
    );
  });

  test("fetchLeaderboardData returns leaderboard data from LeaderboardManager", async () => {
    const mockData = {
      global: [
        { player_name: "Player1", score: 1000 },
        { player_name: "Player2", score: 2000 },
      ],
      player: {
        name: "TestPlayer",
        scores: [{ score: 1500 }],
      },
    };
    mockLeaderboardManager.fetchLeaderboardData.mockResolvedValue(mockData);

    const data = await controller.fetchLeaderboardData();

    expect(mockLeaderboardManager.fetchLeaderboardData).toHaveBeenCalled();
    expect(data).toEqual(mockData);
  });

  test("showLeaderboardFromMenu fetches data and shows leaderboard modal", async () => {
    const mockData = {
      global: [{ player_name: "Player1", score: 1000 }],
      player: null,
    };
    mockLeaderboardManager.fetchLeaderboardData.mockResolvedValue(mockData);

    await controller.showLeaderboardFromMenu();

    expect(mockLeaderboardManager.fetchLeaderboardData).toHaveBeenCalled();
    expect(mockGameController.showLeaderboardModal).toHaveBeenCalledWith(
      mockData,
      expect.any(Function)
    );
  });

  test("showLeaderboardFromMenu returns to menu when leaderboard closed", async () => {
    const mockData = {
      global: [],
      player: null,
    };
    mockLeaderboardManager.fetchLeaderboardData.mockResolvedValue(mockData);

    await controller.showLeaderboardFromMenu();

    expect(mockGameController.showLeaderboardModal).toHaveBeenCalled();

    // Call the callback passed to showLeaderboardModal
    const callback = mockGameController.showLeaderboardModal.mock.calls[0][1];
    callback();

    expect(mockGameController.showMenu).toHaveBeenCalled();
  });

  test("showLeaderboardFromMenu does nothing when outlet not available", async () => {
    Object.defineProperty(controller, "hasPacmanGameOutlet", {
      get: () => false,
      configurable: true,
    });

    await controller.showLeaderboardFromMenu();

    expect(mockLeaderboardManager.fetchLeaderboardData).not.toHaveBeenCalled();
    expect(mockGameController.showLeaderboardModal).not.toHaveBeenCalled();
  });

  test("showLeaderboardFromGameEnd fetches data and shows leaderboard modal", async () => {
    const mockData = {
      global: [{ player_name: "Player1", score: 1000 }],
      player: null,
    };
    mockLeaderboardManager.fetchLeaderboardData.mockResolvedValue(mockData);

    await controller.showLeaderboardFromGameEnd();

    expect(mockLeaderboardManager.fetchLeaderboardData).toHaveBeenCalled();
    expect(mockGameController.showLeaderboardModal).toHaveBeenCalledWith(
      mockData,
      expect.any(Function)
    );
  });

  test("showLeaderboardFromGameEnd stops game when leaderboard closed", async () => {
    const mockData = {
      global: [],
      player: null,
    };
    mockLeaderboardManager.fetchLeaderboardData.mockResolvedValue(mockData);

    await controller.showLeaderboardFromGameEnd();

    expect(mockGameController.showLeaderboardModal).toHaveBeenCalled();

    // Call the callback passed to showLeaderboardModal
    const callback = mockGameController.showLeaderboardModal.mock.calls[0][1];
    callback();

    expect(mockGameController.stopGame).toHaveBeenCalled();
    expect(mockGameController.showMenu).not.toHaveBeenCalled();
  });

  test("showLeaderboardFromGameEnd does nothing when outlet not available", async () => {
    Object.defineProperty(controller, "hasPacmanGameOutlet", {
      get: () => false,
      configurable: true,
    });

    await controller.showLeaderboardFromGameEnd();

    expect(mockLeaderboardManager.fetchLeaderboardData).not.toHaveBeenCalled();
    expect(mockGameController.showLeaderboardModal).not.toHaveBeenCalled();
  });

  test("fetchLeaderboardData handles API errors gracefully", async () => {
    mockLeaderboardManager.fetchLeaderboardData.mockRejectedValue(
      new Error("Network error")
    );

    await expect(controller.fetchLeaderboardData()).rejects.toThrow(
      "Network error"
    );

    expect(mockLeaderboardManager.fetchLeaderboardData).toHaveBeenCalled();
  });
});

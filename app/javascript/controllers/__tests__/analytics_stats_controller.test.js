import AnalyticsStatsController from "../analytics/stats_controller";

// Mock api_client module
jest.mock("../../lib/api_client.js", () => {
  const mockApi = {
    get: jest.fn(() =>
      Promise.resolve({
        active_users: 1005,
        install_count: 345,
        engagement_rate: 52,
        countries: { list: [], total: 0 },
      })
    ),
  };
  return { __esModule: true, default: mockApi };
});

// Mock localforage
jest.mock("localforage", () => {
  const storage = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(storage.get(key) || null)),
      setItem: jest.fn((key, value) => {
        storage.set(key, value);
        return Promise.resolve(value);
      }),
      removeItem: jest.fn((key) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
    },
  };
});

describe("AnalyticsStatsController", () => {
  let controller;
  let element;
  let mockApi;

  beforeEach(async () => {
    // Get the mocked api client
    const apiModule = await import("../../lib/api_client.js");
    mockApi = apiModule.default;
    mockApi.get.mockClear();

    // Mock localforage to return empty cache
    const localforage = (await import("localforage")).default;
    localforage.getItem.mockResolvedValue(null);
    localforage.setItem.mockClear();

    element = document.createElement("div");
    element.setAttribute("data-controller", "analytics-stats");
    // Set apiUrlValue to ensure it's initialized
    element.setAttribute(
      "data-analytics-stats-api-url-value",
      "/api/analytics/hevy-tracker"
    );
    element.innerHTML = `
      <div data-analytics-stats-target="activeUsers"></div>
      <div data-analytics-stats-target="installCount"></div>
      <div data-analytics-stats-target="countries"></div>
      <div data-analytics-stats-target="engagementRate"></div>
      <div data-analytics-stats-target="countriesList"></div>
    `;

    controller = global.setupController(
      "analytics-stats",
      AnalyticsStatsController,
      element
    );

    // Wait for async operations in connect to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    global.cleanupController(element, controller);
  });

  test("connect initializes controller", () => {
    // Controller already connected in beforeEach
    // Check that controller exists and has element
    expect(controller).toBeDefined();
    expect(controller.element).toBe(element);
  });

  test("fetchStats calls API and updates stats", async () => {
    // Controller already connected in beforeEach, fetchStats was called during connect
    // Wait for async fetch operation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify api.get was called with the correct path (apiUrlValue without /api prefix)
    expect(mockApi.get).toHaveBeenCalledWith("/analytics/hevy-tracker");
  });

  test("fetchStats handles errors gracefully", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Make api.get reject with an error for this test
    mockApi.get.mockRejectedValueOnce(new Error("Network error"));

    // Create new element and controller to test error handling
    const newElement = document.createElement("div");
    newElement.setAttribute("data-controller", "analytics-stats");
    newElement.setAttribute(
      "data-analytics-stats-api-url-value",
      "/api/analytics/hevy-tracker"
    );
    newElement.innerHTML = `
      <div data-analytics-stats-target="activeUsers"></div>
      <div data-analytics-stats-target="installCount"></div>
      <div data-analytics-stats-target="countries"></div>
      <div data-analytics-stats-target="engagementRate"></div>
      <div data-analytics-stats-target="countriesList"></div>
    `;

    const newController = global.setupController(
      "analytics-stats",
      AnalyticsStatsController,
      newElement
    );

    // Wait for async fetch operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify api.get was called and error was logged
    expect(mockApi.get).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    global.cleanupController(newElement, newController);
    consoleErrorSpy.mockRestore();
  });

  test("toggleCountries expands and collapses", () => {
    controller.expanded = false;
    controller.allCountries = Array(10).fill({ name: "Test", users: 10 });
    controller.countriesListTarget = document.createElement("div");

    controller.toggleCountries();
    expect(controller.expanded).toBe(true);

    controller.toggleCountries();
    expect(controller.expanded).toBe(false);
  });
});

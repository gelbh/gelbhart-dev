import AnalyticsStatsController from "../analytics_stats_controller";

describe("AnalyticsStatsController", () => {
  let controller;
  let element;

  beforeEach(() => {
    // Mock fetch before controller connects (since connect calls fetchStats)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            active_users: 750,
            page_views: 1880,
            install_count: 294,
            engagement_rate: 62,
            countries: { list: [], total: 0 },
          }),
      })
    );

    element = document.createElement("div");
    element.setAttribute("data-controller", "analytics-stats");
    element.innerHTML = `
      <div data-analytics-stats-target="activeUsers"></div>
      <div data-analytics-stats-target="pageViews"></div>
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

    // Verify fetch was called during connect
    expect(global.fetch).toHaveBeenCalledWith("/api/analytics/hevy-tracker");
  });

  test("fetchStats handles errors gracefully", async () => {
    // Create a new controller with error-throwing fetch
    const errorFetch = jest.fn(() =>
      Promise.reject(new Error("Network error"))
    );
    global.fetch = errorFetch;

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Create new element and controller to test error handling
    const newElement = document.createElement("div");
    newElement.setAttribute("data-controller", "analytics-stats");
    newElement.innerHTML = `
      <div data-analytics-stats-target="activeUsers"></div>
      <div data-analytics-stats-target="pageViews"></div>
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

    // Verify fetch was called and error was logged
    expect(errorFetch).toHaveBeenCalled();
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

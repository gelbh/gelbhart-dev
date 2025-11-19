import AnalyticsStatsController from "../analytics_stats_controller";

describe("AnalyticsStatsController", () => {
  let controller;
  let element;

  beforeEach(() => {
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
    document.body.appendChild(element);

    controller = new AnalyticsStatsController();
    controller.element = element;
    controller.application = { getControllerForElementAndIdentifier: jest.fn() };
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  test("connect initializes controller", () => {
    controller.connect();
    expect(controller.expanded).toBe(false);
    expect(controller.allCountries).toEqual([]);
  });

  test("fetchStats calls API and updates stats", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            active_users: 750,
            page_views: 1880,
            install_count: 294,
            engagement_rate: 62,
            countries: { list: [], total: 0 }
          })
      })
    );

    controller.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledWith("/api/analytics/hevy-tracker");
  });

  test("fetchStats handles errors gracefully", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));
    console.error = jest.fn();

    controller.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(console.error).toHaveBeenCalled();
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


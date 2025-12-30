import { Controller } from "@hotwired/stimulus";
import api from "lib/api_client";
import countries from "i18n-iso-countries";
import localforage from "localforage";

// Register English locale for country name lookups
(async () => {
  try {
    const enLocale = await import("i18n-iso-countries/langs/en.json");
    countries.registerLocale(enLocale.default || enLocale);
  } catch (error) {
    console.warn("Could not register i18n-iso-countries locale:", error);
  }
})();

export default class extends Controller {
  static targets = [
    "activeUsers",
    "installCount",
    "countries",
    "engagementRate",
    "countriesList",
    "expandButton",
  ];

  static values = {
    apiUrl: { type: String, default: "/api/analytics/hevy-tracker" },
  };

  CACHE_DURATION = 5 * 60 * 1000;
  CACHE_KEY = "hevy_tracker_analytics_cache";
  DEFAULTS_KEY = "hevy_tracker_analytics_defaults";

  // Metric configuration for counter targets
  METRICS = [
    { key: "active_users", target: "activeUsers" },
    { key: "install_count", target: "installCount" },
    {
      key: "countries_total",
      target: "countries",
      getValue: (data) => data.countries?.total || 0,
    },
    { key: "engagement_rate", target: "engagementRate" },
  ];

  async connect() {
    this.expanded = false;
    this.allCountries = [];
    this.totalUsers = 0;

    const defaults = await this.loadDefaultValues();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.updateCounterControllersFromDefaults(defaults);
    this.fetchStats();
  }

  toggleCountries() {
    this.expanded = !this.expanded;
    this.renderCountries();

    if (this.hasExpandButtonTarget) {
      this.expandButtonTarget.innerHTML = this.expanded
        ? '<i class="bx bx-chevron-up me-1"></i>Show Less'
        : '<i class="bx bx-chevron-down me-1"></i>Show All Countries';
    }

    if (!this.expanded) {
      const countriesSection = this.element.querySelector(".border-top.pt-4");
      countriesSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async fetchStats() {
    try {
      const cached = await this.getCachedStats();
      if (cached) {
        this.updateStats(cached.data);
        this.fetchFreshStats();
        return;
      }

      await this.fetchFreshStats();
    } catch (error) {
      console.error("Analytics fetch error:", error);
      const cached = await this.getCachedStats(true);
      if (cached) {
        this.updateStats(cached.data);
      }
    }
  }

  async getCachedStats(allowExpired = false) {
    try {
      const cached = await localforage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (!allowExpired && age > this.CACHE_DURATION) return null;

      return cached;
    } catch (error) {
      console.warn("Error reading analytics cache:", error);
      return null;
    }
  }

  async setCachedStats(data) {
    try {
      await localforage.setItem(this.CACHE_KEY, {
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn("Error saving analytics cache:", error);
    }
  }

  async fetchFreshStats() {
    const path = this.apiUrlValue.replace(/^\/api/, "");
    const data = await api.get(path);

    await this.setCachedStats(data);
    this.updateDefaultValues(data);
    this.updateStats(data);
  }

  updateDefaultValues(data) {
    this.METRICS.forEach((metric) => {
      const hasTarget =
        this[
          `has${
            metric.target.charAt(0).toUpperCase() + metric.target.slice(1)
          }Target`
        ];
      if (!hasTarget) return;

      const target = this[`${metric.target}Target`];
      if (!target) return;

      const value = metric.getValue ? metric.getValue(data) : data[metric.key];
      target.setAttribute("data-counter-target-value", value);
    });

    this.saveDefaultValues(data);
  }

  async saveDefaultValues(data) {
    try {
      const engagementRate = data.engagement_rate ?? 0;
      await localforage.setItem(this.DEFAULTS_KEY, {
        active_users: data.active_users,
        install_count: data.install_count,
        countries_total: data.countries?.total || 0,
        countries_list: data.countries?.list || [],
        engagement_rate: engagementRate,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn("Error saving default values:", error);
    }
  }

  async loadDefaultValues() {
    try {
      const defaults = await localforage.getItem(this.DEFAULTS_KEY);
      if (!defaults) return null;

      this.METRICS.forEach((metric) => {
        const hasTarget =
          this[
            `has${
              metric.target.charAt(0).toUpperCase() + metric.target.slice(1)
            }Target`
          ];
        if (!hasTarget) return;

        const target = this[`${metric.target}Target`];
        if (!target) return;

        const value = defaults[metric.key];
        target.setAttribute("data-counter-target-value", value);
      });

      if (defaults.countries_list?.length > 0) {
        this.allCountries = defaults.countries_list;
        this.totalUsers = defaults.active_users || 0;
        this.renderCountries();
      }

      return defaults;
    } catch (error) {
      console.warn("Error loading default values:", error);
      return null;
    }
  }

  updateCounterControllersFromDefaults(defaults = null) {
    this.METRICS.forEach((metric) => {
      const hasTarget =
        this[
          `has${
            metric.target.charAt(0).toUpperCase() + metric.target.slice(1)
          }Target`
        ];
      if (!hasTarget) return;

      const target = this[`${metric.target}Target`];
      if (!target) return;

      const value =
        defaults?.[metric.key] ??
        parseFloat(target.getAttribute("data-counter-target-value"));
      this.updateCounter(target, value);
    });
  }

  updateCounter(target, defaultValue = null) {
    if (!target) return;

    const attributeValue = target.getAttribute("data-counter-target-value");
    if (
      attributeValue === null &&
      defaultValue != null &&
      !isNaN(defaultValue)
    ) {
      target.setAttribute("data-counter-target-value", defaultValue.toString());
    }

    const counterController =
      this.application.getControllerForElementAndIdentifier(target, "counter");
    if (!counterController) return;

    const value = this.extractCounterValue(defaultValue, attributeValue);
    if (value != null && !isNaN(value)) {
      counterController.targetValue = value;
      counterController.animateCounter?.();
    }
  }

  extractCounterValue(defaultValue, attributeValue) {
    if (defaultValue != null && !isNaN(defaultValue)) {
      return defaultValue;
    }
    if (attributeValue != null) {
      const parsed = parseFloat(attributeValue);
      return !isNaN(parsed) ? parsed : null;
    }
    return null;
  }

  updateStats(data) {
    this.METRICS.forEach((metric) => {
      const hasTarget =
        this[
          `has${
            metric.target.charAt(0).toUpperCase() + metric.target.slice(1)
          }Target`
        ];
      if (!hasTarget) return;

      const target = this[`${metric.target}Target`];
      if (!target) return;

      const counterController =
        this.application.getControllerForElementAndIdentifier(
          target,
          "counter"
        );
      if (!counterController) return;

      const value = metric.getValue ? metric.getValue(data) : data[metric.key];
      counterController.targetValue = value;
      counterController.animateCounter();
    });

    if (this.hasCountriesListTarget && data.countries?.list) {
      this.allCountries = data.countries.list;
      this.totalUsers = data.active_users;
      this.renderCountries();
    }
  }

  renderCountries() {
    if (!this.hasCountriesListTarget || this.allCountries.length === 0) return;

    const countriesToShow = this.expanded
      ? this.allCountries
      : this.allCountries.slice(0, 6);
    this.updateCountriesList(countriesToShow, this.totalUsers);
  }

  updateCountriesList(countries, totalUsers) {
    const countryMap = {
      "United States": { code: "us", color: "primary" },
      "United Kingdom": { code: "gb", color: "success" },
      India: { code: "in", color: "info" },
      Canada: { code: "ca", color: "warning" },
      Australia: { code: "au", color: "danger" },
      Germany: { code: "de", color: "primary" },
      Brazil: { code: "br", color: "success" },
      France: { code: "fr", color: "info" },
      Netherlands: { code: "nl", color: "warning" },
      Spain: { code: "es", color: "danger" },
    };

    const colors = [
      "primary",
      "success",
      "info",
      "warning",
      "danger",
      "secondary",
    ];

    const html = countries
      .map((country, index) => {
        const countryInfo = countryMap[country.name] || {
          code: this.getCountryCode(country.name),
          color: colors[index % colors.length],
        };
        const percentage =
          totalUsers > 0
            ? ((country.users / totalUsers) * 100).toFixed(1)
            : "0.0";

        return `
          <div class="col-md-6">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="d-flex align-items-center">
                <span class="fi fi-${countryInfo.code} rounded me-2" style="font-size: 1.25rem;"></span>
                <span class="fw-semibold">${country.name}</span>
              </div>
              <span class="text-${countryInfo.color} fw-semibold">${country.users}</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar bg-${countryInfo.color}" role="progressbar"
                   style="width: ${percentage}%"
                   aria-valuenow="${country.users}"
                   aria-valuemin="0"
                   aria-valuemax="${totalUsers}"></div>
            </div>
          </div>
        `;
      })
      .join("");

    this.countriesListTarget.innerHTML = html;
  }

  getCountryCode(countryName) {
    const code = countries.getAlpha2Code(countryName, "en");
    return code ? code.toLowerCase() : "xx";
  }
}

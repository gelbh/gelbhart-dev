import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="analytics-stats"
export default class extends Controller {
  static targets = [
    "activeUsers",
    "pageViews",
    "installCount",
    "countries",
    "engagementRate",
    "countriesList",
    "expandButton"
  ]

  static values = {
    apiUrl: { type: String, default: '/api/analytics/hevy-tracker' }
  }

  connect() {
    this.expanded = false
    this.allCountries = []
    this.totalUsers = 0
    this.fetchStats()
  }

  toggleCountries() {
    this.expanded = !this.expanded
    this.renderCountries()

    if (this.hasExpandButtonTarget) {
      this.expandButtonTarget.innerHTML = this.expanded
        ? '<i class="bx bx-chevron-up me-1"></i>Show Less'
        : '<i class="bx bx-chevron-down me-1"></i>Show All Countries'
    }
  }

  async fetchStats() {
    try {
      const response = await fetch(this.apiUrlValue)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const data = await response.json()
      this.updateStats(data)
    } catch (error) {
      console.error('Analytics fetch error:', error)
      // Stats will show default values from the view
    }
  }

  updateStats(data) {
    // Update counter targets for animated numbers
    if (this.hasActiveUsersTarget) {
      const counterController = this.application.getControllerForElementAndIdentifier(
        this.activeUsersTarget,
        'counter'
      )
      if (counterController) {
        counterController.targetValue = data.active_users
        counterController.animateCounter()
      }
    }

    if (this.hasPageViewsTarget) {
      const counterController = this.application.getControllerForElementAndIdentifier(
        this.pageViewsTarget,
        'counter'
      )
      if (counterController) {
        counterController.targetValue = data.page_views
        counterController.animateCounter()
      }
    }

    if (this.hasInstallCountTarget) {
      const counterController = this.application.getControllerForElementAndIdentifier(
        this.installCountTarget,
        'counter'
      )
      if (counterController) {
        counterController.targetValue = data.install_count
        counterController.animateCounter()
      }
    }

    if (this.hasCountriesTarget) {
      const counterController = this.application.getControllerForElementAndIdentifier(
        this.countriesTarget,
        'counter'
      )
      if (counterController) {
        counterController.targetValue = data.countries.total
        counterController.animateCounter()
      }
    }

    // Update engagement rate (no animation, just value)
    if (this.hasEngagementRateTarget) {
      this.engagementRateTarget.textContent = `${data.engagement_rate}%`
    }

    // Store countries data and update list
    if (this.hasCountriesListTarget && data.countries.list) {
      this.allCountries = data.countries.list
      this.totalUsers = data.active_users
      this.renderCountries()
    }
  }

  renderCountries() {
    if (!this.hasCountriesListTarget || this.allCountries.length === 0) return

    const countriesToShow = this.expanded ? this.allCountries : this.allCountries.slice(0, 6)
    this.updateCountriesList(countriesToShow, this.totalUsers)
  }

  updateCountriesList(countries, totalUsers) {
    const countryMap = {
      'United States': { code: 'us', color: 'primary' },
      'United Kingdom': { code: 'gb', color: 'success' },
      'India': { code: 'in', color: 'info' },
      'Canada': { code: 'ca', color: 'warning' },
      'Australia': { code: 'au', color: 'danger' },
      'Germany': { code: 'de', color: 'primary' },
      'Brazil': { code: 'br', color: 'success' },
      'France': { code: 'fr', color: 'info' },
      'Netherlands': { code: 'nl', color: 'warning' },
      'Spain': { code: 'es', color: 'danger' }
    }

    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary']

    let html = ''
    countries.forEach((country, index) => {
      const countryInfo = countryMap[country.name] || {
        code: this.getCountryCode(country.name),
        color: colors[index % colors.length]
      }
      const percentage = ((country.users / totalUsers) * 100).toFixed(1)

      html += `
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
      `
    })

    this.countriesListTarget.innerHTML = html
  }

  getCountryCode(countryName) {
    // Map of common country names to ISO 2-letter codes
    const codes = {
      'United States': 'us', 'United Kingdom': 'gb', 'India': 'in',
      'Canada': 'ca', 'Australia': 'au', 'Germany': 'de', 'Brazil': 'br',
      'France': 'fr', 'Netherlands': 'nl', 'Spain': 'es', 'Italy': 'it',
      'Mexico': 'mx', 'Poland': 'pl', 'Sweden': 'se', 'Switzerland': 'ch',
      'Belgium': 'be', 'Austria': 'at', 'Norway': 'no', 'Denmark': 'dk',
      'Finland': 'fi', 'Ireland': 'ie', 'Portugal': 'pt', 'Greece': 'gr',
      'Czech Republic': 'cz', 'Romania': 'ro', 'Hungary': 'hu',
      'New Zealand': 'nz', 'Singapore': 'sg', 'Japan': 'jp', 'South Korea': 'kr',
      'China': 'cn', 'Hong Kong': 'hk', 'Taiwan': 'tw', 'Thailand': 'th',
      'Indonesia': 'id', 'Philippines': 'ph', 'Vietnam': 'vn', 'Malaysia': 'my',
      'South Africa': 'za', 'Egypt': 'eg', 'Nigeria': 'ng', 'Kenya': 'ke',
      'Argentina': 'ar', 'Chile': 'cl', 'Colombia': 'co', 'Peru': 'pe',
      'Israel': 'il', 'Turkey': 'tr', 'Saudi Arabia': 'sa', 'United Arab Emirates': 'ae',
      'Russia': 'ru', 'Ukraine': 'ua', 'Pakistan': 'pk', 'Bangladesh': 'bd'
    }
    return codes[countryName] || 'xx'
  }
}

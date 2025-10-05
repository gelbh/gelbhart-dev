import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="analytics-stats"
export default class extends Controller {
  static targets = [
    "activeUsers",
    "pageViews",
    "installCount",
    "countries",
    "engagementRate",
    "countriesList"
  ]

  static values = {
    apiUrl: { type: String, default: '/api/analytics/hevy-tracker' }
  }

  connect() {
    this.fetchStats()
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

    // Update countries list if we have the target
    if (this.hasCountriesListTarget && data.countries.list) {
      this.updateCountriesList(data.countries.list, data.active_users)
    }
  }

  updateCountriesList(countries, totalUsers) {
    const countryMap = {
      'United States': { code: 'us', color: 'primary' },
      'United Kingdom': { code: 'gb', color: 'success' },
      'India': { code: 'in', color: 'info' },
      'Canada': { code: 'ca', color: 'warning' },
      'Australia': { code: 'au', color: 'danger' },
      'Germany': { code: 'de', color: 'primary' }
    }

    const topCountries = countries.slice(0, 6)

    let html = ''
    topCountries.forEach(country => {
      const countryInfo = countryMap[country.name] || { code: 'xx', color: 'secondary' }
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
}

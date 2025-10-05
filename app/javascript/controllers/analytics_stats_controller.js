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

    // Scroll to top of countries section when collapsing
    if (!this.expanded) {
      const countriesSection = this.element.querySelector('.border-top.pt-4')
      if (countriesSection) {
        countriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
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
    // Comprehensive map of country names to ISO 3166-1 alpha-2 codes
    const codes = {
      // North America
      'United States': 'us', 'Canada': 'ca', 'Mexico': 'mx',
      'Guatemala': 'gt', 'Honduras': 'hn', 'El Salvador': 'sv',
      'Nicaragua': 'ni', 'Costa Rica': 'cr', 'Panama': 'pa',
      'Bahamas': 'bs', 'Cuba': 'cu', 'Jamaica': 'jm',
      'Haiti': 'ht', 'Dominican Republic': 'do', 'Puerto Rico': 'pr',
      'Trinidad and Tobago': 'tt', 'Barbados': 'bb', 'Grenada': 'gd',
      'Dominica': 'dm', 'Saint Lucia': 'lc', 'Antigua and Barbuda': 'ag',
      'Belize': 'bz', 'Bermuda': 'bm',

      // South America
      'Brazil': 'br', 'Argentina': 'ar', 'Chile': 'cl',
      'Colombia': 'co', 'Peru': 'pe', 'Venezuela': 've',
      'Ecuador': 'ec', 'Bolivia': 'bo', 'Paraguay': 'py',
      'Uruguay': 'uy', 'Guyana': 'gy', 'Suriname': 'sr',
      'French Guiana': 'gf',

      // Europe
      'United Kingdom': 'gb', 'Germany': 'de', 'France': 'fr',
      'Italy': 'it', 'Spain': 'es', 'Portugal': 'pt',
      'Netherlands': 'nl', 'Belgium': 'be', 'Switzerland': 'ch',
      'Austria': 'at', 'Sweden': 'se', 'Norway': 'no',
      'Denmark': 'dk', 'Finland': 'fi', 'Iceland': 'is',
      'Ireland': 'ie', 'Poland': 'pl', 'Czech Republic': 'cz',
      'Czechia': 'cz', 'Slovakia': 'sk', 'Hungary': 'hu',
      'Romania': 'ro', 'Bulgaria': 'bg', 'Greece': 'gr',
      'Croatia': 'hr', 'Serbia': 'rs', 'Slovenia': 'si',
      'Bosnia and Herzegovina': 'ba', 'Montenegro': 'me', 'North Macedonia': 'mk',
      'Albania': 'al', 'Kosovo': 'xk', 'Estonia': 'ee',
      'Latvia': 'lv', 'Lithuania': 'lt', 'Belarus': 'by',
      'Ukraine': 'ua', 'Moldova': 'md', 'Luxembourg': 'lu',
      'Monaco': 'mc', 'Liechtenstein': 'li', 'Malta': 'mt',
      'Cyprus': 'cy', 'Andorra': 'ad', 'San Marino': 'sm',
      'Vatican City': 'va',

      // Asia
      'China': 'cn', 'Japan': 'jp', 'South Korea': 'kr',
      'North Korea': 'kp', 'India': 'in', 'Pakistan': 'pk',
      'Bangladesh': 'bd', 'Sri Lanka': 'lk', 'Nepal': 'np',
      'Bhutan': 'bt', 'Maldives': 'mv', 'Afghanistan': 'af',
      'Iran': 'ir', 'Iraq': 'iq', 'Syria': 'sy',
      'Lebanon': 'lb', 'Jordan': 'jo', 'Israel': 'il',
      'Palestine': 'ps', 'Saudi Arabia': 'sa', 'Yemen': 'ye',
      'Oman': 'om', 'United Arab Emirates': 'ae', 'Qatar': 'qa',
      'Bahrain': 'bh', 'Kuwait': 'kw', 'Turkey': 'tr',
      'Armenia': 'am', 'Azerbaijan': 'az', 'Georgia': 'ge',
      'Kazakhstan': 'kz', 'Uzbekistan': 'uz', 'Turkmenistan': 'tm',
      'Kyrgyzstan': 'kg', 'Tajikistan': 'tj', 'Mongolia': 'mn',
      'Thailand': 'th', 'Vietnam': 'vn', 'Laos': 'la',
      'Cambodia': 'kh', 'Myanmar': 'mm', 'Malaysia': 'my',
      'Singapore': 'sg', 'Indonesia': 'id', 'Philippines': 'ph',
      'Brunei': 'bn', 'Timor-Leste': 'tl', 'Hong Kong': 'hk',
      'Macau': 'mo', 'Taiwan': 'tw',

      // Africa
      'South Africa': 'za', 'Egypt': 'eg', 'Nigeria': 'ng',
      'Kenya': 'ke', 'Ethiopia': 'et', 'Ghana': 'gh',
      'Tanzania': 'tz', 'Uganda': 'ug', 'Algeria': 'dz',
      'Morocco': 'ma', 'Tunisia': 'tn', 'Libya': 'ly',
      'Sudan': 'sd', 'South Sudan': 'ss', 'Somalia': 'so',
      'Eritrea': 'er', 'Djibouti': 'dj', 'Senegal': 'sn',
      'Mali': 'ml', 'Mauritania': 'mr', 'Niger': 'ne',
      'Chad': 'td', 'Burkina Faso': 'bf', 'Ivory Coast': 'ci',
      'Côte d\'Ivoire': 'ci', 'Cameroon': 'cm', 'Central African Republic': 'cf',
      'Congo': 'cg', 'Democratic Republic of the Congo': 'cd',
      'Gabon': 'ga', 'Equatorial Guinea': 'gq', 'Zambia': 'zm',
      'Zimbabwe': 'zw', 'Botswana': 'bw', 'Namibia': 'na',
      'Angola': 'ao', 'Mozambique': 'mz', 'Madagascar': 'mg',
      'Malawi': 'mw', 'Rwanda': 'rw', 'Burundi': 'bi',
      'Mauritius': 'mu', 'Seychelles': 'sc', 'Comoros': 'km',
      'Cape Verde': 'cv', 'São Tomé and Príncipe': 'st',
      'Benin': 'bj', 'Togo': 'tg', 'Sierra Leone': 'sl',
      'Liberia': 'lr', 'Guinea': 'gn', 'Guinea-Bissau': 'gw',
      'Gambia': 'gm', 'Lesotho': 'ls', 'Eswatini': 'sz',
      'Swaziland': 'sz',

      // Oceania
      'Australia': 'au', 'New Zealand': 'nz', 'Papua New Guinea': 'pg',
      'Fiji': 'fj', 'Solomon Islands': 'sb', 'Vanuatu': 'vu',
      'Samoa': 'ws', 'Kiribati': 'ki', 'Tonga': 'to',
      'Micronesia': 'fm', 'Palau': 'pw', 'Marshall Islands': 'mh',
      'Nauru': 'nr', 'Tuvalu': 'tv',

      // Russia & Former Soviet
      'Russia': 'ru', 'Russian Federation': 'ru'
    }

    return codes[countryName] || codes[countryName.toLowerCase()] || 'xx'
  }
}

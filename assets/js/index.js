
// console.log('linked')

$(document).ready(function () {
  $('.tabs').tabs();
});


/**
 * Defines an API that searches for cities based on name
 * https://wft-geo-db.p.rapidapi.com/v1/geo/cities
 */
export const GeoApi = {
  params: { sort: '-population', limit: 10 },
  getParams: function () {
    return Object.entries(this.params).map(([key, val]) => `${key}=${val}`).join('&')
  },
  fetchOptions: {
    headers: {
      'X-RapidAPI-Key': '06360e6be9msha9eb1136e2ae6afp1680b5jsn2f79a3fd3619',
      'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
    }
  },
  results: [],
  current: null,
  get currentCity() {
    return this.current
  },
  set currentCity(city) {
    this.cacheToLocal(city)
    this.current = city
  },
  search: async function (string) {
    try {
      if (!string) throw { error: 'Search term required' }
      const res = await fetch(`https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${string}&${this.getParams()}`, this.fetchOptions)
      const { data } = await res.json()
      this.results = data
      console.log(this, this.results)
    } catch (err) {
      console.log(err)
      return { error: err }
    }
  },
  /** This should be updated on the `keyup` event of the search bar */
  searchTerm: '',
  handleSearch: async function (ev) {
    if (ev) ev.preventDefault()
    if (!GeoApi.searchTerm) throw { error: 'Search term required' }
    await GeoApi.search(GeoApi.searchTerm)
    GeoApi.renderResults()
  },
  get cache() {
    let stored = localStorage.getItem('GeoApiCache')
    if (!stored) return []
    else return JSON.parse(stored)
  },
  set cache(cities) {
    localStorage.setItem('GeoApiCache', JSON.stringify(cities))
  },
  cacheToLocal: function (city) {
    let stored = this.cache.filter(cached => cached.id !== city.id)
    stored.unshift(city)
    this.cache = stored
  },
  findById: function (id) {
    let stored = this.cache
    return stored.find(cached => cached.id === id)
  },
  renderResults: function () {
    let collectionEl = $('#searchByName').find('.collection').html('')
    for (let city of this.results) {
      /** Render an HTMLElement for each result 
       * Store `city` as data on the HTMLElement
       * Attach `CostApi.getCityData(city)` as a click event listener
      */
      let { city: name, region, country, countryCode } = city
      $(`<a class='collection-item' href="#">${name}, ${region}, ${countryCode === 'US' ? countryCode : country}</a>`)
        .appendTo(collectionEl)
        .on('click', async (ev) => {
          ev.preventDefault()
          let costData = await CostApi.getCityData(city)
          if (costData.error) {
            // TODO: ERROR HANDLING
          } else {
            localStorage.setItem('city_id', costData.city_id)
            document.location.href = 'results.html'
          }
        })
    }
  }
}

$('#search').on('keyup', function () { GeoApi.searchTerm = this.value })
$('#searchByName').find('form').on('submit', GeoApi.handleSearch)

/**
 * Defines an API that retrieves prices for more than 60 goods and services for more than 8000 cities
 * https://rapidapi.com/traveltables/api/cost-of-living-and-prices/
 */
export const CostApi = {
  fetchOptions: {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': '06360e6be9msha9eb1136e2ae6afp1680b5jsn2f79a3fd3619',
      'X-RapidAPI-Host': 'cost-of-living-and-prices.p.rapidapi.com'
    }
  },
  current: null,
  get currentCity() {
    return this.current
  },
  set currentCity(city) {
    this.current = city
    this.cacheToLocal(city)
    this.updateCategories()
  },
  /**
   * Searches for cost data based on `cityGeoDb` which must include a `id` attribute, `city` attribute, and `country` attribute
   * @param {object} cityGeoDb a response object from the GeoApi
   * @returns combined geo and cost data
   */
  getCityData: async function (cityGeoDb) {
    GeoApi.currentCity = cityGeoDb
    let { id, city, country } = cityGeoDb
    let stored = this.cache.find(city => city.geo_id === id)
    if (stored) {
      this.currentCity = stored
      return stored
    }
    if (country === 'United States of America') country = 'United States'
    try {
      if (!city || !country) throw { error: 'City and country required' }
      const response = await fetch(`https://cost-of-living-and-prices.p.rapidapi.com/prices?city_name=${city}&country_name=${country}`, this.fetchOptions)
      const data = await response.json()
      if (data.error) throw data
      data.geo_id = cityGeoDb.id
      this.currentCity = data
      return data
    } catch (error) {
      console.error(error)
      return { error }
    }
  },
  categories: [],
  updateCategories: function () {
    this.categories = []
    if (this.currentCity.prices) {
      this.currentCity.prices.forEach(({ category_name, category_id }) => {
        if (!this.categories.find(cat => category_id === cat.category_id)) this.categories.push({ category_name, category_id })
      })
    }
  },
  get cache() {
    let stored = localStorage.getItem('CostApiCache')
    if (!stored) return []
    else return JSON.parse(stored)
  },
  set cache(cities) {
    localStorage.setItem('CostApiCache', JSON.stringify(cities))
  },
  cacheToLocal: function (city) {
    let stored = this.cache.filter(cached => cached.city_id !== city.city_id)
    stored.unshift(city)
    this.cache = stored
  },
  findById: function (city_id) {
    let stored = this.cache
    return stored.find(cached => cached.city_id === city_id)
  },
  renderCityCosts: function (costData) {
    /** Render elements related to city
     * Display main demographic data 
     * Display 'category' or 'goods' cards as well
     */
    // console.log(this)
    if (!costData) costData = this.currentCity
    let geoData = GeoApi.findById(costData.geo_id)
    console.log('Available For Rendering', { costData, geoData })
    console.log('Sample Price Data', costData.prices[0])
    console.log('Sample Category', this.categories[0])
  }
}



/**
 * Not intended for production, just a demonstration of the API
 */
async function demo() {
  /**
   * TODO: Attach an event listener to the search bar and update `GeoApi.searchTerm` on `keyup`
   */
  GeoApi.searchTerm = 'atlanta'
  /**
   * TODO: Update `GeoApi.renderResults` function which is called within `GeoApi.handleSearch`
   */
  await GeoApi.handleSearch()

  console.log('DEMO GEO RESULTS', GeoApi.searchTerm, GeoApi.results)

  /**
   * In this demo, GeoApi results are looped over in lieu of the user clicking a city 
   */
  let data = {}
  for (let city of GeoApi.results) {
    data = await CostApi.getCityData(city)
    if (!data.error) break
  }
  console.log('DEMO COST DATA', data)
  if (data.error) throw { error: 'No cities found' }
  else CostApi.renderCityCosts()
}


// RUN DEMO
// demo()

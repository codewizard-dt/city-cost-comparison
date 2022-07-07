/**
 * Defines an API that searches for cities based on name
 * https://wft-geo-db.p.rapidapi.com/v1/geo/cities
 */
const GeoApi = {
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
    } catch (err) {
      console.log(err)
      return { error: err }
    }
  },
  /** This should be updated on the `keyup` event of the search bar */
  searchTerm: '',
  handleSearch: async function (ev) {
    if (ev) ev.preventDefault()
    if (!this.searchTerm) throw { error: 'Search term required' }
    await GeoApi.search(this.searchTerm)
    this.renderResults()
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
    console.log('RENDER GEO RESULTS HERE')
    for (let city of this.results) {
      /** Render an HTMLElement for each result 
       * Store `city` as data on the HTMLElement
       * Attach `CostApi.getCityData(city)` as a click event listener
      */
    }
  }
}

/**
 * Defines an API that retrieves prices for more than 60 goods and services for more than 8000 cities
 * https://rapidapi.com/traveltables/api/cost-of-living-and-prices/
 */
const CostApi = {
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
      console.log('got from cache', stored)
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
  renderCityCosts: function (costData) {
    /** Render elements related to city
     * Display main demographic data 
     * Display 'category' or 'goods' cards as well
     */
    console.log(this)
    // if (!costData) costData = this.currentCity
    // let geoData = GeoApi.findById(costData.geo_id)
    // console.log({costData,geoData})
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

  console.log('GEO RESULTS', GeoApi.results)
  let data = {}
  for (let city of GeoApi.results) {
    data = await CostApi.getCityData(city)
    if (!data.error) break
  }
  console.log('COST DATA', data)
  if (data.error) throw { error: 'No cities found' }
  else CostApi.renderCityCosts()
}

demo()
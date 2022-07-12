/**
 * jQuery event listener that is called when the DOM is fully loaded
 */
$(document).ready(function () {
  /**
   * Initializes all `Materialize` components
   */
  $('.tabs').tabs();
  $('.carousel.carousel-slider').carousel({
    fullWidth: true,
    indicators: true
  });

  /**
   * Checks cache and loads recently searched cities
   */
  GeoApi.renderCachedResults()
  CostApi.fetchCityList().then(() => CostApi.loading = false)
});


/**
 * Defines an API that searches for cities based on name
 * https://wft-geo-db.p.rapidapi.com/v1/geo/cities
 */
const GeoApi = {
  /** Default parameters for search */
  params: { sort: '-population', limit: 10 },
  /** Merges params with defaults and stringifies */
  getParams: function (params = {}) {
    return Object.entries({ ...this.params, ...params }).map(([key, val]) => {
      return key === 'location'
        ? `location=${GeoApi.locationParam(val)}` : `${key}=${val}`
    }).join('&')
  },
  /** Handles location parameter since it is a special case */
  locationParam: function ({ lat, lng }) {
    return `${lat < 0 ? '' : '%2B'}${lat}${lng < 0 ? '' : '%2B'}${lng}`
  },
  /** Default fetch options for search */
  fetchOptions: {
    headers: {
      'X-RapidAPI-Key': '125fc260f4mshd4fee63046143a4p123388jsn99b684846699',
      'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
    }
  },
  /** Stores search results */
  results: [],
  /** Current city */
  current: null,
  get currentCity() {
    return this.current
  },
  /** Sets GeoApi.current and caches */
  set currentCity(city) {
    this.cacheToLocal(city)
    this.current = city
  },
  /**
   * Fetches data from the api
   * @param {string} string city name search term
   * @param {object} params additional parameters for search
   * @returns an array of results
   */
  search: async function (string, params) {
    try {
      if (!string) throw { error: 'Search term required' }
      const res = await fetch(`https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${string}&${this.getParams(params)}`, this.fetchOptions)
      const { data } = await res.json()
      if (params === undefined) this.results = data
      // console.log(this, this.results)
      return data
    } catch (err) {
      console.log(err)
      return { error: err }
    }
  },
  /** This value is bound the search bar via `keyup` events */
  searchTerm: '',
  /**
   * Handles submission of the form containing the search bar
   * @param {*} ev form submission event
   */
  handleSearch: async function (ev) {
    if (ev) ev.preventDefault()
    if (!GeoApi.searchTerm) throw { error: 'Search term required' }
    await GeoApi.search(GeoApi.searchTerm)
    GeoApi.renderSearchResults()
  },
  /** Checks local storage for cache or returns an empty array */
  get cache() {
    let stored = localStorage.getItem('GeoApiCache')
    if (!stored) return []
    else return JSON.parse(stored)
  },
  /** Saves cities to local storage */
  set cache(cities) {
    localStorage.setItem('GeoApiCache', JSON.stringify(cities))
  },
  /**
   * Saves a city to local storage and moves it to the most recent position
   * @param {object} city the city to be saved
   */
  cacheToLocal: function (city) {
    if (!city.name) throw { error: 'no city name', city }
    let stored = this.cache.filter(cached => cached.id !== city.id)
    stored.unshift(city)
    this.cache = stored
  },
  /**
   * Finds the city with the given ID from the cache
   * @param {*} id city id from the GeoApi
   * @returns a city object or undefined
   */
  findById: function (id) {
    let stored = this.cache
    return stored.find(cached => cached.id == id)
  },
  /** Element containing the collection */
  resultsEl: $('#resultsPanel'),
  /** Collection element */
  collectionEl: $('#searchByName').find('.collection'),
  /** Renders a collection item for the given city in the `collectionEl` */
  renderCollectionItem: function (city) {
    /** Render an HTMLElement for each result 
     * Attach `CostApi.getDataByGeoDb(city)` as a click event listener
    */
    let { city: name, region, country, countryCode } = city
    $(`<a class='collection-item' href="#">${name}, ${region}, ${countryCode === 'US' ? countryCode : country}</a>`)
      .appendTo(GeoApi.collectionEl)
      .on('click', async (ev) => {
        /** Handles click event of `.collection-item` */
        ev.preventDefault()
        let costData = await CostApi.getDataByGeoDb(city)
        if (costData.error) {
          // TODO: ERROR HANDLING
        } else {
          let url = document.location.href
          /** Saves the city_id as its own variable so we can retrieve the current city from the cache on other pages */
          localStorage.setItem('city_id', costData.city_id)
          /** Directs user to `results.html` if they are not already on the page */
          if (!url.includes('results.html')) document.location.href = 'results.html'
          else if (typeof setCity !== 'undefined') setCity(costData.city_id, true)
        }
      })
  },
  /** Renders all the current search results as `.collection-item`s */
  renderSearchResults: function () {
    GeoApi.resultsEl.show()
    GeoApi.collectionEl.html('')
    for (let city of this.results) {
      this.renderCollectionItem(city)
    }
  },
  /** Specifically renders the 10 most recent cached cities */
  renderCachedResults: function () {
    let cachedResults = this.cache.slice(0, 10)
    GeoApi.collectionEl.html('')
    for (let city of cachedResults) {
      this.renderCollectionItem(city)
    }
    if (document.location.href.includes('results.html')) {
      let active = GeoApi.collectionEl.children('.collection-item').first().addClass('active')
      $('#search').val(active.text())
    }

  },
  /** Retrieves the user's current location as `{lat,lng}` from local storage or returns null */
  get currentLocation() {
    let stored = localStorage.getItem('currentLocation')
    return stored ? JSON.parse(stored) : null
  },
  /** Handles the click event of the tab `Search by Map` */
  renderCurrentLocationMap: function (map) {
    /** Checks if the user's system has geolocation enabled */
    if (navigator.geolocation) {
      if (GeoApi.currentLocation) {
        /** Renders the map with the location from storage */
        MapApi.renderMap(document.getElementById('searchByMap'), GeoApi.currentLocation, { position: GeoApi.currentLocation, title: 'Your Location' })
        MapApi.renderNearbyCities()
      } else {
        /** Asks the user for access to their location and renders the map */
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            localStorage.setItem('currentLocation', JSON.stringify(pos))
            MapApi.renderMap(document.getElementById('searchByMap'), GeoApi.currentLocation, { position: GeoApi.currentLocation, title: 'Your Location' })
            MapApi.renderNearbyCities()
          },
          () => {
            console.log('error')
          }
        );
      }
    } else {
      // Browser doesn't support Geolocation
      console.error({ error: `Browser doesn't support Geolocation` })
    }

  },
}

/**
 * Defines an API that retrieves prices for more than 60 goods and services for more than 8000 cities
 * https://rapidapi.com/traveltables/api/cost-of-living-and-prices/
 */
const CostApi = {
  loading: true,
  /** Default fetch options for the api search query */
  fetchOptions: {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': '06360e6be9msha9eb1136e2ae6afp1680b5jsn2f79a3fd3619',
      'X-RapidAPI-Host': 'cost-of-living-and-prices.p.rapidapi.com'
    }
  },
  /** Current city for the CostApi */
  current: null,
  get currentCity() {
    return this.current
  },
  /** Sets `CostApi.current` and save the city to the local storage cache */
  set currentCity(city) {
    this.current = city
    this.cacheToLocal(city)
    /** Maintains an up to date list of cost of living categories */
    this.updateCategories()
  },
  /**
   * Searches for cost data based on `cityGeoDb` which must include a `id` attribute, `city` attribute, and `country` attribute
   * @param {object} cityGeoDb a response object from the GeoApi
   * @returns combined geo and cost data
   */
  getDataByGeoDb: async function (cityGeoDb) {
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
  /**
   * Uses the `city_id` to find the `city_name` from the cache and searches based on name and location
   * @param {*} city_id a city ID from the CostApi
   * @returns a city or an error
   */
  getDataById: async function (city_id) {
    try {
      if (!city_id) throw { error: 'city_id required' }
      const response = await fetch(`https://cost-of-living-and-prices.p.rapidapi.com/prices?city_id=${city_id}`, this.fetchOptions)
      const data = await response.json()
      if (data.error) throw data
      let { lat, lng } = CostApi.cityList.find(({ city_id }) => data.city_id == city_id)
      let geoData = await GeoApi.search(data.city_name, { type: "CITY", location: { lat: lat, lng: lng } })
      let closest = geoData.sort((a, b) => a.distance - b.distance)[0]
      /** Sets GeoApi city and saves to cache */
      GeoApi.currentCity = closest
      /** Adds the GeoApi city ID in the CostApi cache record */
      data.geo_id = closest.id
      /** Sets CostApi city and saves to cache */
      this.currentCity = data
      return data
    } catch (error) {
      console.error(error)
      return { error }
    }

  },
  /** Current list of cost of living categories */
  categories: [],
  /** Updates category list based on current city data */
  updateCategories: function () {
    this.categories = []
    if (this.currentCity.prices) {
      this.currentCity.prices.forEach(({ category_name, category_id }) => {
        if (!this.categories.find(cat => category_id === cat.category_id)) this.categories.push({ category_name, category_id })
      })
    }
  },
  /** List of all cities with cost of living data */
  cityList: [],
  /** Fetches list of all cities from storage or from the api */
  fetchCityList: async function () {
    let storedList = localStorage.getItem('CostApiCities')
    if (storedList) this.cityList = JSON.parse(storedList)
    else {
      try {
        const response = await fetch('https://cost-of-living-and-prices.p.rapidapi.com/cities', this.fetchOptions)
        const data = await response.json()
        if (data.error) throw data
        this.cityList = data.cities
        /** Saves city list to cache on success */
        localStorage.setItem('CostApiCities', JSON.stringify(this.cityList))
      } catch (error) {
        console.log(error)
      }
    }
  },
  /** Retrieves cache or returns an empty array */
  get cache() {
    let stored = localStorage.getItem('CostApiCache')
    if (!stored) return []
    else return JSON.parse(stored)
  },
  /** Saves all cities to local storage cache */
  set cache(cities) {
    localStorage.setItem('CostApiCache', JSON.stringify(cities))
  },
  /** Saves the city to local storage cache and moves it to the most recent position */
  cacheToLocal: function (city) {
    let stored = this.cache.filter(cached => cached.city_id !== city.city_id)
    stored.unshift(city)
    this.cache = stored
  },
  /** Retrieves the city from the cache or fetches from the API if not found */
  findById: async function (city_id) {
    let stored = this.cache
    let city = stored.find(cached => cached.city_id == city_id)
    if (!city) city = await CostApi.getDataById(city_id)
    return city
  },
  /** Renders list of prices grouped by category */
  renderCityCosts: function (city) {
    /** Render elements related to city
     * Display main demographic data 
     * Display 'category' or 'goods' cards as well
     */
    if (city) {
      this.renderAllCarousels(this.getCostsByCategory(city))
    } else {
      this.renderAllCarousels()
    }
  },
  /** Takes the list of prices from the city data and returns chunks by category */
  getCostsByCategory: function (city) {
    if (!city) city = this.currentCity
    const costs = {}
    const { prices } = city
    for (let price of prices) {
      if (!costs[price.category_name]) costs[price.category_name] = []
      costs[price.category_name].push(price)
    }
    return costs
  },
  /** Uses `Intl.NumberFormat` to correctly display any number */
  formatCost: function (cost, measure, currency, usd) {
    if (measure === 'currency' || measure === 'money') {
      let value = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cost)
      if (currency === 'USD' || !usd) return value
      else return value + ' (' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd) + ')'
    } else if (measure === 'money') return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cost)
    else if (measure === 'percent') return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(cost / 100)
    else throw { error: 'measure not found', measure }
  },
  /**
   * 
   * @param {array} prices complete list of prices for one category for one city
   * @param {string} category_name name of the category
   * @param {*} options 
   */
  renderCarousel: function (prices, category_name, options = {}) {
    /** List of possible carousel colors */
    const colors = ['red', 'blue', 'amber', 'green']
    /** Carousel container element */
    const carouselContainerEl = $('.carousel-info')
    /** Returns the color based on the position of the carousel and the position of the price within the category */
    const getColor = (el) => {
      let carouselIndex = $('.carousel-info').children().length, itemIndex = el.children().length
      return colors[(carouselIndex + itemIndex) % colors.length]
    }
    if (!prices) {
      /** Renders the categories for the current city only */
      this.renderAllCarousels()
    } else {
      /** Adds a new carousel for this category */
      const carouselEl = $(`<div id="${category_name.replace(/[^a-zA-Z]/g, '')}" class="carousel carousel-slider center"></div>`).appendTo(carouselContainerEl)
      for (let item of prices) {
        /** Adds a new `.carousel-item` for each price within the category */
        let { item_name, avg, min, max, usd = {}, measure, currency_code } = item
        carouselEl.append(`<div class="carousel-item ${getColor(carouselEl)} white-text" href="#one!">
          <h2>${category_name}</h2>
          <h4>${item_name}</h4>
          <p class="white-text">Currency: ${currency_code}</p>
          <p class="white-text">Average: ${CostApi.formatCost(avg, measure, currency_code, usd.avg)}</p>
          <p class="white-text">Minimum: ${CostApi.formatCost(min, measure, currency_code, usd.min)}</p>
          <p class="white-text">Maximum: ${CostApi.formatCost(max, measure, currency_code, usd.max)}</p>
       `)
      }
    }
  },
  /** Clears the carousel container and adds all new carousels */
  renderAllCarousels: function (categories) {
    if (!categories) categories = this.getCostsByCategory()
    $('.carousel-info').html('')

    /** Accesses the category_name and array of items  */
    for (let [name, items] of Object.entries(categories)) {
      this.renderCarousel(items, name)
    }
    /** Initializes all the new carousels */
    $('.carousel.carousel-slider').carousel({
      fullWidth: true,
      indicators: true
    });
  }
}

/**
 * Defines an API for Google Maps
 */
const MapApi = {
  /** HTML element that will render any map */
  mapEl: document.getElementById('CityMap'),
  /** google.maps.Map instance */
  map: null,
  /** list of all the markers on the map */
  markers: [],
  /**
   * Creates a new map on the page using Google Maps Api
   * @param {*} mapEl HTML element
   * @param {*} center latitude and longitude 
   * @param {*} markers locations on the map
   * @returns void
   */
  renderMap: function (mapEl, center, markers = []) {
    if (typeof google === 'undefined') {
      /** Delays rendering if `google` api is not initialized from the `script` */
      setTimeout(() => { MapApi.renderMap(mapEl, center, markers) }, 500)
      return
    }
    /** Reassigns the HTML element */
    MapApi.mapEl = mapEl
    /** Creates a new `google.maps.Map` instance */
    MapApi.map = new google.maps.Map(MapApi.mapEl, {
      zoom: 5,
      center
    });
    /** Type checks markers and creates an array if necessary */
    if (!Array.isArray(markers)) markers = [markers]
    /** Retrieves the `city_id` from the current city if it exists */
    let { city_id } = CostApi.currentCity || {}
    for (let marker of markers) {
      /** Creates a marker on the map for the current city */
      MapApi.createMarker({ ...marker, city_id })
    }
  },
  /**
   * Creates a new marker on the map
   * @param {object} param0 `google.maps.MarkerOptions` object
   */
  createMarker: function ({ position: { lat, lng }, city_id, ...options }) {
    let marker = new google.maps.Marker({
      position: { lat, lng },
      map: MapApi.map,
      animation: google.maps.Animation.DROP,
      ...options
    })
    /** Handles marker click event, loads cost of living data, and redirects to `results.html` if not already on the page */
    marker.addListener('click', async () => {
      let city = await CostApi.findById(city_id)
      let url = document.location.href
      localStorage.setItem('city_id', city_id)
      if (!url.includes('results.html')) document.location.href = 'results.html'
      else if (typeof setCity !== 'undefined') setCity(city_id, true)
    })
    /** Styles the hover events */
    marker.addListener('mouseover', function () { this.setOpacity(1) })
    marker.addListener('mouseout', function () { if (city_id && CostApi.currentCity.city_id != city_id) this.setOpacity(0.5) })
    /** Adds the new marker to the array of map markers */
    MapApi.markers.unshift(marker)
  },
  /** Randomly selects 5 cities from the `CostApi.cityList` that are within the bounds of the map and renders markers for them */
  renderNearbyCities: async function () {
    const bounds = MapApi.map.getBounds()
    if (!bounds) {
      /** Delays the rendering if the map is not loaded yet */
      setTimeout(MapApi.renderNearbyCities, 500)
    } else {
      /** Filters out any cities outside the latitude and longitude of the map */
      const cities = CostApi.cityList.filter(({ lat, lng }) => bounds.contains({ lat, lng }))
      for (let i = 0; i < 5; i++) {
        /** Staggers the rendering of the markers for animation effect */
        setTimeout(() => {
          const { lat, lng, city_name, country_name, city_id } = cities.splice(Math.floor(Math.random() * cities.length), 1)[0]
          MapApi.createMarker({ position: { lat, lng }, city_id, opacity: 0.5, zIndex: 0, title: `${city_name}, ${country_name}` })
        }, i * 200)
      }
    }

  }
}

/**
 * Retrieves all data from both APIs
 * @returns combined data from both `CostApi` and `GeoApi` for the current city
 */
function getCombinedCityData() {
  return { ...CostApi.currentCity, geo: GeoApi.currentCity }
}

/**
 * EVENT LISTENERS FOR CITY SEARCH BAR AND FORM SUBMISSION
 */
$('#search').on('keyup', function () { GeoApi.searchTerm = this.value })
  .on('blur', function () {
    /** Hides the Results Panel when the user clicks out of the Search bar, only when not in an `aside` */
    if ($(this).parents('aside').length === 0) GeoApi.resultsEl.fadeOut()
  })
  .on('focus', function () {
    /** Shows the Results Panel when user clicks on the Search bar, only if there are items in the collection */
    if (GeoApi.collectionEl.find('.collection-item').length) GeoApi.resultsEl.fadeIn()
  })
$('#searchByName').find('form').on('submit', GeoApi.handleSearch)
/** Handles the `click` event for the tab that targets `#searchByMap` */
$('a[href="#searchByMap"]').on('click', () => { GeoApi.renderCurrentLocationMap() })

/** Defines generic callback for Google Maps API */
window.mapInit = () => { }

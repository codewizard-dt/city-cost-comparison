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
  params: { sort: '-population', limit: 10 },
  getParams: function () {
    return Object.entries(this.params).map(([key, val]) => `${key}=${val}`).join('&')
  },
  fetchOptions: {
    headers: {
      'X-RapidAPI-Key': '125fc260f4mshd4fee63046143a4p123388jsn99b684846699',
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
      return data
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
    GeoApi.renderSearchResults()
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
    if (!city.name) throw { error: 'no city name', city }
    let stored = this.cache.filter(cached => cached.id !== city.id)
    stored.unshift(city)
    this.cache = stored
  },
  findById: function (id) {
    let stored = this.cache
    return stored.find(cached => cached.id === id)
  },
  resultsEl: $('#resultsPanel'),
  collectionEl: $('#searchByName').find('.collection'),
  renderCollectionItem: function (city) {
    /** Render an HTMLElement for each result 
     * Store `city` as data on the HTMLElement
     * Attach `CostApi.getCityData(city)` as a click event listener
    */
    let { city: name, region, country, countryCode } = city
    $(`<a class='collection-item' href="#">${name}, ${region}, ${countryCode === 'US' ? countryCode : country}</a>`)
      .appendTo(GeoApi.collectionEl)
      .on('click', async (ev) => {
        ev.preventDefault()
        let costData = await CostApi.getCityData(city)
        if (costData.error) {
          // TODO: ERROR HANDLING
        } else {
          let url = document.location.href
          localStorage.setItem('city_id', costData.city_id)
          if (!url.includes('results.html')) document.location.href = 'results.html'
          else if (typeof setCity !== 'undefined') setCity(costData.city_id, true)
        }
      })
  },
  renderSearchResults: function () {
    GeoApi.resultsEl.show()
    GeoApi.collectionEl.html('')
    for (let city of this.results) {
      this.renderCollectionItem(city)
    }
  },
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
  get currentLocation() {
    let stored = localStorage.getItem('currentLocation')
    return stored ? JSON.parse(stored) : null
  },
  renderCurrentLocationMap: function (map) {
    if (navigator.geolocation) {
      if (GeoApi.currentLocation) {
        MapApi.renderMap(document.getElementById('searchByMap'), GeoApi.currentLocation, { position: GeoApi.currentLocation, title: 'Your Location' })
        MapApi.renderNearbyCities()
      } else {
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
  // get nearbyCities() {
  //   console.log(CostApi.cityList)
  // }
}

/**
 * Defines an API that retrieves prices for more than 60 goods and services for more than 8000 cities
 * https://rapidapi.com/traveltables/api/cost-of-living-and-prices/
 */
const CostApi = {
  loading: true,
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
  cityList: [],
  fetchCityList: async function () {
    let storedList = localStorage.getItem('CostApiCities')
    if (storedList) this.cityList = JSON.parse(storedList)
    else {
      try {
        const response = await fetch('https://cost-of-living-and-prices.p.rapidapi.com/cities', this.fetchOptions)
        const data = await response.json()
        if (data.error) throw data
        this.cityList = data.cities
        localStorage.setItem('CostApiCities', JSON.stringify(this.cityList))
      } catch (error) {
        console.log(error)
      }
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
    return stored.find(cached => cached.city_id == city_id)
  },
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
  formatCost: function (cost, measure, currency, usd) {
    if (measure === 'currency' || measure === 'money') {
      let value = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cost)
      if (currency === 'USD' || !usd) return value
      else return value + ' (' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd) + ')'
    } else if (measure === 'money') return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cost)
    else if (measure === 'percent') return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(cost / 100)
    else throw { error: 'measure not found', measure }
  },
  renderCarousel: function (prices, category_name, options = {}) {
    const colors = ['red', 'blue', 'amber', 'green']
    const carouselContainerEl = $('.carousel-info')
    const getColor = (el) => {
      let carouselIndex = $('.carousel-info').children().length, itemIndex = el.children().length
      return colors[(carouselIndex + itemIndex) % colors.length]
    }
    // const format = new Intl.NumberFormat({style:'currency',currency})
    // const formatCost = (cost, measure, currency = 'USD') => {
    //   console.log(currency)
    //   return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cost)
    // }
    if (!prices) {
      this.renderAllCarousels()
    } else {
      const carouselEl = $(`<div id="${category_name.replace(/[^a-zA-Z]/g, '')}" class="carousel carousel-slider center"></div>`).appendTo(carouselContainerEl)
      for (let item of prices) {
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
  renderAllCarousels: function (categories) {
    if (!categories) categories = this.getCostsByCategory()
    $('.carousel-info').html('')

    for (let [name, items] of Object.entries(categories)) {
      this.renderCarousel(items, name)
    }
    $('.carousel.carousel-slider').carousel({
      fullWidth: true,
      indicators: true
    });
  }
}

const MapApi = {
  apiKey: "AIzaSyBgXZVqpjEkbxWRkmEw4ukpqDjNFGYAxo0",
  mapEl: document.getElementById('CityMap'),
  map: null,
  markers: [],
  renderMap: function (mapEl, center, markers = []) {
    if (typeof google === 'undefined') return
    // console.trace()
    // console.log(mapEl, center, markers)
    MapApi.mapEl = mapEl
    MapApi.map = new google.maps.Map(MapApi.mapEl, {
      zoom: 5,
      center
    });
    if (!Array.isArray(markers)) markers = [markers]
    for (let marker of markers) {
      MapApi.createMarker(marker)
    }
  },
  createMarker: function ({ position: { lat, lng }, ...options }) {
    let marker = new google.maps.Marker({
      position: { lat, lng },
      map: MapApi.map,
      animation: google.maps.Animation.DROP,
      ...options
    })
    marker.addListener('click', () => {
      console.log(marker)
    })
    MapApi.markers.unshift(marker)
  },
  renderNearbyCities: async function () {
    const bounds = MapApi.map.getBounds()
    if (!bounds) {
      setTimeout(MapApi.renderNearbyCities, 500)
    } else {
      const cities = CostApi.cityList.filter(({ lat, lng }) => bounds.contains({ lat, lng }))
      for (let i = 0; i < 5; i++) {
        // for (let city of cities) {
        setTimeout(() => {
          console.log(i)
          const { lat, lng, city_name, country_name } = cities.splice(Math.floor(Math.random() * cities.length), 1)[0]
          MapApi.createMarker({ position: { lat, lng }, title: `${city_name},${country_name}` })
        }, i * 200)
      }
      console.log(bounds)
    }

  }
}

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
$('a[href="#searchByMap"]').on('click', () => { GeoApi.renderCurrentLocationMap() })

/**
 * Not intended for production, just a demonstration of the API
 */
async function demo() {
  /**
   * TODO: Attach an event listener to the search bar and update `GeoApi.searchTerm` on `keyup`
   */
  GeoApi.searchTerm = 'atlanta'
  /**
   * TODO: Update `GeoApi.renderSearchResults` function which is called within `GeoApi.handleSearch`
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

window.mapInit = () => { }
// RUN DEMO
// demo()


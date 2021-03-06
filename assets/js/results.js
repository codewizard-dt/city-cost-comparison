/**
 * jQuery event listener that is called when the DOM is fully loaded
 */

$(document).ready(function () {
  const stored_id = localStorage.getItem('city_id')
  if (stored_id) setCity(stored_id)
  $('#CityMapBtn').on('click', () => {
    setTimeout(MapApi.renderNearbyCities, 500)
  })
})

/** Sets the current city on the map on `results.html` */
async function setCity(city_id, renderCachedList = false) {
  CostApi.currentCity = await CostApi.findById(city_id)
  GeoApi.currentCity = GeoApi.findById(CostApi.currentCity.geo_id)
  loadCityInformation(getCombinedCityData())
  /** Checks for cached cities and renders `.collection-item`s in the `.searchPanel` */
  if (renderCachedList) GeoApi.renderCachedResults()
}

M.Tabs.getInstance(document.querySelector('.tabs')).select('CityInfo')

/** Displays all the demographic and cost of living data for the given city */
function loadCityInformation(city) {
  $('#ResultsHeader').text(`${city.city_name}, ${city.geo.region}, ${city.country_name}`)
  /** Renders the demographic information from `GeoApi` */
  renderCityInfo(city)
  /** Retrieves the latitude and longitude or uses 0,0 if it doesn't exist */
  const { latitude: lat, longitude: lng } = city.geo || { latitude: 0, longitude: 0 }
  /** Defines the `google.maps.MarkerOptions` for the given city */
  const marker = { position: { lat, lng }, title: `${city.city_name}, ${city.geo.region}, ${city.country_name}` }
  MapApi.renderMap(document.getElementById('CityMap'), { lat, lng }, [marker])
  MapApi.renderNearbyCities()
  /** Renders new carousels with the cost of living data from `CostApi` */
  CostApi.renderCarousels(city)
}

/** Uses the `GeoApi` city data to show demographic information and exchange rates */
function renderCityInfo(city) {
  let { city_name, country_name, exchange_rate, exchange_rates_updated: updated_on, geo } = city
  let { latitude, longitude, region, population, wikiDataId } = geo
  let currency = city.prices[0].currency_code
  const getRate = (cur) => CostApi.formatCost(exchange_rate[cur], 'currency', cur)
  const renderExchangeRate = (cur) => exchange_rate[cur] ? `<p><b>Exchange rate</b>: $1 USD = ${getRate(currency)}</p>` : ''
  $('#CityInfo').html(`
  <div class="data">
    <h2>${city_name}</h2>
    <h3>${region}, ${country_name}</h3>
    <p><b>Population</b>: ${new Intl.NumberFormat('en-US').format(population)}</p>
    <p><b>Location</b>: (${latitude},${longitude})</p>
    ${renderExchangeRate(currency)}
    <iframe src='https://www.wikidata.org/wiki/Special:EntityData/${wikiDataId}' width='100%' ></iframe>
  </div>
  `)
}
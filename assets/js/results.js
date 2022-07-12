
$(document).ready(function () {
  const stored_id = localStorage.getItem('city_id')
  if (stored_id) setCity(stored_id)
})

async function setCity(city_id, renderCachedList = false) {
  CostApi.currentCity = await CostApi.findById(city_id)
  GeoApi.currentCity = GeoApi.findById(CostApi.currentCity.geo_id)
  loadCityInformation(getCombinedCityData())
  if (renderCachedList) GeoApi.renderCachedResults()
}



function loadCityInformation(city) {
  $('#ResultsHeader').text(city.city_name)
  renderDemographics(city)
  console.log(city)
  // const city = getCombinedCityData()
  const { latitude: lat, longitude: lng } = city.geo || { latitude: 0, longitude: 0 }
  const marker = {position:{ lat, lng }, title: `${city.city_name}, ${city.geo.region}, ${city.country_name}` }
  MapApi.renderMap(document.getElementById('CityMap'), { lat, lng }, [marker])
  MapApi.renderNearbyCities()
  CostApi.renderCityCosts(city)
}

function renderDemographics(city) {
  let { city_name, country_name, exchange_rate, exchange_rates_updated: updated_on, geo } = city
  let { latitude, longitude, region, population } = geo
  $('#Demographics').html(`
    <h2>${city_name}</h2>
    <h3>${region}, ${country_name}</h3>
    <p><b>Population</b>: ${new Intl.NumberFormat('en-US').format(population)}</p>
    <p><b>Location</b>: (${latitude},${longitude})</p>
    <p><b>Exchange rates</b>: ${Object.entries(exchange_rate).map(([cur, val]) => `${cur}: ${CostApi.formatCost(val, 'currency', cur)}`).join(', ')}</p>
  `)
}


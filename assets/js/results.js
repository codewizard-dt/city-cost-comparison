
$(document).ready(function () {
  const stored_id = localStorage.getItem('city_id')
  if (stored_id) {
    CostApi.currentCity = CostApi.findById(stored_id)
    GeoApi.currentCity = GeoApi.findById(CostApi.currentCity.geo_id)
    loadCityInformation(getCombinedCityData())
  }  
})

function getCombinedCityData() {
  return { ...CostApi.currentCity, geo: GeoApi.currentCity }
}

function loadCityInformation(city) {
  let { city_name, country_name, geo } = city
  let { latitude, longitude, region, population } = geo

  $('#ResultsHeader').text(city_name)
  let dataEl = $('#CityData')

}


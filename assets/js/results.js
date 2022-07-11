
const stored_id = localStorage.getItem('city_id')
if (stored_id) {
  CostApi.currentCity = CostApi.findById(stored_id)
  GeoApi.currentCity = CostApi.currentCity.geo_id
  console.log(CostApi.currentCity, GeoApi.currentCity)
}

function loadCityInformation(city) {
  let dataEl = $('#CityData')

}
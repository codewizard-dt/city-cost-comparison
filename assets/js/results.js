// import { CostApi, GeoApi } from ".";

const stored_id = localStorage.getItem('city_id')
if (stored_id) {
  CostApi.currentCity = CostApi.findById(stored_id)
  console.log(CostApi.currentCity)
}


  // Or with jQuery

// Cities
const cities = {
	async: true,
	crossDomain: true,
	url: "https://cost-of-living-and-prices.p.rapidapi.com/prices?city_name=${results}&country_name=${}",
	method: "GET",
	headers: {
		"X-RapidAPI-Key": "81dbd58890msh2f1dc9094872798p11fce4jsn89ee8593ef9b",
		"X-RapidAPI-Host": "cost-of-living-and-prices.p.rapidapi.com"
	}
};

$.ajax(settings).done(function (response) {
	console.log(response);
});

    // Prices
    const prices = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '81dbd58890msh2f1dc9094872798p11fce4jsn89ee8593ef9b',
        'X-RapidAPI-Host': 'cost-of-living-and-prices.p.rapidapi.com'
      }
    };
    
    fetch('https://cost-of-living-and-prices.p.rapidapi.com/prices?city_name=Bratislava&country_name=Slovakia', option)
      .then(response => response.json())
      .then(response => console.log(response))
      .catch(err => console.error(err));

      

      console.log();
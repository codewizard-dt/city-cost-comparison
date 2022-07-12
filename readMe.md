# City Comp

Find a city by name or by browsing the map then see demographic and cost of living data.

## Demographics
Utilized [GeoDb Cities API](https://rapidapi.com/wirefreethought/api/geodb-cities/) for comprehensive search functionality. This API gives geographic and demographic information.

## Cost of Living
Utilized [Cost of Living and Prices API](https://rapidapi.com/traveltables/api/cost-of-living-and-prices/) for detailed data on average, minimum, and maximum prices for a wide variety of goods and services. Also gives exchange rates

## Google Maps API
Combining data from both of the above APIs, we show the user a map that shows their current location (or selected location) as well as 5 randomly selected cities that are within the map's viewbox. Clicking on one of the cities loads more cost of living data as well as 5 new cities.

## Local Storage Cache
Both the GeoDB and Cost API are cached in local storage.


images from:
https://stocksnap.io/
https://burst.shopify.com/
https://unsplash.com/
logo from:
https://placeit.net

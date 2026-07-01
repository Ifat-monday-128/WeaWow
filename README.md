# WeaWow

WeaWow is a static, ultra-modern weather dashboard built with HTML, CSS, vanilla JavaScript, and Leaflet. It uses free Open-Meteo APIs to show current weather, forecasts, animated weather effects, and simulated interactive weather map overlays.

## Features

- City search with the Open-Meteo Geocoding API
- Current weather hero card with temperature, condition, feels-like, high, low, and local time
- Horizontal 24-hour forecast cards
- 7-day forecast with temperature range bars
- Weather details grid for humidity, wind, pressure, UV index, cloud cover, visibility, sunrise, sunset, and rain probability
- Interactive Leaflet map centered on the searched city
- City marker with a weather popup
- Map modes for Standard Map, Wind View, Thermal View, Rain View, Cloud View, and Pressure View
- Simulated local weather overlays because Open-Meteo does not provide global weather map tiles
- Animated page effects for clear skies, night, clouds, rain, storms, snow, and fog
- Glassmorphism interface with responsive mobile-first layout
- Dark and light theme toggle saved in localStorage
- Recent searches saved in localStorage
- Loading skeletons and friendly error messages

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Leaflet.js
- OpenStreetMap tiles
- Open-Meteo APIs

## APIs Used

- Open-Meteo Geocoding API: city name to latitude and longitude
- Open-Meteo Forecast API: current weather, hourly forecast, daily forecast, wind, cloud cover, pressure, UV index, visibility, sunrise, sunset, and precipitation probability

No API key, backend server, paid service, React, Node.js, Tailwind, or Bootstrap is required.

## How to Run

Open `index.html` directly in a browser.

You can also use the Live Server extension in your editor:

1. Open this folder in your editor.
2. Right-click `index.html`.
3. Choose `Open with Live Server`.
4. Search for a city and try the map mode buttons.

An internet connection is required for Leaflet tiles and Open-Meteo data.

## Folder Structure

```text
WeaWow/
  index.html        Main page structure
  style.css         Responsive glass UI, animations, and map overlay styles
  script.js         Open-Meteo requests, rendering, Leaflet map logic, and localStorage
  manifest.json     Web app metadata
  weather-icon.svg  App icon
  README.md         Project documentation
```

## GitHub Pages Deployment

1. Push this project to a GitHub repository.
2. Open the repository on GitHub.
3. Go to `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select the `main` branch and `/root` folder.
7. Save the settings.
8. Wait for GitHub Pages to publish the site URL.

## Future Improvements

- Add Celsius/Fahrenheit unit switching
- Add favorite cities
- Add forecast charts for temperature, wind, and precipitation
- Add more detailed accessibility controls for reduced motion
- Add offline fallback content for previously searched cities

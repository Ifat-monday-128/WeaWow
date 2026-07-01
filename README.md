# WeaWow

> A modern, glass-style weather dashboard with live forecasts, map layers, moon phase details, and a polished app-like interface.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-WeaWow-5ddcff?style=for-the-badge&labelColor=101827)](https://ifat-monday-128.github.io/WeaWow/)
[![Built With](https://img.shields.io/badge/Built%20with-HTML%20CSS%20JS-f9d66d?style=for-the-badge&labelColor=101827)](#tech-stack)
[![No API Key](https://img.shields.io/badge/API%20Key-Not%20Required-74f7c5?style=for-the-badge&labelColor=101827)](#apis)

## Live Site

Visit the published app:

**https://ifat-monday-128.github.io/WeaWow/**

## Overview

WeaWow is a static weather web app built with HTML, CSS, vanilla JavaScript, Leaflet, OpenStreetMap, Open-Meteo, and RainViewer. It focuses on a premium visual experience while keeping the code simple enough to run without a backend, build step, package manager, or API key.

The app includes city search, current conditions, hourly and daily forecasts, a live clock, weather details, interactive map modes, radar support, animated weather effects, a realistic moon phase module, and a dedicated About page with developer credit.

## Highlights

- Live weather search for cities worldwide
- Current weather card with condition, temperature, feels-like, highs, lows, wind, and local time
- Horizontal 24-hour forecast
- 7-day outlook with temperature range bars
- Weather details for humidity, wind, pressure, UV index, clouds, visibility, sunrise, sunset, and rain probability
- Interactive Leaflet map with searched-location marker
- Weather map modes: standard, wind, thermal, rain, cloud, and pressure
- RainViewer radar layer for rain mode where coverage is available
- Current-location support with approximate fallback
- Realistic CSS moon phase panel with illumination and moon age
- Live clock in the top bar
- Dark/light theme with localStorage persistence
- Recent searches saved locally
- Responsive glassmorphism UI
- PWA manifest and custom app icon
- Dedicated About page

## Tech Stack

| Layer | Tools |
| --- | --- |
| Structure | HTML5 |
| Styling | CSS3, responsive layout, glass UI, CSS animations |
| Logic | Vanilla JavaScript |
| Map | Leaflet.js |
| Tiles | OpenStreetMap |
| Weather | Open-Meteo |
| Radar | RainViewer |
| Storage | localStorage |

## APIs

WeaWow uses free public APIs:

- **Open-Meteo Geocoding API** for city search
- **Open-Meteo Forecast API** for weather, hourly data, daily data, wind, pressure, UV, visibility, sunrise, sunset, and precipitation probability
- **Open-Meteo Reverse Geocoding API** for location names
- **RainViewer weather maps** for radar tiles in rain mode
- **ipapi.co** as an approximate-location fallback when exact browser geolocation is unavailable

No private API key is required.

## Run Locally

For the best experience, serve the project through localhost:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Using localhost is recommended because browser geolocation usually requires HTTPS or localhost. Opening `index.html` directly may block exact location access.

## Project Structure

```text
WeaWow/
  index.html        Main weather dashboard
  about.html        About and developer credit page
  style.css         UI, responsive design, animations, moon, map layers
  script.js         Weather APIs, rendering, location, map, theme, storage
  app-icon.svg      Custom app icon and favicon
  weather-icon.svg  Legacy weather icon asset
  manifest.json     PWA metadata
  README.md         Project documentation
```

## Developer Credit

**Developer and owner:** Mahtab Hasan Ifat  
**Facebook:** https://www.facebook.com/mahtab.hasan.ifat/

All project ownership and developer credit for WeaWow belongs to **Mahtab Hasan Ifat**.

## Deployment

This project is deployed on GitHub Pages:

```text
https://ifat-monday-128.github.io/WeaWow/
```

To deploy your own copy:

1. Push the project to a GitHub repository.
2. Open repository `Settings`.
3. Go to `Pages`.
4. Choose `Deploy from a branch`.
5. Select the main branch and root folder.
6. Save and wait for GitHub Pages to publish.

## Future Ideas

- Celsius/Fahrenheit unit switching
- Favorite cities
- Forecast charts
- More map overlays
- Reduced-motion controls
- Offline fallback for recently viewed weather


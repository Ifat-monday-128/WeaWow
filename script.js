const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const locationButton = document.getElementById("location-button");
const statusMessage = document.getElementById("status-message");
const dashboard = document.getElementById("dashboard");
const currentWeather = document.getElementById("current-weather");
const hourlyForecast = document.getElementById("hourly-forecast");
const dailyForecast = document.getElementById("daily-forecast");
const weatherDetails = document.getElementById("weather-details");
const themeToggle = document.getElementById("theme-toggle");
const recentList = document.getElementById("recent-list");
const mapModeButtons = document.querySelectorAll(".mode-btn");
const weatherEffects = document.getElementById("weather-effects");
const mapOverlay = document.getElementById("map-overlay");
const mapCanvas = document.getElementById("map-canvas");
const liveClock = document.getElementById("live-clock");

const GEO_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_GEO_API_URL = "https://geocoding-api.open-meteo.com/v1/reverse";
const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";
const IP_LOCATION_API_URL = "https://ipapi.co/json/";
const RECENT_SEARCHES_KEY = "weawow-recent-searches";
const THEME_KEY = "weawow-theme";

let map = null;
let marker = null;
let radarLayer = null;
let activeMapMode = "standard";
let currentLocation = null;
let currentWeatherData = null;
let currentHourlyIndex = 0;
let clockTimer = null;
let mapAnimationFrame = null;

function initApp() {
  loadTheme();
  loadRecentSearches();
  startClock();
  initMap();
  wireEvents();
  showError("Search a city to begin, or try the live demo for Dhaka.");
  searchCity("Dhaka");
}

function wireEvents() {
  // All buttons are connected in one place so beginners can find the app events quickly.
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchCity();
  });

  themeToggle.addEventListener("click", () => toggleTheme());
  locationButton.addEventListener("click", requestUserLocation);

  mapModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mapModeButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeMapMode = button.dataset.mapMode;
      updateMapMode();
    });
  });
}

function startClock() {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
}

function updateClock() {
  if (!liveClock) return;

  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const date = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  liveClock.querySelector(".clock-time").textContent = time;
  liveClock.querySelector(".clock-date").textContent = date;
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  toggleTheme(savedTheme);
}

function toggleTheme(explicitTheme) {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const nextTheme = explicitTheme || (currentTheme === "dark" ? "light" : "dark");

  document.documentElement.setAttribute("data-theme", nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
  themeToggle.innerHTML = nextTheme === "dark" ? "<span aria-hidden=\"true\">☾</span>" : "<span aria-hidden=\"true\">☀</span>";
  themeToggle.setAttribute("aria-label", nextTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

async function searchCity(cityName = cityInput.value) {
  const query = cityName.trim();

  if (!query) {
    showError("Please type a city name first.");
    return;
  }

  showLoading();

  try {
    // Step 1: turn the city name into latitude and longitude.
    const location = await fetchCoordinates(query);
    // Step 2: use those coordinates to request the forecast.
    const weatherData = await fetchWeather(location);

    currentLocation = location;
    currentWeatherData = weatherData;
    currentHourlyIndex = findCurrentHourlyIndex(weatherData);

    renderCurrentWeather(location, weatherData);
    renderHourlyForecast(weatherData);
    renderDailyForecast(weatherData);
    renderWeatherDetails(weatherData);
    updateMapLocation(location, weatherData);
    updateWeatherAnimation(weatherData);
    updateBackground(weatherData);
    saveRecentSearch(location.name, location.country);
    showSuccess(`Showing ${location.name}, ${location.country || "selected location"}.`);
  } catch (error) {
    showError(error.message || "Something went wrong while loading weather data.");
  } finally {
    hideLoading();
  }
}

async function fetchCoordinates(cityName) {
  const url = `${GEO_API_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("City search is unavailable right now. Please try again soon.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No city named "${cityName}" was found.`);
  }

  return data.results[0];
}

async function fetchWeather(location) {
  // Open-Meteo accepts comma-separated variable names and does not require an API key.
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: "auto",
    forecast_days: "7",
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "is_day"
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
      "wind_speed_10m",
      "relative_humidity_2m",
      "cloud_cover",
      "visibility",
      "uv_index"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "precipitation_probability_max",
      "uv_index_max"
    ].join(",")
  });

  const response = await fetch(`${FORECAST_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Weather data could not be loaded right now.");
  }

  return response.json();
}

function renderCurrentWeather(location, weatherData) {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const units = weatherData.current_units || {};
  const weatherInfo = getWeatherInfo(current.weather_code, current.is_day);
  const currentTime = formatDateTime(current.time);

  currentWeather.innerHTML = `
    <div class="current-content">
      <div class="current-top">
        <div>
          <p class="eyebrow">Now</p>
          <h2 class="city-name">${escapeHtml(location.name)}</h2>
          <p class="country">${escapeHtml(location.admin1 || location.country || "")}</p>
          <p class="current-time">${currentTime}</p>
        </div>
        <div class="weather-icon-large" aria-hidden="true">${weatherInfo.emoji}</div>
      </div>

      <div>
        <p class="temperature">${Math.round(current.temperature_2m)}${units.temperature_2m || "°C"}</p>
        <p class="condition">${weatherInfo.label}</p>
      </div>

      <div class="current-metrics">
        <span class="metric-pill">Feels ${Math.round(current.apparent_temperature)}${units.apparent_temperature || "°C"}</span>
        <span class="metric-pill">High ${Math.round(daily.temperature_2m_max[0])}°</span>
        <span class="metric-pill">Low ${Math.round(daily.temperature_2m_min[0])}°</span>
        <span class="metric-pill">Wind ${Math.round(current.wind_speed_10m)} ${units.wind_speed_10m || "km/h"}</span>
      </div>
    </div>
  `;
}

function renderHourlyForecast(weatherData) {
  const hourly = weatherData.hourly;
  const startIndex = currentHourlyIndex;
  const nextHours = hourly.time.slice(startIndex, startIndex + 24);
  const moonInfo = getMoonPhaseInfo(weatherData.current.time);

  hourlyForecast.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Hourly</p>
        <h2>Next 24 hours</h2>
      </div>
    </div>
    <div class="hourly-list">
      ${nextHours.map((time, offset) => {
        const index = startIndex + offset;
        const weatherInfo = getWeatherInfo(hourly.weather_code[index], 1);
        return `
          <article class="hourly-item">
            <div class="hour">${offset === 0 ? "Now" : formatHour(time)}</div>
            <div class="hourly-icon" aria-hidden="true">${weatherInfo.emoji}</div>
            <div class="hour-temp">${Math.round(hourly.temperature_2m[index])}°</div>
            <div class="mini-stat">Rain ${Math.round(hourly.precipitation_probability[index] || 0)}%</div>
            <div class="mini-stat">Wind ${Math.round(hourly.wind_speed_10m[index] || 0)} km/h</div>
          </article>
        `;
      }).join("")}
    </div>
    <article class="moon-card" aria-label="Moon phase">
      <div class="moon-copy">
        <p class="eyebrow">Moon Phase</p>
        <h3>${moonInfo.label}</h3>
        <p>${moonInfo.illumination}% illuminated</p>
      </div>
      <div class="moon-stage">
        <div class="moon-orbit ${moonInfo.phaseClass}" aria-hidden="true">
          <span class="moon-surface"></span>
        </div>
        <div class="moon-meter" aria-hidden="true">
          <span style="width:${moonInfo.illumination}%"></span>
        </div>
      </div>
      <div class="moon-stats">
        <span><strong>${moonInfo.age}</strong> days old</span>
        <span><strong>${moonInfo.nextFull}</strong> until full</span>
      </div>
    </article>
  `;
}

function renderDailyForecast(weatherData) {
  const daily = weatherData.daily;
  const allLows = daily.temperature_2m_min;
  const allHighs = daily.temperature_2m_max;
  const minTemp = Math.min(...allLows);
  const maxTemp = Math.max(...allHighs);

  dailyForecast.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Forecast</p>
        <h2>7-day outlook</h2>
      </div>
    </div>
    <div class="daily-list">
      ${daily.time.map((day, index) => {
        const weatherInfo = getWeatherInfo(daily.weather_code[index], 1);
        const low = Math.round(allLows[index]);
        const high = Math.round(allHighs[index]);
        const left = getRangePercent(allLows[index], minTemp, maxTemp);
        const width = Math.max(14, getRangePercent(allHighs[index], minTemp, maxTemp) - left);

        return `
          <article class="daily-item">
            <div class="daily-main">
              <span class="daily-icon" aria-hidden="true">${weatherInfo.emoji}</span>
              <div>
                <div class="day">${index === 0 ? "Today" : formatDay(day)}</div>
                <div class="daily-condition">${weatherInfo.label}</div>
              </div>
            </div>
            <div class="daily-temp">${low}° / ${high}°</div>
            <div class="range-track" aria-hidden="true">
              <div class="range-fill" style="margin-left:${left}%; width:${width}%;"></div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderWeatherDetails(weatherData) {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly;
  const i = currentHourlyIndex;
  const rainProbability = daily.precipitation_probability_max[0] ?? hourly.precipitation_probability[i] ?? 0;
  const visibilityKm = Math.round((hourly.visibility[i] || 0) / 1000);
  const uvIndex = Math.round(hourly.uv_index[i] ?? daily.uv_index_max[0] ?? 0);

  const details = [
    { label: "Humidity", value: `${Math.round(current.relative_humidity_2m)}%`, hint: "Current air moisture" },
    { label: "Wind speed", value: `${Math.round(current.wind_speed_10m)} km/h`, hint: `Gusts ${Math.round(current.wind_gusts_10m || 0)} km/h` },
    { label: "Wind direction", value: getWindDirection(current.wind_direction_10m), hint: `${Math.round(current.wind_direction_10m || 0)} degrees` },
    { label: "Pressure", value: `${Math.round(current.pressure_msl)} hPa`, hint: getPressureLabel(current.pressure_msl) },
    { label: "UV index", value: uvIndex, hint: getUvLabel(uvIndex) },
    { label: "Cloud cover", value: `${Math.round(current.cloud_cover)}%`, hint: getCloudLabel(current.cloud_cover) },
    { label: "Visibility", value: `${visibilityKm} km`, hint: visibilityKm >= 10 ? "Excellent range" : "Reduced range" },
    { label: "Sunrise", value: formatTime(daily.sunrise[0]), hint: "Local time" },
    { label: "Sunset", value: formatTime(daily.sunset[0]), hint: "Local time" },
    { label: "Rain probability", value: `${Math.round(rainProbability)}%`, hint: "Highest chance today" }
  ];

  weatherDetails.innerHTML = details.map((detail) => `
    <article class="detail-card glass">
      <span>${detail.label}</span>
      <strong>${detail.value}</strong>
      <small>${detail.hint}</small>
    </article>
  `).join("");
}

function initMap() {
  if (!window.L) {
    showError("Leaflet could not load. Check your internet connection and refresh.");
    return;
  }

  // Leaflet creates the interactive map. The tile layer is the normal street map.
  map = L.map("map", {
    zoomControl: true,
    worldCopyJump: true
  }).setView([23.8103, 90.4125], 5);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.zoomControl.setPosition("bottomright");
  map.on("moveend zoomend resize", scheduleMapModeUpdate);
}

function updateMapLocation(location, weatherData) {
  if (!map) return;

  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const weatherInfo = getWeatherInfo(weatherData.current.weather_code, weatherData.current.is_day);
  const popup = `
    <div class="weather-popup">
      <strong>${escapeHtml(location.name)}</strong>
      <span>${Math.round(weatherData.current.temperature_2m)}°C</span>
      <span>${weatherInfo.label}</span>
      <span>Wind ${Math.round(weatherData.current.wind_speed_10m)} km/h</span>
      <span>Humidity ${Math.round(weatherData.current.relative_humidity_2m)}%</span>
    </div>
  `;

  if (!marker) {
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    marker.setLatLng([lat, lon]);
  }

  marker.bindPopup(popup).openPopup();
  map.setView([lat, lon], 10, { animate: true });

  // Leaflet needs this after hidden sections become visible, otherwise tiles can look blank.
  setTimeout(() => {
    map.invalidateSize();
    updateMapMode();
  }, 180);
}

function updateMapMode() {
  renderMapMode();
}

function renderWindOverlay() {
  const current = currentWeatherData.current;
  const speed = Math.round(current.wind_speed_10m || 0);
  const direction = current.wind_direction_10m || 0;
  const particleCount = Math.max(20, Math.min(64, speed + 18));
  const center = getCityPoint();

  addOverlayLabel("Wind View", `${speed} km/h from ${getWindDirection(direction)}.`);

  const compass = document.createElement("div");
  compass.className = "wind-compass";
  compass.innerHTML = `
    <div class="compass-arrow" style="transform: rotate(${direction}deg)"></div>
    <div class="compass-value">${Math.round(direction)}°</div>
  `;
  mapOverlay.appendChild(compass);

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    const spread = 80 + (index % 9) * 34;
    const row = Math.floor(index / 9);
    particle.className = "wind-particle";
    particle.style.left = `${center.x - 220 + (index % 9) * 54}px`;
    particle.style.top = `${center.y - 150 + row * 44}px`;
    particle.style.transform = `rotate(${direction}deg)`;
    particle.style.animationDelay = `${(index % 7) * -0.28}s`;
    particle.style.animationDuration = `${Math.max(0.9, 3.2 - speed / 22)}s`;
    particle.style.opacity = `${0.28 + (spread % 90) / 160}`;
    mapOverlay.appendChild(particle);
  }
}

function renderThermalOverlay() {
  const temp = currentWeatherData.current.temperature_2m;
  const center = getCityPoint();
  const size = Math.max(230, Math.min(560, 300 + Math.abs(temp) * 6));
  const palette = temp >= 32
    ? "rgba(255, 78, 55, 0.58), rgba(255, 177, 66, 0.25), transparent 70%"
    : temp >= 18
      ? "rgba(255, 209, 102, 0.52), rgba(255, 136, 77, 0.2), transparent 70%"
      : "rgba(104, 211, 255, 0.55), rgba(109, 124, 255, 0.2), transparent 70%";

  addOverlayLabel("Thermal View", `${Math.round(temp)}°C heat field around the city.`);

  const overlay = document.createElement("div");
  overlay.className = "thermal-overlay";
  overlay.style.left = `${center.x}px`;
  overlay.style.top = `${center.y}px`;
  overlay.style.width = `${size}px`;
  overlay.style.height = `${size}px`;
  overlay.style.background = `radial-gradient(circle, ${palette})`;
  mapOverlay.appendChild(overlay);
}

function renderRainOverlay() {
  const rainChance = currentWeatherData.daily.precipitation_probability_max[0] || 0;
  const rainAmount = currentWeatherData.current.rain || currentWeatherData.current.precipitation || 0;
  const lineCount = rainChance > 70 || rainAmount > 0 ? 80 : rainChance > 30 ? 46 : 22;

  addOverlayLabel("Rain View", `Precipitation chance is ${Math.round(rainChance)}%.`);

  if (rainChance > 25 || rainAmount > 0) {
    const wash = document.createElement("div");
    wash.className = "rain-wash";
    mapOverlay.appendChild(wash);
  }

  for (let index = 0; index < lineCount; index += 1) {
    const line = document.createElement("span");
    line.className = "rain-line";
    line.style.left = `${Math.random() * 100}%`;
    line.style.top = `${Math.random() * 100}%`;
    line.style.animationDelay = `${Math.random() * -1.4}s`;
    line.style.animationDuration = `${0.45 + Math.random() * 0.45}s`;
    mapOverlay.appendChild(line);
  }
}

function renderCloudOverlay() {
  const cover = currentWeatherData.current.cloud_cover || 0;
  const cloudCount = Math.max(4, Math.ceil(cover / 14));

  addOverlayLabel("Cloud View", `${Math.round(cover)}% cloud cover.`);

  for (let index = 0; index < cloudCount; index += 1) {
    const cloud = document.createElement("span");
    cloud.className = "cloud-puff";
    cloud.style.left = `${-20 + index * 15}%`;
    cloud.style.top = `${18 + (index % 4) * 16}%`;
    cloud.style.opacity = `${0.28 + Math.min(cover, 100) / 170}`;
    cloud.style.animationDelay = `${index * -1.8}s`;
    cloud.style.animationDuration = `${12 + index * 1.1}s`;
    mapOverlay.appendChild(cloud);
  }
}

function renderPressureOverlay() {
  const pressure = currentWeatherData.current.pressure_msl || 1013;
  const center = getCityPoint();
  const rings = pressure >= 1020 ? 5 : pressure <= 1000 ? 3 : 4;

  addOverlayLabel("Pressure View", `${Math.round(pressure)} hPa, ${getPressureLabel(pressure).toLowerCase()}.`);

  for (let index = 0; index < rings; index += 1) {
    const ring = document.createElement("span");
    ring.className = "pressure-ring";
    const size = 120 + index * 62;
    ring.style.left = `${center.x}px`;
    ring.style.top = `${center.y}px`;
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
    ring.style.animationDelay = `${index * 0.25}s`;
    mapOverlay.appendChild(ring);
  }

  const card = document.createElement("div");
  card.className = "pressure-card";
  card.innerHTML = `${Math.round(pressure)} hPa<br><small>${getPressureLabel(pressure)}</small>`;
  mapOverlay.appendChild(card);
}

function scheduleMapModeUpdate() {
  if (mapAnimationFrame) cancelAnimationFrame(mapAnimationFrame);
  mapAnimationFrame = requestAnimationFrame(updateMapMode);
}

async function renderMapMode() {
  if (!mapOverlay || !mapCanvas || !map || !currentLocation || !currentWeatherData) return;

  clearMapLayer();
  mapOverlay.innerHTML = "";

  if (activeMapMode === "standard") {
    addOverlayLabel("Standard Map", "OpenStreetMap with your selected location marker.");
    return;
  }

  if (activeMapMode === "rain") {
    renderWeatherCanvas("rain");
    addOverlayLabel("Rain View", "Live radar tiles where coverage is available, plus local precipitation chance.");
    addMapLegend("Light", "Heavy", "linear-gradient(90deg, rgba(62, 186, 255, 0.35), #3bb2ff, #7f52ff, #ff3b81)");
    await showRadarLayer();
    return;
  }

  renderWeatherCanvas(activeMapMode);
  addOverlayLabel(getMapModeTitle(activeMapMode), getMapModeDescription(activeMapMode));
  addMapLegend(...getMapLegend(activeMapMode));

  if (activeMapMode === "wind") renderWindOverlay();
  if (activeMapMode === "pressure") renderPressureOverlay();
}

function renderWeatherCanvas(mode) {
  const rect = mapCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const center = getCityPoint();
  const context = mapCanvas.getContext("2d");

  mapCanvas.width = Math.floor(width * dpr);
  mapCanvas.height = Math.floor(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  if (mode === "wind") renderWindField(context, width, height);
  if (mode === "thermal") renderHeatField(context, width, height, center);
  if (mode === "rain") renderRainField(context, width, height, center);
  if (mode === "cloud") renderCloudField(context, width, height);
  if (mode === "pressure") renderPressureField(context, width, height, center);
}

function renderWindField(context, width, height) {
  const speed = currentWeatherData.current.wind_speed_10m || 0;
  const direction = currentWeatherData.current.wind_direction_10m || 0;
  const radians = ((direction - 90) * Math.PI) / 180;
  const spacing = Math.max(42, 78 - speed);

  context.globalAlpha = 0.9;
  context.lineWidth = 2;
  context.strokeStyle = "rgba(180, 232, 255, 0.86)";
  context.fillStyle = "rgba(180, 232, 255, 0.86)";

  for (let y = -spacing; y < height + spacing; y += spacing) {
    for (let x = -spacing; x < width + spacing; x += spacing) {
      const wave = Math.sin((x + y) / 90) * 12;
      drawWindArrow(context, x + wave, y - wave, radians, 18 + Math.min(speed, 46));
    }
  }
}

function renderHeatField(context, width, height, center) {
  const temp = currentWeatherData.current.temperature_2m || 0;
  const radius = Math.max(width, height) * 0.55;
  const gradient = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);

  if (temp >= 30) {
    gradient.addColorStop(0, "rgba(255, 84, 68, 0.72)");
    gradient.addColorStop(0.45, "rgba(255, 188, 73, 0.35)");
  } else if (temp >= 18) {
    gradient.addColorStop(0, "rgba(255, 215, 100, 0.58)");
    gradient.addColorStop(0.45, "rgba(255, 139, 86, 0.28)");
  } else {
    gradient.addColorStop(0, "rgba(89, 198, 255, 0.66)");
    gradient.addColorStop(0.45, "rgba(98, 118, 255, 0.28)");
  }

  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function renderRainField(context, width, height, center) {
  const rainChance = currentWeatherData.daily.precipitation_probability_max[0] || 0;
  const rainAmount = currentWeatherData.current.rain || currentWeatherData.current.precipitation || 0;
  const intensity = Math.min(1, Math.max(rainChance / 100, rainAmount / 12));
  const gradient = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, Math.max(width, height) * 0.6);

  gradient.addColorStop(0, `rgba(43, 148, 255, ${0.24 + intensity * 0.45})`);
  gradient.addColorStop(0.5, `rgba(91, 61, 255, ${0.12 + intensity * 0.22})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function renderCloudField(context, width, height) {
  const cover = currentWeatherData.current.cloud_cover || 0;
  const count = Math.max(9, Math.ceil(cover / 4));

  context.filter = "blur(6px)";
  for (let index = 0; index < count; index += 1) {
    const x = ((index * 131) % (width + 220)) - 110;
    const y = ((index * 67) % (height + 120)) - 60;
    const radius = 56 + (index % 5) * 18;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, `rgba(245, 250, 255, ${0.18 + cover / 260})`);
    gradient.addColorStop(1, "rgba(245, 250, 255, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.filter = "none";
}

function renderPressureField(context, width, height, center) {
  const pressure = currentWeatherData.current.pressure_msl || 1013;
  const isHigh = pressure >= 1013;

  context.strokeStyle = isHigh ? "rgba(255, 238, 155, 0.78)" : "rgba(141, 215, 255, 0.78)";
  context.lineWidth = 2;
  context.setLineDash([12, 9]);

  for (let index = 0; index < 7; index += 1) {
    context.beginPath();
    context.arc(center.x, center.y, 80 + index * 58, 0, Math.PI * 2);
    context.stroke();
  }

  context.setLineDash([]);
}

function drawWindArrow(context, x, y, radians, length) {
  const x2 = x + Math.cos(radians) * length;
  const y2 = y + Math.sin(radians) * length;

  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x2, y2);
  context.stroke();

  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(x2 - Math.cos(radians - 0.55) * 8, y2 - Math.sin(radians - 0.55) * 8);
  context.lineTo(x2 - Math.cos(radians + 0.55) * 8, y2 - Math.sin(radians + 0.55) * 8);
  context.closePath();
  context.fill();
}

function renderWindOverlay() {
  const current = currentWeatherData.current;
  const speed = Math.round(current.wind_speed_10m || 0);
  const direction = current.wind_direction_10m || 0;
  const compass = document.createElement("div");

  compass.className = "wind-compass";
  compass.innerHTML = `
    <div class="compass-arrow" style="transform: rotate(${direction}deg)"></div>
    <div class="compass-value">${Math.round(direction)}°</div>
  `;
  mapOverlay.appendChild(compass);
}

function renderPressureOverlay() {
  const pressure = currentWeatherData.current.pressure_msl || 1013;
  const card = document.createElement("div");

  card.className = "pressure-card";
  card.innerHTML = `${Math.round(pressure)} hPa<br><small>${getPressureLabel(pressure)}</small>`;
  mapOverlay.appendChild(card);
}

function clearMapLayer() {
  const context = mapCanvas.getContext("2d");
  context.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

  if (radarLayer) {
    map.removeLayer(radarLayer);
    radarLayer = null;
  }
}

async function showRadarLayer() {
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!response.ok) return;

    const data = await response.json();
    const frames = data.radar && data.radar.past;
    const latestFrame = frames && frames[frames.length - 1];
    if (!latestFrame) return;

    radarLayer = L.tileLayer(`${data.host}${latestFrame.path}/256/{z}/{x}/{y}/4/1_1.png`, {
      opacity: 0.68,
      pane: "overlayPane",
      attribution: "Radar: RainViewer"
    }).addTo(map);
  } catch (error) {
    // Canvas precipitation still shows local forecast data if live radar is unavailable.
  }
}

function addMapLegend(leftText, rightText, gradient) {
  const legend = document.createElement("div");
  legend.className = "map-legend";
  legend.innerHTML = `
    <span class="legend-text">${leftText}</span>
    <span class="legend-ramp" style="background:${gradient}"></span>
    <span class="legend-text">${rightText}</span>
  `;
  mapOverlay.appendChild(legend);
}

function getMapModeTitle(mode) {
  const titles = {
    wind: "Wind View",
    thermal: "Thermal View",
    cloud: "Cloud View",
    pressure: "Pressure View"
  };

  return titles[mode] || "Weather View";
}

function getMapModeDescription(mode) {
  const current = currentWeatherData.current;
  const descriptions = {
    wind: `${Math.round(current.wind_speed_10m || 0)} km/h from ${getWindDirection(current.wind_direction_10m || 0)}.`,
    thermal: `${Math.round(current.temperature_2m || 0)}°C temperature field near the selected location.`,
    cloud: `${Math.round(current.cloud_cover || 0)}% cloud cover around the map.`,
    pressure: `${Math.round(current.pressure_msl || 1013)} hPa, ${getPressureLabel(current.pressure_msl || 1013).toLowerCase()}.`
  };

  return descriptions[mode] || "Local weather layer.";
}

function getMapLegend(mode) {
  const legends = {
    wind: ["Calm", "Strong", "linear-gradient(90deg, rgba(180, 232, 255, 0.28), #b4e8ff)"],
    thermal: ["Cold", "Hot", "linear-gradient(90deg, #59c6ff, #ffd764, #ff5444)"],
    cloud: ["Clear", "Cloudy", "linear-gradient(90deg, rgba(245, 250, 255, 0.12), rgba(245, 250, 255, 0.78))"],
    pressure: ["Low", "High", "linear-gradient(90deg, #8dd7ff, #ffffff, #ffee9b)"]
  };

  return legends[mode] || ["Low", "High", "linear-gradient(90deg, #8dd7ff, #ffee9b)"];
}

function updateWeatherAnimation(weatherData) {
  const scene = getWeatherScene(weatherData);

  weatherEffects.innerHTML = "";
  document.documentElement.dataset.weatherScene = scene.condition;

  if (scene.isDay && scene.condition !== "fog") addSunGlow(scene.condition);
  if (!scene.isDay) addStars(scene.condition);
  if (scene.cloudCover >= 20 || ["partly-cloudy", "overcast", "drizzle", "light-rain", "rain", "heavy-rain", "storm", "fog", "snow"].includes(scene.condition)) {
    addFloatingClouds(scene.cloudCover, scene.condition);
  }
  if (scene.condition === "overcast") addSkyHaze("cloud-haze");
  if (scene.condition === "drizzle") addDrizzleDrops();
  if (["light-rain", "rain", "heavy-rain"].includes(scene.condition)) addRainDrops(scene.condition);
  if (scene.condition === "storm") addLightning();
  if (scene.condition === "snow") addSnow();
  if (scene.condition === "fog") addFog();
}

function updateBackground(weatherData) {
  const scene = getWeatherScene(weatherData);
  const palettes = {
    clear: ["#4cbdf5", "#2877cb", "#ffd66f"],
    "clear-night": ["#050816", "#18255a", "#566fb8"],
    "mainly-clear": ["#57b9ef", "#3f91d0", "#f4d57a"],
    "mainly-clear-night": ["#071022", "#203264", "#7d8fd0"],
    "partly-cloudy": ["#5fa7d4", "#7f9fb5", "#f0cf86"],
    "partly-cloudy-night": ["#101827", "#33415f", "#8b98b9"],
    overcast: ["#5f6e7c", "#8c99a5", "#d4dbe2"],
    drizzle: ["#47667c", "#7794a9", "#bbcfdd"],
    "light-rain": ["#314a61", "#637e95", "#9fc0d6"],
    rain: ["#1f3147", "#526a83", "#82a9c9"],
    "heavy-rain": ["#101f32", "#405a73", "#6f95b5"],
    storm: ["#0b1020", "#27344d", "#77808f"],
    snow: ["#dfefff", "#9bb9d0", "#ffffff"],
    fog: ["#9aa7b1", "#c3ccd4", "#f0f4f7"]
  };
  const palette = palettes[scene.condition] || palettes.clear;

  document.documentElement.style.setProperty("--bg-a", palette[0]);
  document.documentElement.style.setProperty("--bg-b", palette[1]);
  document.documentElement.style.setProperty("--bg-c", palette[2]);
}

function saveRecentSearch(cityName, countryName = "") {
  const searches = loadRecentSearchesData();
  const nextEntry = { name: cityName, country: countryName };
  const filtered = searches.filter((item) => item.name !== cityName || item.country !== countryName);
  const nextSearches = [nextEntry, ...filtered].slice(0, 7);

  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches));
  renderRecentSearches(nextSearches);
}

function loadRecentSearches() {
  renderRecentSearches(loadRecentSearchesData());
}

function loadRecentSearchesData() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function renderRecentSearches(searches) {
  recentList.innerHTML = "";

  if (!searches.length) {
    recentList.innerHTML = '<span class="empty-chip">None yet</span>';
    return;
  }

  searches.forEach((search) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = search.country ? `${search.name}, ${search.country}` : search.name;
    chip.addEventListener("click", () => searchCity(search.name));
    recentList.appendChild(chip);
  });
}

function showLoading() {
  searchButton.disabled = true;
  locationButton.disabled = true;
  cityInput.disabled = true;
  searchButton.textContent = "Loading";
  dashboard.classList.remove("hidden");

  currentWeather.innerHTML = createSkeleton(["65%", "42%", "78%", "52%"]);
  hourlyForecast.innerHTML = createSkeleton(["38%", "100%", "100%", "100%"]);
  dailyForecast.innerHTML = createSkeleton(["42%", "100%", "100%", "100%"]);
  weatherDetails.innerHTML = Array.from({ length: 10 }, () => `
    <article class="detail-card glass">
      <div class="skeleton-block" style="width: 58%"></div>
      <div class="skeleton-block" style="width: 72%; height: 28px"></div>
    </article>
  `).join("");
}

function hideLoading() {
  searchButton.disabled = false;
  locationButton.disabled = false;
  cityInput.disabled = false;
  searchButton.textContent = "Search";
}

function showError(message) {
  statusMessage.textContent = message;
  statusMessage.className = "status-card glass error";
}

function showSuccess(message) {
  statusMessage.textContent = message;
  statusMessage.className = "status-card glass success";
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    useApproximateLocation("Geolocation is not supported by this browser.");
    return;
  }

  if (!window.isSecureContext) {
    useApproximateLocation("Exact location needs HTTPS or localhost, so using an approximate location instead.");
    return;
  }

  showLoading();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const location = await fetchReverseCoordinates(latitude, longitude);
        const weatherData = await fetchWeather(location);

        currentLocation = location;
        currentWeatherData = weatherData;
        currentHourlyIndex = findCurrentHourlyIndex(weatherData);

        renderCurrentWeather(location, weatherData);
        renderHourlyForecast(weatherData);
        renderDailyForecast(weatherData);
        renderWeatherDetails(weatherData);
        updateMapLocation(location, weatherData);
        updateWeatherAnimation(weatherData);
        updateBackground(weatherData);
        saveRecentSearch(location.name, location.country);
        showSuccess(`Showing weather near ${location.name}.`);
      } catch (error) {
        showError(error.message || "Your location weather could not be loaded.");
      } finally {
        hideLoading();
      }
    },
    async (error) => {
      hideLoading();
      const reason = getGeolocationErrorMessage(error);
      await useApproximateLocation(reason);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function fetchReverseCoordinates(latitude, longitude) {
  const url = `${REVERSE_GEO_API_URL}?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not identify your city from the browser location.");
  }

  const data = await response.json();
  const result = data.results && data.results[0];

  if (result) {
    return {
      ...result,
      latitude,
      longitude
    };
  }

  return {
    name: "Your location",
    country: "",
    latitude,
    longitude
  };
}

async function useApproximateLocation(reason) {
  showLoading();

  try {
    const location = await fetchApproximateLocation();
    const weatherData = await fetchWeather(location);

    currentLocation = location;
    currentWeatherData = weatherData;
    currentHourlyIndex = findCurrentHourlyIndex(weatherData);

    renderCurrentWeather(location, weatherData);
    renderHourlyForecast(weatherData);
    renderDailyForecast(weatherData);
    renderWeatherDetails(weatherData);
    updateMapLocation(location, weatherData);
    updateWeatherAnimation(weatherData);
    updateBackground(weatherData);
    saveRecentSearch(location.name, location.country);
    showSuccess(`${reason} Showing approximate weather near ${location.name}.`);
  } catch (error) {
    showError(`${reason} Approximate location also could not be loaded. Search by city instead.`);
  } finally {
    hideLoading();
  }
}

async function fetchApproximateLocation() {
  const response = await fetch(IP_LOCATION_API_URL);

  if (!response.ok) {
    throw new Error("Approximate location lookup failed.");
  }

  const data = await response.json();
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Approximate location was incomplete.");
  }

  return {
    name: data.city || "Your area",
    admin1: data.region || "",
    country: data.country_name || data.country || "",
    latitude,
    longitude
  };
}

function getGeolocationErrorMessage(error) {
  if (!error) return "Exact location is unavailable.";
  if (error.code === error.PERMISSION_DENIED) return "Location access was blocked.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Your exact location is unavailable.";
  if (error.code === error.TIMEOUT) return "Location lookup timed out.";
  return "Exact location is unavailable.";
}

function createSkeleton(widths) {
  return `
    <div class="skeleton-card">
      ${widths.map((width) => `<div class="skeleton-block" style="width:${width}"></div>`).join("")}
    </div>
  `;
}

function addOverlayLabel(title, text) {
  const label = document.createElement("div");
  label.className = "overlay-label";
  label.innerHTML = `<strong>${title}</strong><br><span>${text}</span>`;
  mapOverlay.appendChild(label);
}

function getCityPoint() {
  return map.latLngToContainerPoint([currentLocation.latitude, currentLocation.longitude]);
}

function findCurrentHourlyIndex(weatherData) {
  const times = weatherData.hourly.time || [];
  const currentTime = new Date(weatherData.current.time).getTime();
  let bestIndex = 0;
  let smallestGap = Infinity;

  times.forEach((time, index) => {
    const gap = Math.abs(new Date(time).getTime() - currentTime);
    if (gap < smallestGap) {
      smallestGap = gap;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getRangePercent(value, min, max) {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function getWeatherInfo(weatherCode, isDay = 1) {
  const weatherMap = {
    0: { emoji: isDay ? "\u2600\uFE0F" : "\u{1F319}", label: "Clear sky", condition: isDay ? "clear" : "clear-night" },
    1: { emoji: isDay ? "\u{1F324}\uFE0F" : "\u{1F319}", label: "Mainly clear", condition: isDay ? "mainly-clear" : "mainly-clear-night" },
    2: { emoji: "\u26C5", label: "Partly cloudy", condition: isDay ? "partly-cloudy" : "partly-cloudy-night" },
    3: { emoji: "\u2601\uFE0F", label: "Overcast", condition: "overcast" },
    45: { emoji: "\u{1F32B}\uFE0F", label: "Fog", condition: "fog" },
    48: { emoji: "\u{1F32B}\uFE0F", label: "Rime fog", condition: "fog" },
    51: { emoji: "\u{1F326}\uFE0F", label: "Light drizzle", condition: "drizzle" },
    53: { emoji: "\u{1F326}\uFE0F", label: "Drizzle", condition: "drizzle" },
    55: { emoji: "\u{1F327}\uFE0F", label: "Dense drizzle", condition: "drizzle" },
    61: { emoji: "\u{1F326}\uFE0F", label: "Light rain", condition: "light-rain" },
    63: { emoji: "\u{1F327}\uFE0F", label: "Rain", condition: "rain" },
    65: { emoji: "\u{1F327}\uFE0F", label: "Heavy rain", condition: "heavy-rain" },
    66: { emoji: "\u{1F327}\uFE0F", label: "Freezing rain", condition: "rain" },
    67: { emoji: "\u{1F327}\uFE0F", label: "Heavy freezing rain", condition: "heavy-rain" },
    71: { emoji: "\u{1F328}\uFE0F", label: "Light snow", condition: "snow" },
    73: { emoji: "\u{1F328}\uFE0F", label: "Snow", condition: "snow" },
    75: { emoji: "\u2744\uFE0F", label: "Heavy snow", condition: "snow" },
    77: { emoji: "\u2744\uFE0F", label: "Snow grains", condition: "snow" },
    80: { emoji: "\u{1F326}\uFE0F", label: "Light rain showers", condition: "light-rain" },
    81: { emoji: "\u{1F327}\uFE0F", label: "Rain showers", condition: "rain" },
    82: { emoji: "\u26C8\uFE0F", label: "Violent showers", condition: "storm" },
    85: { emoji: "\u{1F328}\uFE0F", label: "Snow showers", condition: "snow" },
    86: { emoji: "\u2744\uFE0F", label: "Heavy snow showers", condition: "snow" },
    95: { emoji: "\u26C8\uFE0F", label: "Thunderstorm", condition: "storm" },
    96: { emoji: "\u26C8\uFE0F", label: "Thunderstorm with hail", condition: "storm" },
    99: { emoji: "\u26C8\uFE0F", label: "Severe thunderstorm", condition: "storm" }
  };

  return weatherMap[weatherCode] || { emoji: "\u{1F308}", label: "Changing weather", condition: isDay ? "mainly-clear" : "mainly-clear-night" };
}

function getWeatherScene(weatherData) {
  const current = weatherData.current || {};
  const hourly = weatherData.hourly || {};
  const daily = weatherData.daily || {};
  const info = getWeatherInfo(current.weather_code, current.is_day);
  const hourlyRainChance = hourly.precipitation_probability?.[currentHourlyIndex];
  const cloudCover = Math.round(current.cloud_cover ?? hourly.cloud_cover?.[currentHourlyIndex] ?? 0);
  const currentPrecipitation = Math.max(Number(current.precipitation || 0), Number(current.rain || 0));
  const rainProbability = hourlyRainChance ?? daily.precipitation_probability_max?.[0] ?? 0;
  let condition = info.condition;

  if (condition === "mainly-clear" && cloudCover >= 55) condition = "partly-cloudy";
  if (condition === "mainly-clear-night" && cloudCover >= 55) condition = "partly-cloudy-night";
  if (["clear", "mainly-clear", "clear-night", "mainly-clear-night"].includes(condition) && cloudCover >= 82) {
    condition = "overcast";
  }

  if (!["drizzle", "light-rain", "rain", "heavy-rain", "storm", "snow"].includes(condition)) {
    if (currentPrecipitation >= 1.5) condition = "rain";
    else if (currentPrecipitation >= 0.2) condition = "light-rain";
    else if (rainProbability >= 85 && cloudCover >= 80) condition = "overcast";
  }

  return {
    ...info,
    condition,
    cloudCover,
    rainProbability,
    currentPrecipitation,
    isDay: Number(current.is_day) === 1
  };
}

function getWindDirection(degrees = 0) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

function getPressureLabel(pressure) {
  if (pressure >= 1020) return "High pressure";
  if (pressure <= 1000) return "Low pressure";
  return "Normal pressure";
}

function getUvLabel(index) {
  if (index >= 8) return "Very high exposure";
  if (index >= 6) return "High exposure";
  if (index >= 3) return "Moderate exposure";
  return "Low exposure";
}

function getCloudLabel(cover) {
  if (cover >= 75) return "Mostly covered";
  if (cover >= 35) return "Mixed sky";
  return "Mostly clear";
}

function getMoonPhaseInfo(value) {
  const date = new Date(value);
  const synodicMonth = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const daysSinceNewMoon = (date.getTime() - knownNewMoon) / 86400000;
  const normalizedAge = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
  const phase = normalizedAge / synodicMonth;
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
  const nextFullDays = normalizedAge <= synodicMonth / 2
    ? synodicMonth / 2 - normalizedAge
    : synodicMonth - normalizedAge + synodicMonth / 2;

  return {
    label: getMoonPhaseLabel(normalizedAge),
    phaseClass: getMoonPhaseClass(normalizedAge),
    illumination,
    age: normalizedAge.toFixed(1),
    nextFull: formatMoonDistance(nextFullDays)
  };
}

function getMoonPhaseLabel(age) {
  if (age < 1.84566) return "New Moon";
  if (age < 5.53699) return "Waxing Crescent";
  if (age < 9.22831) return "First Quarter";
  if (age < 12.91963) return "Waxing Gibbous";
  if (age < 16.61096) return "Full Moon";
  if (age < 20.30228) return "Waning Gibbous";
  if (age < 23.99361) return "Last Quarter";
  if (age < 27.68493) return "Waning Crescent";
  return "New Moon";
}

function getMoonPhaseClass(age) {
  if (age < 1.84566) return "moon-new";
  if (age < 5.53699) return "moon-waxing-crescent";
  if (age < 9.22831) return "moon-first-quarter";
  if (age < 12.91963) return "moon-waxing-gibbous";
  if (age < 16.61096) return "moon-full";
  if (age < 20.30228) return "moon-waning-gibbous";
  if (age < 23.99361) return "moon-last-quarter";
  if (age < 27.68493) return "moon-waning-crescent";
  return "moon-new";
}

function formatMoonDistance(days) {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours} hr`;
  }

  return `${Math.round(days)} days`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric" });
}

function formatDay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString([], { weekday: "short" });
}

function formatTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addSunGlow(condition = "clear") {
  const sun = document.createElement("div");
  sun.className = "sun-glow";
  if (condition === "partly-cloudy") sun.classList.add("sun-glow-soft");
  if (condition === "overcast") sun.classList.add("sun-glow-muted");
  weatherEffects.appendChild(sun);
}

function addStars(condition = "clear-night") {
  const count = condition === "partly-cloudy-night" ? 32 : 70;
  for (let index = 0; index < count; index += 1) {
    const star = document.createElement("span");
    star.className = "star";
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 70}%`;
    star.style.animationDelay = `${Math.random() * -2}s`;
    weatherEffects.appendChild(star);
  }
}

function addFloatingClouds(cloudCover = 50, condition = "partly-cloudy") {
  const baseCount = condition === "overcast" || condition === "fog" ? 9 : 4;
  const count = Math.min(11, Math.max(baseCount, Math.ceil(cloudCover / 18)));
  for (let index = 0; index < count; index += 1) {
    const cloud = document.createElement("span");
    cloud.className = "cloud-float";
    if (condition === "partly-cloudy" || condition === "partly-cloudy-night") cloud.classList.add("cloud-float-light");
    if (condition === "overcast" || condition === "fog") cloud.classList.add("cloud-float-heavy");
    if (["drizzle", "light-rain", "rain", "heavy-rain", "storm"].includes(condition)) cloud.classList.add("cloud-float-wet");
    cloud.style.left = `${-30 + index * 16}%`;
    cloud.style.top = `${10 + (index % 4) * 17}%`;
    cloud.style.animationDelay = `${index * -2.4}s`;
    cloud.style.animationDuration = `${18 + index * 2}s`;
    weatherEffects.appendChild(cloud);
  }
}

function addSkyHaze(className) {
  const haze = document.createElement("div");
  haze.className = className;
  weatherEffects.appendChild(haze);
}

function addDrizzleDrops() {
  addSkyHaze("drizzle-mist");
  for (let index = 0; index < 55; index += 1) {
    const drop = document.createElement("span");
    drop.className = "drizzle-drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.top = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * -2.8}s`;
    drop.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    weatherEffects.appendChild(drop);
  }
}

function addRainDrops(condition = "rain") {
  const count = condition === "heavy-rain" ? 170 : condition === "light-rain" ? 76 : 120;
  for (let index = 0; index < count; index += 1) {
    const drop = document.createElement("span");
    drop.className = "rain-drop";
    if (condition === "light-rain") drop.classList.add("rain-drop-light");
    if (condition === "heavy-rain") drop.classList.add("rain-drop-heavy");
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.top = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * -1.5}s`;
    drop.style.animationDuration = `${0.55 + Math.random() * 0.55}s`;
    weatherEffects.appendChild(drop);
  }
}

function addLightning() {
  const lightning = document.createElement("div");
  lightning.className = "lightning";
  weatherEffects.appendChild(lightning);
  addSkyHaze("storm-shelf");
  addRainDrops("heavy-rain");
}

function addSnow() {
  for (let index = 0; index < 90; index += 1) {
    const flake = document.createElement("span");
    flake.className = "snow-flake";
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.top = `${Math.random() * 100}%`;
    flake.style.animationDelay = `${Math.random() * -4}s`;
    flake.style.animationDuration = `${3 + Math.random() * 4}s`;
    weatherEffects.appendChild(flake);
  }
}

function addFog() {
  const fog = document.createElement("div");
  fog.className = "fog-layer";
  weatherEffects.appendChild(fog);
}

initApp();

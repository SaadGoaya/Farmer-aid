/**
 * weather.js
 * Handles fetching weather data from Open-Meteo and
 * displaying it on the weather.html page.
 * Integrates a Generative AI model (via placeholder API key)
 * to provide real-time, dynamic crop fertilization, watering,
 * and pest/disease risk advisories based on weather and crop type.
 */

// ---- Constants ----
// Backend proxy endpoints
const GEOCODE_PROXY = '/api/geocode';
const WEATHER_PROXY = '/api/weather';

// ---- DOM Elements (declared; assigned on DOMContentLoaded to be robust) ----
let searchBtn, locBtn, refreshBtn, cityInput, cropSelect, zoneSelect, loadingSpinner, errorMessage;
let currentWeatherDiv, currentCitySpan, currentWeatherIcon, currentTemperature, currentDescription, currentFeelsLike, currentHumidity, currentWindSpeed, currentSunrise, currentSunset;
let forecastDiv, forecastGrid;
let aiAdvisoryDiv, aiAdvisoryContent;
let cropCareCardsDiv, fertilizerAdvisoryContent, wateringAdvisoryContent, pestPreventionContent;
let copyYear;

// ---- State Variables ----
let lastQuery = null; // Stores {lat, lon, name} of the last successful location lookup
let lastWeatherData = null; // Stores the full Open-Meteo response
let currentAdvisoryRisk = 'Low'; // Stores the calculated risk level for AI advisory

// ---- Utility Functions ----

// Staggered entrance for a NodeList/array of elements: adds 'in' class with delays
function staggerEntrance(elements, baseDelay = 80) {
    elements.forEach((el, idx) => {
        el.classList.add('card-entrance');
        setTimeout(() => el.classList.add('in'), baseDelay * idx);
    });
}

// Simple pointer-based tilt effect on an element
function enableTilt(el, maxTilt = 8) {
    if (!el) return;
    el.classList.add('tilt-enabled');
    const rect = () => el.getBoundingClientRect();

    function onMove(e) {
        const r = rect();
        const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        const rx = (-py) * maxTilt; // tilt around X
        const ry = px * maxTilt; // tilt around Y
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
    }

    function onLeave() {
        el.style.transform = '';
    }
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
}

// Create ripple effect inside a button
function applyButtonRipple(btn) {
    if (!btn) return;
    btn.classList.add('btn-ripple');
    btn.addEventListener('pointerdown', (e) => {
        const rect = btn.getBoundingClientRect();
        const r = document.createElement('span');
        r.className = 'ripple';
        const size = Math.max(rect.width, rect.height) * 0.6;
        r.style.width = r.style.height = size + 'px';
        r.style.left = (e.clientX - rect.left - size / 2) + 'px';
        r.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 650);
    });
}

// Custom animated select: wraps an existing <select> and creates a button + menu
function createCustomSelect(selectEl) {
    if (!selectEl) return null;
    // hide original select but keep it for value storage
    selectEl.style.display = 'none';
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    const button = document.createElement('div');
    button.className = 'custom-select-button';
    const label = document.createElement('span');
    label.textContent = selectEl.options[selectEl.selectedIndex].textContent;
    const caret = document.createElement('i');
    caret.className = 'fas fa-chevron-down text-muted';
    button.appendChild(label);
    button.appendChild(caret);
    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    // build options
    Array.from(selectEl.options).forEach(opt => {
        const o = document.createElement('div');
        o.className = 'custom-option' + (opt.selected ? ' active' : '');
        o.textContent = opt.textContent;
        o.dataset.value = opt.value;
        o.addEventListener('click', () => {
            // update original select
            selectEl.value = opt.value;
            // update label and active class
            menu.querySelectorAll('.custom-option').forEach(x => x.classList.remove('active'));
            o.classList.add('active');
            label.textContent = o.textContent;
            menu.classList.remove('open');
            // trigger change event on original select
            const ev = new Event('change', { bubbles: true });
            selectEl.dispatchEvent(ev);
        });
        menu.appendChild(o);
    });
    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    // toggle
    button.addEventListener('click', () => menu.classList.toggle('open'));
    // close on outside click
    document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) menu.classList.remove('open'); });
    // insert after select
    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
    return { wrapper, button, menu, label };
}


/**
 * Shows/hides the loading spinner and clears/shows result sections.
 * @param {boolean} show - True to show spinner, false to hide.
 */
function showLoading(show) {
    loadingSpinner.classList.toggle('active', show);
    if (show) {
        errorMessage.style.display = 'none';
        // Hide all content sections when loading starts
        [currentWeatherDiv, forecastDiv, aiAdvisoryDiv, cropCareCardsDiv].forEach(el => el.style.display = 'none');
    } else {
        // After loading, if there's data, show relevant sections
        if (lastWeatherData) {
            currentWeatherDiv.style.display = 'block';
            forecastDiv.style.display = 'block';
            aiAdvisoryDiv.style.display = 'block';
            cropCareCardsDiv.style.display = 'grid'; // Use grid for the cards layout
        }
    }
}



/**
 * Displays an error message to the user.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = `<strong>Error:</strong> ${message}`;
    // Also hide other content if an error occurs
    [currentWeatherDiv, forecastDiv, aiAdvisoryDiv, cropCareCardsDiv].forEach(el => el.style.display = 'none');
}

/**
 * Maps Open-Meteo weather codes to Font Awesome icons.
 * @param {number} code - The Open-Meteo weather code.
 * @returns {string} - Font Awesome icon class.
 */
function mapWeatherCodeToIcon(code) {
    switch (Number(code)) {
        case 0:
            return 'fas fa-sun'; // Clear sky
        case 1:
        case 2:
            return 'fas fa-cloud-sun'; // Mainly clear, partly cloudy
        case 3:
            return 'fas fa-cloud'; // Overcast
        case 45:
        case 48:
            return 'fas fa-smog'; // Fog
        case 51:
        case 53:
        case 55:
            return 'fas fa-cloud-drizzle'; // Drizzle
        case 56:
        case 57:
            return 'fas fa-icicles'; // Freezing drizzle
        case 61:
        case 63:
        case 65:
            return 'fas fa-cloud-showers-heavy'; // Rain
        case 66:
        case 67:
            return 'fas fa-cloud-meatball'; // Freezing rain
        case 71:
        case 73:
        case 75:
            return 'fas fa-snowflake'; // Snow
        case 77:
            return 'fas fa-snowflake'; // Snow grains
        case 80:
        case 81:
        case 82:
            return 'fas fa-cloud-showers-heavy'; // Rain showers
        case 85:
        case 86:
            return 'fas fa-snowflake'; // Snow showers
        case 95:
        case 96:
        case 99:
            return 'fas fa-bolt'; // Thunderstorm
        default:
            return 'fas fa-question-circle';
    }
}

/**
 * Returns a human-readable description for an Open-Meteo weather code.
 * @param {number} code - The Open-Meteo weather code.
 * @returns {string} - Weather condition description.
 */
function getWeatherCondition(code) {
    const map = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Light rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Light snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Light rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };
    return map[Number(code)] || "Unknown";
}

// ---- Geocoding and Weather Fetching ----

/**
 * Fetches geographical coordinates for a given city name.
 * @param {string} city - The name of the city.
 * @returns {Promise<object|null>} - A promise that resolves to {latitude, longitude, name, country} or null on error.
 */
async function geocodeCity(city) {
    try {
        // If the user has selected a Pakistan zone explicitly, bias geocoding to country=PK
        let queryName = city;
        // If we have a district mapping helper, see if the input maps to a known Pakistan district
        try {
            if (window.getDistrictFromName) {
                const d = window.getDistrictFromName(city);
                if (d) {
                    // Use the district name + Pakistan to bias geocoder (explicit place hint)
                    queryName = `${d}, Pakistan`;
                }
            }
        } catch (e) {
            // ignore mapping errors and fallback to raw city
        }

        let geocodeUrl = `${GEOCODE_PROXY}?name=${encodeURIComponent(queryName)}&count=1&language=en`;
        try {
            const zoneSelectEl = document.getElementById('zoneSelect');
            if (zoneSelectEl && zoneSelectEl.value && zoneSelectEl.value !== 'auto') {
                // Bias to Pakistan country code to prefer PK matches for ambiguous names
                geocodeUrl += '&countrycodes=PK';
            }
            // Always add countrycodes=PK if our queryName already contains 'Pakistan' as a hint
            if (queryName.toLowerCase().includes('pakistan') && !geocodeUrl.includes('countrycodes=')) {
                geocodeUrl += '&countrycodes=PK';
            }
            // ignore DOM issues and proceed without extra bias
        } catch (e) {
            // ignore DOM issues and proceed without bias
        }

        let response = await fetch(geocodeUrl);
        let data = await response.json();
        if (!response.ok) {
            const errMsg = data?.error || data?.message || 'Failed to lookup location.';
            showError(errMsg);
            return null;
        }
        if (!data.results || data.results.length === 0) {
            showError('City not found. Please try different spelling or a nearby city.');
            return null;
        }
        let primary = data.results[0];

        // If the geocoder returned a non-Pakistan result but our district map suggests a Pakistan district,
        // force a requery using the canonical district + Pakistan to improve accuracy (handles ambiguous names).
        try {
            const mappedDistrict = window.getDistrictFromName ? window.getDistrictFromName(city) : null;
            if (mappedDistrict && primary.country && primary.country.toLowerCase() !== 'pk' && !geocodeUrl.toLowerCase().includes('pakistan')) {
                // Re-query using explicit district + Pakistan hint
                const forcedQuery = `${GEOCODE_PROXY}?name=${encodeURIComponent(mappedDistrict + ', Pakistan')}&count=1&language=en&countrycodes=PK`;
                const forcedResp = await fetch(forcedQuery);
                const forcedData = await forcedResp.json();
                if (!forcedResp.ok) {
                    console.warn('Forced geocode failed:', forcedData?.error || forcedData?.message || forcedResp.statusText);
                } else if (forcedData.results && forcedData.results.length) {
                    primary = forcedData.results[0];
                }
            }
        } catch (e) {
            // ignore and proceed with primary
            console.warn('District requery failed', e);
        }

        const { latitude, longitude, name, country, admin1 } = primary;
        const locationDisplayName = admin1 ? `${name}, ${admin1}` : `${name}, ${country}`;
        return { latitude, longitude, name: locationDisplayName, rawCountry: country };
    } catch (error) {
        console.error('Geocoding API error:', error);
        showError('Failed to get location coordinates. Please try again later.');
        return null;
    }
}

/**
 * Fetches weather data from Open-Meteo for specified coordinates.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Promise<object|null>} - A promise that resolves to the weather data or null on error.
 */
async function fetchOpenMeteoData(lat, lon) {
    // Parameters for daily forecast
    const dailyParams = [
        'temperature_2m_max', 'temperature_2m_min', 'weathercode',
        'relative_humidity_2m_max', 'relative_humidity_2m_min',
        'sunrise', 'sunset', 'precipitation_sum', 'rain_sum'
    ].join(',');

    // Parameters for hourly forecast (up to 7 days for AI, but we'll summarize)
    const hourlyParams = [
        'temperature_2m', 'relative_humidity_2m', 'rain', 'weathercode',
        'soil_temperature_0cm', 'et0_fao_evapotranspiration'
    ].join(',');

    // Construct the full URL
    const url = `${WEATHER_PROXY}?latitude=${lat}&longitude=${lon}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data?.error || data?.message || 'Failed to fetch weather data from server.';
            showError(errorMsg);
            return null;
        }
        if (!data || !data.daily || !data.current_weather || !data.hourly) {
            const errorMsg = data?.reason || 'Unexpected weather response. Please try again.';
            showError(errorMsg);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Weather API error:', error);
        showError(`Failed to fetch weather data. Check your internet connection or try again.`);
        return null;
    }
}

/**
 * Main function to fetch and display all weather and AI-driven insights.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {string} locationName - Human-readable location name.
 */
async function getWeatherAndAdvisory(lat, lon, locationName) {
    showLoading(true); // Show spinner, hide content
    errorMessage.style.display = 'none';

    try {
        const weatherData = await fetchOpenMeteoData(lat, lon);
        if (!weatherData) return; // Error was already shown by fetchOpenMeteoData

        lastWeatherData = weatherData; // Store for AI advisory and refresh
        lastQuery = { lat, lon, name: locationName }; // Store for refresh

        // Determine detected zone and district for UI badges
        try {
            const zoneEl = document.getElementById('detectedZoneBadge');
            const distEl = document.getElementById('detectedDistrictBadge');
            let detectedZone = null;
            let detectedDistrict = null;
            // Prefer district map if available
            if (window.getZoneFromDistrictMap) {
                const z = window.getZoneFromDistrictMap(locationName);
                if (z) detectedZone = z;
            }
            // canonical district
            if (window.getDistrictFromName) detectedDistrict = window.getDistrictFromName(locationName);
            // fallback to name/coords detection
            if (!detectedZone) detectedZone = detectZoneFromName(locationName) || detectZoneFromCoords(lat, lon) || null;

            if (zoneEl) {
                if (detectedZone) {
                    zoneEl.style.display = 'inline-block';
                    zoneEl.textContent = detectedZone;
                    zoneEl.title = `Detected province/zone: ${detectedZone}`;
                    // Punjab-specific styling
                    if (detectedZone === 'Punjab') zoneEl.classList.add('badge-punjab');
                    else zoneEl.classList.remove('badge-punjab');
                } else {
                    zoneEl.style.display = 'none';
                    zoneEl.title = '';
                    zoneEl.classList.remove('badge-punjab');
                }
            }
            if (distEl) {
                if (detectedDistrict) {
                    distEl.style.display = 'inline-block';
                    distEl.textContent = detectedDistrict;
                    distEl.title = `Inferred district: ${detectedDistrict} (from district mapping)`;
                } else {
                    distEl.style.display = 'none';
                    distEl.title = '';
                }
            }
        } catch (e) {
            // ignore UI badge errors
        }

        displayCurrentWeather(weatherData.current_weather, weatherData.daily, locationName);
        displayForecast(weatherData.daily);

        // Evaluate crop suitability for the selected crop and location
        if (cropSelect.value && cropSelect.value !== 'select-crop') {
            try {
                const suitability = evaluateCropSuitability(weatherData, cropSelect.value);
                renderSuitabilityUI(suitability, cropSelect.value, locationName);
            } catch (err) {
                console.error('Suitability evaluation failed:', err);
            }
        }

        // Only generate AI advisories if a crop is selected
        if (cropSelect.value !== 'select-crop') {
            await generateAIAdvisory(weatherData, cropSelect.value, locationName);
            await generateCropCareCards(weatherData, cropSelect.value);
        } else {
            aiAdvisoryDiv.style.display = 'none';
            cropCareCardsDiv.style.display = 'none';
        }

    } catch (error) {
        console.error("Overall process failed:", error);
        showError(`An unexpected error occurred: ${error.message}`);
    } finally {
        showLoading(false); // Hide spinner
    }
}

// ---- Display Functions ----

/**
 * Displays current weather data.
 * @param {object} current - The current_weather object from Open-Meteo.
 * @param {object} daily - The daily data object from Open-Meteo.
 * @param {string} locationName - The human-readable location name.
 */
function displayCurrentWeather(current, daily, locationName) {
    currentCitySpan.textContent = locationName;
    if (current) {
        currentTemperature.textContent = `${Math.round(current.temperature)}°C`;
        currentDescription.textContent = getWeatherCondition(current.weathercode);
        // Open-Meteo lacks direct feels_like in current_weather, so use current temperature
        currentFeelsLike.textContent = `${Math.round(current.temperature)}°C`;
        currentWindSpeed.textContent = `${current.windspeed} m/s`;
        currentWeatherIcon.innerHTML = `<i class="${mapWeatherCodeToIcon(current.weathercode)}"></i>`;
    } else {
        // Fallback if current weather data is somehow missing
        currentTemperature.textContent = 'N/A';
        currentDescription.textContent = 'Unavailable';
        currentFeelsLike.textContent = 'N/A';
        currentWindSpeed.textContent = 'N/A';
        currentWeatherIcon.innerHTML = `<i class="fas fa-question-circle"></i>`;
    }

    // Daily specific for today (index 0)
    const todayIdx = 0;
    if (daily && daily.sunrise && daily.sunrise.length > todayIdx) {
        // Ensure valid date string for parsing
        const sunriseDate = new Date(daily.sunrise[todayIdx]);
        const sunsetDate = new Date(daily.sunset[todayIdx]);

        // Check if dates are valid before formatting
        if (!isNaN(sunriseDate.getTime())) {
            currentSunrise.textContent = sunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            currentSunrise.textContent = '—';
        }
        if (!isNaN(sunsetDate.getTime())) {
            currentSunset.textContent = sunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            currentSunset.textContent = '—';
        }
    } else {
        currentSunrise.textContent = '—';
        currentSunset.textContent = '—';
    }

    if (daily.relative_humidity_2m_max && daily.relative_humidity_2m_max.length > todayIdx &&
        daily.relative_humidity_2m_min && daily.relative_humidity_2m_min.length > todayIdx) {
        currentHumidity.textContent = `${daily.relative_humidity_2m_min[todayIdx]}% - ${daily.relative_humidity_2m_max[todayIdx]}%`;
    } else {
        currentHumidity.textContent = '—';
    }
    currentWeatherDiv.style.display = 'block';
    try {
        // Add subtle entrance + tilt
        if (currentWeatherDiv) {
            currentWeatherDiv.classList.add('card-entrance');
            setTimeout(() => currentWeatherDiv.classList.add('in'), 60);
            enableTilt(currentWeatherDiv, 4);
        }
    } catch (e) { /* ignore visual enhancements errors */ }
}

/**
 * Displays the 5-day weather forecast.
 * @param {object} daily - The daily data object from Open-Meteo.
 */
function displayForecast(daily) {
    forecastGrid.innerHTML = ''; // Clear previous forecast cards
    const daysToShow = Math.min(5, daily.time.length); // Display up to 5 days or available days

    for (let i = 0; i < daysToShow; i++) {
        const dateStr = daily.time[i];
        // Open-Meteo daily time is YYYY-MM-DD, parsing it as such.
        const dt = new Date(dateStr + 'T00:00:00'); // Append T00:00:00 to ensure consistent parsing

        // Check if dt is a valid date
        if (isNaN(dt.getTime())) {
            console.warn(`Invalid date string encountered in forecast: ${dateStr}`);
            continue; // Skip this day if date is invalid
        }

        const dayName = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const tMax = Math.round(daily.temperature_2m_max[i]);
        const tMin = Math.round(daily.temperature_2m_min[i]);
        const wCode = daily.weathercode[i];
        const humMax = daily.relative_humidity_2m_max && daily.relative_humidity_2m_max.length > i ? daily.relative_humidity_2m_max[i] : '—';
        const humMin = daily.relative_humidity_2m_min && daily.relative_humidity_2m_min.length > i ? daily.relative_humidity_2m_min[i] : '—';
        const rainSum = daily.precipitation_sum && daily.precipitation_sum.length > i ? daily.precipitation_sum[i] : 0;

        const card = document.createElement('div');
        card.className = 'forecast-card animate__animated animate__fadeInUp';
        card.innerHTML = `
            <div class="icon"><i class="${mapWeatherCodeToIcon(wCode)}"></i></div>
            <h5>${dayName}</h5>
            <p class="mb-1"><strong>${tMax}°C</strong> / ${tMin}°C</p>
            <p class="text-muted small mb-1">${getWeatherCondition(wCode)}</p>
            <small>Humidity: ${humMin}% - ${humMax}%</small><br/>
            <small>${rainSum > 0 ? `Rain: ${rainSum.toFixed(1)} mm` : 'No Rain'}</small>
        `;
        forecastGrid.appendChild(card);
    }
    // Apply polished entrance and interactions
    const cards = Array.from(forecastGrid.querySelectorAll('.forecast-card'));
    // Staggered entrance
    staggerEntrance(cards, 90);
    // Enable tilt and hover sheen interactions
    cards.forEach(c => enableTilt(c, 6));
    forecastDiv.style.display = 'block';
}

// ---- AI Advisory & Crop Care Cards (Simulated Generative AI) ----

/**
 * Generates an AI-driven crop advisory using weather data and crop type.
 * This simulates a call to a Generative AI model like Google Gemini.
 * @param {object} weatherData - The full Open-Meteo weather response.
 * @param {string} crop - The selected crop type.
 * @param {string} locationName - The name of the location.
 */
async function generateAIAdvisory(weatherData, crop, locationName) {
    aiAdvisoryDiv.style.display = 'block';
    aiAdvisoryContent.innerHTML = '<div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading AI Advisory...</span></div><p class="mt-2 text-muted">Generating crop insights...</p>';

    // --- Prepare prompt for AI ---
    // Extract key weather parameters for the next 5 days
    const dailyForecast = weatherData.daily;
    const hourlyForecast = weatherData.hourly;
    const current = weatherData.current_weather;

    let promptContext = `
        You are an AI agricultural expert providing advice to a farmer in ${locationName} for their ${crop} crop.
        Based on the following 5-day weather forecast, provide a concise, actionable advisory on potential crop risks (pests, diseases, environmental stress) and general protective measures.
        Assume the current date is ${new Date().toLocaleDateString('en-US')}.

        **Current Weather:**
        Temperature: ${current.temperature}°C, Condition: ${getWeatherCondition(current.weathercode)}, Wind: ${current.windspeed} m/s

        **5-Day Daily Forecast:**
    `;

    // Ensure we only iterate over available forecast days, up to 5 for the main advisory summary
    const advisoryDays = Math.min(5, dailyForecast.time.length);
    for (let i = 0; i < advisoryDays; i++) {
        const date = new Date(dailyForecast.time[i]);
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const tempMax = dailyForecast.temperature_2m_max[i];
        const tempMin = dailyForecast.temperature_2m_min[i];
        const humidityMax = dailyForecast.relative_humidity_2m_max[i];
        const humidityMin = dailyForecast.relative_humidity_2m_min[i];
        const rain = dailyForecast.precipitation_sum[i] || 0;
        const weatherDesc = getWeatherCondition(dailyForecast.weathercode[i]);

        promptContext += `
            ${day}: Max Temp ${tempMax}°C, Min Temp ${tempMin}°C, Humidity ${humidityMin}%-${humidityMax}%, Rain ${rain.toFixed(1)}mm, Condition: ${weatherDesc}.
        `;
    }

    // Add hourly data summary for more precision, especially for disease modeling
    // Summarize for the next 48-72 hours (e.g., every 6 or 12 hours)
    promptContext += "\n**Hourly Forecast Summary (next 48 hours):**\n";
    for (let i = 0; i < Math.min(48, hourlyForecast.time.length); i += 6) { // Summarize every 6 hours
        const hourDate = new Date(hourlyForecast.time[i]);
        const hourTemp = hourlyForecast.temperature_2m[i];
        const hourHumidity = hourlyForecast.relative_humidity_2m[i];
        const hourRain = hourlyForecast.rain[i] || 0;
        promptContext += `  ${hourDate.toLocaleString('en-US', {weekday: 'short', hour: '2-digit', minute:'2-digit'})}: Temp ${hourTemp}°C, Hum ${hourHumidity}%, Rain ${hourRain.toFixed(1)}mm.\n`;
    }

    promptContext += `
        Based on this, identify the **overall risk level** (Low, Moderate, High) for pests, diseases, or environmental stress for the ${crop} crop.
        Then, provide:
        1. A brief summary of the weather trend.
        2. Specific potential threats (pests/diseases) with conditions favoring them.
        3. Actionable preventative recommendations.
        4. Include a general disclaimer about local conditions.
        Format the output clearly with headings and bullet points. Indicate the risk level with an appropriate color class (alert-risk-low, alert-risk-moderate, alert-risk-high).
    `;

    try {
        // --- Simulate AI Call (replace with actual Generative AI SDK call) ---
        // This is where you would integrate with your AI model (e.g., Google's Gemini API).
        // For this frontend-only demo, we'll provide a hardcoded AI-like response based on some simple rules
        // derived from the weather data.
        // A real implementation would involve:
        // 1. Sending `promptContext` to your Generative AI backend/API.
        // 2. Receiving a generated text response.
        // 3. Parsing that response if it's structured, or directly displaying it.

        await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate API call delay

        let generatedAdvisoryText = '';
        let detectedRisk = 'Low'; // Default

        // Simple rules for simulated AI advisory
        // Calculate averages/sums for the first 5 days for advisory logic
        const daysForCalculation = Math.min(5, dailyForecast.time.length);
        const maxTempAvg = dailyForecast.temperature_2m_max.slice(0, daysForCalculation).reduce((a, b) => a + b, 0) / daysForCalculation;
        const minTempAvg = dailyForecast.temperature_2m_min.slice(0, daysForCalculation).reduce((a, b) => a + b, 0) / daysForCalculation;
        const totalRain5Days = dailyForecast.precipitation_sum.slice(0, daysForCalculation).reduce((a, b) => a + b, 0);
        const avgHumidityMax = dailyForecast.relative_humidity_2m_max.slice(0, daysForCalculation).reduce((a, b) => a + b, 0) / daysForCalculation;
        const avgHumidityMin = dailyForecast.relative_humidity_2m_min.slice(0, daysForCalculation).reduce((a, b) => a + b, 0) / daysForCalculation;
        const avgHumidity = (avgHumidityMax + avgHumidityMin) / 2; // Average of min/max humidity

        let threats = [];
        let recommendations = [];
        let weatherSummary = `The next five days show average temperatures between ${minTempAvg.toFixed(1)}°C and ${maxTempAvg.toFixed(1)}°C, with total rainfall of ${totalRain5Days.toFixed(1)}mm. Average relative humidity is around ${avgHumidity.toFixed(1)}%.`;

        // Crop-specific simulated logic
        switch (crop.toLowerCase()) {
            case 'wheat':
                if (maxTempAvg > 25 && totalRain5Days > 10 && avgHumidity > 70) {
                    threats.push('High risk of Wheat Rust (Puccinia spp.) due to warm, humid, and rainy conditions.');
                    recommendations.push('Monitor for rust symptoms (orange/brown pustules). Consider preventative fungicide application if previous history of rust in your area.');
                    detectedRisk = 'High';
                } else if (maxTempAvg > 20 && avgHumidity > 60 && totalRain5Days > 0) {
                    threats.push('Moderate risk of powdery mildew or general fungal infections.');
                    recommendations.push('Ensure good air circulation, avoid excessive nitrogen, and scout fields regularly.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                } else if (minTempAvg < 5 && totalRain5Days === 0) {
                     threats.push('Potential for cold stress, affecting early growth. Low risk of frost if temperatures dip below 0°C.');
                     recommendations.push('Monitor minimum temperatures closely. Ensure adequate soil moisture to buffer against temperature changes.');
                     if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                }
                break;
            case 'rice':
                if (maxTempAvg > 30 && totalRain5Days > 20 && avgHumidity > 85) {
                    threats.push('High risk of Bacterial Blight and Rice Blast. Favorable for rapid spread.');
                    recommendations.push('Ensure proper drainage, avoid broad-spectrum insecticides (can flare blight), and use resistant varieties.');
                    detectedRisk = 'High';
                } else if (minTempAvg > 20 && avgHumidity > 80 && totalRain5Days > 5) {
                    threats.push('Moderate risk of fungal diseases like sheath blight and blast.');
                    recommendations.push('Maintain optimal water levels, avoid very dense planting, and scout for early symptoms.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                } else if (minTempAvg < 18 && dailyForecast.time.length > 0 && totalRain5Days > 10) {
                    threats.push('Risk of cold-related stress or reduced growth, especially if combined with wet conditions.');
                    recommendations.push('Ensure good water management to prevent prolonged cold water stress. Consider drainage during cold spells.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                }
                break;
            case 'sugarcane':
                if (maxTempAvg > 32 && avgHumidity > 75) {
                    threats.push('High risk of Red Rot and Top Borer activity due to hot and humid conditions.');
                    recommendations.push('Inspect stalks for lesions/borer holes. Roguing infected plants is crucial. Maintain field hygiene.');
                    detectedRisk = 'High';
                } else if (maxTempAvg > 28 && avgHumidity > 60) {
                    threats.push('Moderate risk of general pest activity like mealybugs and early Red Rot symptoms.');
                    recommendations.push('Regular scouting, especially on leaf sheaths. Ensure balanced fertilization for strong plant health.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                } else if (minTempAvg < 15 && totalRain5Days > 0) {
                    threats.push('Slower growth and potential for ratoon stunting disease to become more prominent under cooler, wet conditions.');
                    recommendations.push('Avoid waterlogging. Ensure proper drainage to prevent fungal issues associated with cooler soil.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                }
                break;
            case 'cotton':
                if (maxTempAvg > 35 && minTempAvg > 25 && avgHumidity < 60 && totalRain5Days < 5) { // Hot and relatively dry for whiteflies
                    threats.push('High risk of Whitefly infestation and associated Cotton Leaf Curl Virus (CLCuV).');
                    recommendations.push('Intensify whitefly monitoring. Consider yellow sticky traps. Use recommended insecticides judiciously and only if threshold is met.');
                    detectedRisk = 'High';
                } else if (maxTempAvg > 30 && avgHumidity > 70 && totalRain5Days > 15) { // Warm, humid, rainy for bacterial blight
                    threats.push('Moderate risk of Bacterial Blight and boll rot if weather persists.');
                    recommendations.push('Ensure good drainage. Avoid waterlogging. Use copper-based fungicides if blight is detected.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                } else if (minTempAvg < 18) {
                    threats.push('Cooler night temperatures might slow boll development or contribute to square/boll shedding.');
                    recommendations.push('Maintain optimal nutrient balance to support plant growth during cooler periods. Ensure adequate soil moisture.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                }
                break;
            case 'maize':
                if (maxTempAvg > 30 && avgHumidity > 70 && totalRain5Days > 10) {
                    threats.push('High risk of Southern Corn Leaf Blight and Maize Stem Borer. Favorable for fungal growth and insect activity.');
                    recommendations.push('Scout for leaf lesions and stem damage. Consider appropriate fungicides/insecticides if symptoms or pest counts are high.');
                    detectedRisk = 'High';
                } else if (maxTempAvg > 25 && avgHumidity > 60) {
                    threats.push('Moderate risk of general fungal diseases and armyworms.');
                    recommendations.push('Maintain good field sanitation. Monitor for early signs of disease or insect damage.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                } else if (minTempAvg < 10) {
                    threats.push('Cool soil temperatures can hinder early seedling emergence and establishment. Risk of chilling injury.');
                    recommendations.push('Delay planting until soil temperatures are consistently above 10-12°C. Ensure good seedbed preparation.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                }
                break;
            default: // General crop advisory
                if (totalRain5Days > 25 && avgHumidity > 80 && maxTempAvg > 25) {
                    threats.push('High risk of general fungal diseases (e.g., blights, mildews) and root rot due to very wet and warm conditions.');
                    recommendations.push('Improve drainage. Avoid over-irrigation. Apply preventative fungicides if applicable.');
                    detectedRisk = 'High';
                } else if (totalRain5Days > 10 && avgHumidity > 70) {
                    threats.push('Moderate risk of fungal diseases and increased pest activity.');
                    recommendations.push('Increase field monitoring. Ensure good plant spacing for air circulation.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                } else if (maxTempAvg > 35 && totalRain5Days < 5) {
                    threats.push('Risk of heat stress and increased water demand. Potential for spider mites in dry conditions.');
                    recommendations.push('Ensure adequate irrigation. Provide shade if possible for sensitive crops. Monitor for mites.');
                    if (detectedRisk === 'Low') detectedRisk = 'Moderate';
                }
                break;
        }

        if (threats.length === 0) {
            threats.push('No significant pest or disease activity is currently indicated by the weather forecast.');
            recommendations.push('Continue routine crop management, field monitoring, and good agricultural practices.');
            weatherSummary = `The weather for the next five days appears largely favorable for your ${crop} crop. ${weatherSummary}`;
        } else {
            weatherSummary = `The weather for the next five days presents some challenges for your ${crop} crop. ${weatherSummary}`;
        }


        const riskClass = `alert-risk-${detectedRisk.toLowerCase()}`;
        currentAdvisoryRisk = detectedRisk; // Update global state for crop care cards

        generatedAdvisoryText = `
            <p>For your <strong>${crop}</strong> crop in <strong>${locationName}</strong>, our AI analysis indicates an
            <span class="${riskClass}"><strong>${detectedRisk} Risk</strong></span> for potential issues.</p>
            <p><strong>Weather Trend Summary:</strong> ${weatherSummary}</p>
            <p><strong>Potential Threats:</strong></p>
            <ul>
                ${threats.map(t => `<li>${t}</li>`).join('')}
            </ul>
            <p><strong>Preventative Recommendations:</strong></p>
            <ul>
                ${recommendations.map(r => `<li>${r}</li>`).join('')}
                <li>Regularly scout your fields (at least twice a week) for early detection of any symptoms or pest presence.</li>
                <li>Ensure proper field sanitation by removing weeds and crop residues, which can act as hosts.</li>
                <li>Consult your local agricultural extension officer for specific, localized advice tailored to your farm.</li>
            </ul>
            <p class="small text-muted"><em>Disclaimer: This advisory is based on current weather forecasts and generalized agricultural models. Always cross-reference with actual field observations and local expert guidance.</em></p>
        `;

        aiAdvisoryContent.innerHTML = generatedAdvisoryText;

    } catch (error) {
        console.error('Error generating AI advisory:', error);
        aiAdvisoryContent.innerHTML = `<p class="text-danger">Failed to generate crop advisory. Please try again later.</p>`;
    }
}

/**
 * Generates and displays dynamic content for Fertilizer, Watering, and Pest Prevention cards.
 * Accepts the Open-Meteo `weatherData` object and the selected `crop` string.
 */
async function generateCropCareCards(weatherData, crop) {
    try {
        // Show the cards container and set small loading placeholders
        cropCareCardsDiv.style.display = 'grid';
        fertilizerAdvisoryContent.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"><span class="visually-hidden">Loading...</span></div>';
        wateringAdvisoryContent.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"><span class="visually-hidden">Loading...</span></div>';
        pestPreventionContent.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"><span class="visually-hidden">Loading...</span></div>';

        // Safely extract arrays with fallbacks
        const daily = weatherData.daily || {};
        const hourly = weatherData.hourly || {};
        const dailyMax = daily.temperature_2m_max || [];
        const dailyMin = daily.temperature_2m_min || [];
        const precipitation = daily.precipitation_sum || daily.rain_sum || [];
        const et0Hourly = hourly.et0_fao_evapotranspiration || [];
        const soilTempHourly = hourly.soil_temperature_0cm || [];

        const forecastDaysCount = Math.min(5, dailyMax.length || 0);
        if (!forecastDaysCount) {
            fertilizerAdvisoryContent.innerHTML = '<p class="text-muted">Insufficient forecast data to compute recommendations.</p>';
            wateringAdvisoryContent.innerHTML = '<p class="text-muted">Insufficient forecast data to compute watering schedule.</p>';
            pestPreventionContent.innerHTML = '<p class="text-muted">Insufficient forecast data to compute pest & disease guidance.</p>';
            return;
        }

        // Compute averages and totals
        let avgMaxTemp = 0, avgMinTemp = 0, totalRain = 0, avgET0 = 0, avgSoilTemp = 0;
        for (let i = 0; i < forecastDaysCount; i++) {
            avgMaxTemp += (dailyMax[i] || 0);
            avgMinTemp += (dailyMin[i] || 0);
            totalRain += (precipitation[i] || 0);

            // Sum hourly ET0 and soil temp for the day
            let dailyEt0Sum = 0;
            let dailySoilSum = 0;
            let soilCount = 0;
            for (let j = i * 24; j < (i + 1) * 24; j++) {
                if (et0Hourly[j] !== undefined && et0Hourly[j] !== null) dailyEt0Sum += et0Hourly[j] || 0;
                if (soilTempHourly[j] !== undefined && soilTempHourly[j] !== null) { dailySoilSum += soilTempHourly[j]; soilCount++; }
            }
            avgET0 += dailyEt0Sum;
            if (soilCount > 0) avgSoilTemp += (dailySoilSum / soilCount);
        }

        avgMaxTemp /= forecastDaysCount;
        avgMinTemp /= forecastDaysCount;
        avgET0 = avgET0 / forecastDaysCount; // average daily ET0
        avgSoilTemp = forecastDaysCount > 0 ? (avgSoilTemp / forecastDaysCount) : null;

        const avgDailyRain = totalRain / forecastDaysCount;

        // --- Fertilizer recommendations (concrete guidance per crop) ---
        const FERT = { N: 'Urea (Nitrogen)', P: 'DAP / SSP (Phosphorus)', K: 'MOP (Potassium)', Zn: 'Zinc Sulfate' };
        let fertItems = [];
        const hotDry = (avgMaxTemp > 28 && avgDailyRain < 5);
        const wet = (avgDailyRain > 20);
        const cool = (avgMaxTemp < 18);

        switch ((crop || '').toLowerCase()) {
            case 'sugarcane':
                fertItems.push(`${FERT.N} — split application: basal + top dress during grand growth.`);
                fertItems.push(`${FERT.P} — at planting/transplanting for roots.`);
                fertItems.push(`${FERT.K} — ensure K for stalk strength.`);
                if (wet) fertItems.push('High rainfall risk: prefer split N or foliar micro-nutrient top-ups after rain.');
                if (hotDry) fertItems.push('Hot/dry — maintain soil moisture pre-application to improve uptake.');
                break;
            case 'wheat':
                fertItems.push(`${FERT.N} — basal at sowing + top-dressing at tillering/jointing.`);
                fertItems.push(`${FERT.P} — at sowing if soil P is low.`);
                fertItems.push(`${FERT.Zn} — consider if soil tests indicate zinc deficiency.`);
                if (wet) fertItems.push('Delay heavy N applications until soil is workable post-rain.');
                if (cool) fertItems.push('Cool soils — prefer smaller split N doses.');
                break;
            case 'rice':
                fertItems.push(`${FERT.N} — time around tillering and panicle initiation; avoid large N before heavy rain.`);
                fertItems.push(`${FERT.P} — early application for establishment.`);
                if (wet) fertItems.push('Heavy rain: consider a small N top-up after rains clear to recover lost N.');
                break;
            case 'cotton':
                fertItems.push(`${FERT.N} — split doses; avoid excessive N close to boll opening.`);
                fertItems.push(`${FERT.P} & ${FERT.K} — ensure adequate P and K early in the season.`);
                if (hotDry) fertItems.push('Hot/dry forecast: ensure irrigation when applying N to promote uptake.');
                break;
            case 'maize':
                fertItems.push(`${FERT.N} — large N demand; split planting + sidedress.`);
                fertItems.push(`${FERT.P} — at planting for early vigor.`);
                fertItems.push(`${FERT.K} — important for grain fill.`);
                if (wet) fertItems.push('High rainfall risk: consider split N or slow-release formulations if available.');
                break;
            default:
                fertItems.push('Balanced N-P-K program; prefer split N applications to reduce leaching.');
                if (wet) fertItems.push('Avoid applying large quantities right before heavy rains.');
                break;
        }

        fertilizerAdvisoryContent.innerHTML = `
            <p><strong>Summary:</strong> Avg Tmax ${avgMaxTemp.toFixed(1)}°C, Avg daily rain ${avgDailyRain.toFixed(1)} mm, Soil temp: ${avgSoilTemp ? avgSoilTemp.toFixed(1) + '°C' : '—'}.</p>
            <p><strong>Fertilizer recommendations for ${crop}:</strong></p>
            <ul>${fertItems.map(i => `<li>${i}</li>`).join('')}</ul>
            <p class="small text-muted"><em>These are general recommendations. Use soil tests for exact rates and local extension advice.</em></p>
        `;

        // --- Watering schedule ---
        let waterLines = [];
        waterLines.push(`<strong>Estimated ET₀:</strong> ${avgET0 ? avgET0.toFixed(1) : '—'} mm/day over the next ${forecastDaysCount} days.`);
        waterLines.push(`<strong>Total forecast rainfall:</strong> ${totalRain.toFixed(1)} mm over ${forecastDaysCount} days.`);

        if (totalRain > (avgET0 * forecastDaysCount * 0.7)) {
            waterLines.push('Reduced irrigation needed: rainfall likely meets much of crop water need.');
            waterLines.push('Monitor soil moisture; resume irrigation when soil begins to dry.');
        } else if (totalRain < (avgET0 * forecastDaysCount * 0.3) && avgMaxTemp > 28) {
            waterLines.push('Increased irrigation likely required: high evaporative demand with low rainfall.');
            waterLines.push('Irrigate early morning or late evening; consider efficient systems (drip) where possible.');
        } else {
            waterLines.push('Regular irrigation recommended based on crop stage and soil moisture checks.');
        }

        // Crop-specific watering notes
        if ((crop || '').toLowerCase() === 'rice') waterLines.push('Maintain appropriate standing water depth for rice paddies based on crop stage.');
        if ((crop || '').toLowerCase() === 'cotton') waterLines.push('Cotton: avoid water stress during flowering and boll formation.');
        if ((crop || '').toLowerCase() === 'wheat') waterLines.push('Wheat: ensure moisture during crown root initiation and flowering stages.');

        wateringAdvisoryContent.innerHTML = `
            <p>${waterLines.map(l => `<div>${l}</div>`).join('')}</p>
            <p class="small text-muted"><em>Adjust irrigation using field checks and local guidance.</em></p>
        `;

        // --- Pest & Disease Prevention ---
        let pestLines = [];
        if (currentAdvisoryRisk === 'High') {
            pestLines.push('<strong>High Alert:</strong> Intensify scouting and be prepared for targeted control measures.');
            pestLines.push('Focus surveillance on known vulnerable crop parts and low-lying wet areas.');
        } else if (currentAdvisoryRisk === 'Moderate') {
            pestLines.push('<strong>Moderate Alert:</strong> Increase monitoring frequency and prepare intervention plans.');
        } else {
            pestLines.push('<strong>Low Risk:</strong> Continue routine monitoring and cultural practices.');
        }

        if (avgDailyRain > 10 && avgMaxTemp > 25) pestLines.push('Warm, humid conditions elevate fungal disease risk; improve air circulation and avoid dense canopies.');
        if (avgMaxTemp > 30 && avgDailyRain < 5) pestLines.push('Hot, dry spells can favor insect pests (e.g., whiteflies, mites). Monitor leaf undersides.');

        pestLines.push('Integrated Pest Management (IPM): combine cultural, biological, and chemical controls as needed.');

        pestPreventionContent.innerHTML = `
            <p><strong>Pest & Disease guidance (based on AI advisory):</strong></p>
            <ul>${pestLines.map(p => `<li>${p}</li>`).join('')}</ul>
            <p class="small text-muted"><em>Combine these with local expert advice and field observations.</em></p>
        `;

        // Apply entrance/stagger and tilt to crop cards
        try {
            const innerCards = Array.from(cropCareCardsDiv.querySelectorAll('.card-block'));
            staggerEntrance(innerCards, 80);
            innerCards.forEach(c => enableTilt(c, 5));
        } catch (e) { /* ignore UI enhancement errors */ }

    } catch (error) {
        console.error('Error generating crop care cards:', error);
        fertilizerAdvisoryContent.innerHTML = `<p class="text-danger">Failed to load fertilizer recommendations.</p>`;
        wateringAdvisoryContent.innerHTML = `<p class="text-danger">Failed to load watering schedule.</p>`;
        pestPreventionContent.innerHTML = `<p class="text-danger">Failed to load pest & disease prevention tips.</p>`;
    }
}

// ---- UI Event Listeners ----
// Wire up controls if they exist in the DOM

// ---- Crop Suitability Evaluation (Pakistan-focused rule-based checks) ----
/**
 * Returns crop-specific threshold guidance. Values are approximate agronomic ranges
 * intended for a quick rule-based suitability check (for Pakistan regions).
 */
function getCropThresholds(crop) {
    const c = (crop || '').toLowerCase();
    const thresholds = {
        wheat: { // winter crop
            idealMax: [15, 25], // °C
            idealMin: [5, 15],
            minSoilTemp: 5,
            minTotalRain5d: 0
        },
        rice: { // Kharif, warm wet
            idealMax: [25, 32],
            idealMin: [20, 26],
            minSoilTemp: 18,
            minTotalRain5d: 20
        },
        cotton: {
            idealMax: [28, 36],
            idealMin: [18, 26],
            minSoilTemp: 16,
            minTotalRain5d: 0
        },
        sugarcane: {
            idealMax: [25, 34],
            idealMin: [18, 26],
            minSoilTemp: 18,
            minTotalRain5d: 10
        },
        maize: {
            idealMax: [20, 30],
            idealMin: [12, 22],
            minSoilTemp: 12,
            minTotalRain5d: 5
        }
    };
    return thresholds[c] || null;
}

/**
 * Evaluate crop suitability using weatherData and basic thresholds.
 * Returns {status: 'Suitable'|'Marginal'|'Unsuitable', reasons: [], metrics: {avgMaxTemp, avgMinTemp, totalRain5d, avgSoilTemp}}
 */
function evaluateCropSuitability(weatherData, crop) {
    const daily = weatherData.daily || {};
    const hourly = weatherData.hourly || {};
    const days = Math.min(5, (daily.time || []).length);
    if (days === 0) throw new Error('Insufficient forecast data for suitability evaluation.');

    const maxArr = daily.temperature_2m_max || [];
    const minArr = daily.temperature_2m_min || [];
    const rainArr = daily.precipitation_sum || daily.rain_sum || [];

    let avgMax = 0, avgMin = 0, totalRain = 0;
    for (let i = 0; i < days; i++) {
        avgMax += (maxArr[i] || 0);
        avgMin += (minArr[i] || 0);
        totalRain += (rainArr[i] || 0);
    }
    avgMax = avgMax / days;
    avgMin = avgMin / days;

    // average soil temp if hourly soil data exists
    let avgSoilTemp = null;
    const soil = hourly.soil_temperature_0cm || [];
    if (soil.length >= days * 24) {
        let sum = 0, count = 0;
        for (let i = 0; i < days * 24; i++) {
            if (typeof soil[i] === 'number') { sum += soil[i]; count++; }
        }
        if (count > 0) avgSoilTemp = sum / count;
    }

    const metrics = { avgMaxTemp: avgMax, avgMinTemp: avgMin, totalRain5d: totalRain, avgSoilTemp };

    const thr = getCropThresholds(crop);
    // If no crop-specific thresholds, do a conservative generic check
    if (!thr) {
        // Generic: unsuitable if avgMax > 40 or avgMin < -5 or total rain extremely low and very hot
        const reasons = [];
        if (avgMax > 40) reasons.push('Extreme daytime heat (avg max > 40°C) likely unsuitable.');
        if (avgMin < -5) reasons.push('Very low night temperatures (avg min < -5°C) likely unsuitable.');
        if (avgMax > 35 && totalRain5d < 5) reasons.push('Very hot and dry conditions — high water demand and heat stress risk.');
        const status = reasons.length === 0 ? 'Suitable' : reasons.length === 1 ? 'Marginal' : 'Unsuitable';
        return { status, reasons, metrics };
    }

    const reasons = [];
    // Check temperature
    if (avgMax > thr.idealMax[1]) reasons.push(`Average daytime temperature (${avgMax.toFixed(1)}°C) is above the recommended upper bound for ${crop}.`);
    if (avgMax < thr.idealMax[0]) reasons.push(`Average daytime temperature (${avgMax.toFixed(1)}°C) is below the typical lower expected range for ${crop}.`);
    if (avgMin > thr.idealMin[1]) reasons.push(`Average night temperature (${avgMin.toFixed(1)}°C) is higher than ideal upper bound for ${crop}.`);
    if (avgMin < thr.idealMin[0]) reasons.push(`Average night temperature (${avgMin.toFixed(1)}°C) is lower than ideal lower bound for ${crop}.`);

    // Soil temp check
    if (thr.minSoilTemp && avgSoilTemp !== null && avgSoilTemp < thr.minSoilTemp) {
        reasons.push(`Soil temperature (~${avgSoilTemp.toFixed(1)}°C) is below recommended minimum (${thr.minSoilTemp}°C) for ${crop} establishment.`);
    }

    // Rainfall/water availability
    if (thr.minTotalRain5d && metrics.totalRain5d < thr.minTotalRain5d) {
        reasons.push(`Forecast rainfall (${metrics.totalRain5d.toFixed(1)} mm over ${days} days) may be insufficient for ${crop} without irrigation.`);
    }

    // Heuristic: classify
    let status = 'Suitable';
    if (reasons.length === 0) status = 'Suitable';
    else if (reasons.length === 1) status = 'Marginal';
    else status = 'Unsuitable';

    return { status, reasons, metrics };
}

/**
 * Renders the suitability UI block and optionally prepends an alert into AI advisory content.
 */
function renderSuitabilityUI(result, crop, locationName) {
    const section = document.getElementById('suitabilitySection');
    const container = document.getElementById('suitabilityContent');
    if (!section || !container) return;
    section.style.display = 'block';

    const metricLines = `Avg Max: ${result.metrics.avgMaxTemp.toFixed(1)}°C, Avg Min: ${result.metrics.avgMinTemp.toFixed(1)}°C, Rain(5d): ${result.metrics.totalRain5d.toFixed(1)} mm${result.metrics.avgSoilTemp ? ', Soil: ' + result.metrics.avgSoilTemp.toFixed(1) + '°C' : ''}`;

    let statusHtml = '';
    const zoneText = result.zone ? ` (${result.zone})` : '';
    const customBadge = result.isCustom ? `<span class="badge bg-warning text-dark ms-2" title="Custom thresholds active">Custom</span>` : '';
    if (result.status === 'Suitable') statusHtml = `<div class="alert-risk-low"><strong>Suitable</strong> — conditions look generally favorable for <strong>${crop}</strong> in ${locationName}${zoneText}.</div>${customBadge}`;
    else if (result.status === 'Marginal') {
        const cls = result.zone === 'Punjab' ? 'punjab-alert-moderate' : 'alert-risk-moderate';
        statusHtml = `<div class="${cls}"><strong>Marginal</strong> — some conditions may limit <strong>${crop}</strong> production in ${locationName}${zoneText}. See reasons below.</div>${customBadge}`;
    } else {
        const cls = result.zone === 'Punjab' ? 'punjab-alert-high' : 'alert-risk-high';
        statusHtml = `<div class="${cls}"><strong>Unsuitable</strong> — weather/soil indicated is likely to limit successful <strong>${crop}</strong> production in ${locationName}${zoneText}.</div>${customBadge}`;
    }

    container.innerHTML = `
        ${statusHtml}
        <p><strong>Key metrics:</strong> ${metricLines}</p>
        ${result.reasons && result.reasons.length ? `<p><strong>Reasons / concerns:</strong></p><ul>${result.reasons.map(r => `<li>${r}</li>`).join('')}</ul>` : `<p>No major concerns detected for the next ${Math.min(5, (lastWeatherData && lastWeatherData.daily && lastWeatherData.daily.time) ? lastWeatherData.daily.time.length : 5)} days.</p>`}
        <p class="small text-muted"><em>These assessments are rule-based and approximate. For farm-level decisions, consult local extension services and use soil tests.</em></p>
    `;

    // Prepend alert to AI advisory if Unsuitable or Marginal
    if (result.status === 'Unsuitable' || result.status === 'Marginal') {
        const advisory = document.getElementById('aiAdvisoryContent');
        if (advisory) {
            const banner = document.createElement('div');
            const bannerCls = (result.zone === 'Punjab') ? (result.status === 'Unsuitable' ? 'punjab-alert-high' : 'punjab-alert-moderate') : (result.status === 'Unsuitable' ? 'alert-risk-high' : 'alert-risk-moderate');
            banner.className = bannerCls;
            banner.style.marginBottom = '10px';
            banner.innerHTML = `<strong>Suitability Alert:</strong> ${result.status} for ${crop} at ${locationName}${result.zone ? ' (' + result.zone + ')' : ''}.`;
            // Remove previous top-banner if exists
            const existing = advisory.querySelector('.suitability-alert-banner');
            if (existing) existing.remove();
            banner.classList.add('suitability-alert-banner');
            advisory.prepend(banner);
        }
    }
}
if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        const city = cityInput && cityInput.value ? cityInput.value.trim() : '';
        if (!city) {
            showError('Please enter a city name.');
            return;
        }
        showLoading(true);
        const loc = await geocodeCity(city);
        if (loc) {
            await getWeatherAndAdvisory(loc.latitude, loc.longitude, loc.name);
        } else {
            showLoading(false);
        }
    });
}

if (locBtn) {
    locBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser.');
            return;
        }
        showLoading(true);
        // visual pulse while locating
        try { toggleLocPulse(true); } catch (e) {}
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try { await getWeatherAndAdvisory(pos.coords.latitude, pos.coords.longitude, 'Your Location'); } finally { try { toggleLocPulse(false); } catch (e) {} }
        }, (err) => {
            console.error('Geolocation error', err);
            showError('Unable to retrieve your location. Please search by city.');
            try { toggleLocPulse(false); } catch (e) {}
            showLoading(false);
        }, { timeout: 12000 });
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
        if (!lastQuery) {
            showError('No previous location to refresh.');
            return;
        }
        await getWeatherAndAdvisory(lastQuery.lat, lastQuery.lon, lastQuery.name);
    });
}

if (cropSelect) {
    cropSelect.addEventListener('change', async () => {
        if (lastWeatherData && lastQuery) {
            await generateAIAdvisory(lastWeatherData, cropSelect.value, lastQuery.name);
            await generateCropCareCards(lastWeatherData, cropSelect.value);
            try {
                const suitability = evaluateCropSuitability(lastWeatherData, cropSelect.value);
                renderSuitabilityUI(suitability, cropSelect.value, lastQuery.name);
            } catch (err) {
                console.error('Suitability evaluation on crop change failed:', err);
            }
        }
    });
}

if (cityInput) {
    cityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (searchBtn) searchBtn.click();
        }
    });
}

// ---- Zone detection and threshold storage ----
/**
 * Basic zone detection based on lat/lon to pick a broad Pakistan region.
 * This is approximate and intended only for defaults; users can override via UI.
 */
function detectZoneFromCoords(lat, lon) {
    // Simple bounding checks (approximate)
    // Punjab roughly: lat 27.5-33.5, lon 69.5-75.5
    if (lat >= 27.5 && lat <= 33.5 && lon >= 69.5 && lon <= 75.5) return 'Punjab';
    // Sindh roughly: lat 23.5-28.0, lon 67.0-71.5
    if (lat >= 23.5 && lat <= 28.0 && lon >= 67.0 && lon <= 71.5) return 'Sindh';
    // KPK roughly: lat 31.0-36.5, lon 69.0-74.5
    if (lat >= 31.0 && lat <= 36.5 && lon >= 69.0 && lon <= 74.5) return 'KPK';
    // Balochistan roughly: lat 24.0-30.5, lon 61.0-70.5
    if (lat >= 24.0 && lat <= 30.5 && lon >= 61.0 && lon <= 70.5) return 'Balochistan';
    // Gilgit-Baltistan / North: lat > 35
    if (lat > 35) return 'Gilgit';
    return 'Punjab'; // default fallback
}

/**
 * Detect zone from a location name (city/admin) using known city lists.
 */
function detectZoneFromName(name) {
    if (!name || typeof name !== 'string') return null;
    const n = name.toLowerCase();
    // Prefer district map if available
    if (window.getZoneFromDistrictMap) {
        const mapped = window.getZoneFromDistrictMap(n);
        if (mapped) {
            // If the raw name contains 'india' or 'uttar pradesh' but the district map maps to a Pakistan province,
            // prefer the district map (handles ambiguous place names like 'Sanawan').
            return mapped;
        }
    }
    const punjabCities = [
        'lahore','faisalabad','rawalpindi','gujranwala','sialkot','sargodha','multan','bahawalpur','dera ghazi khan','dg khan','dgkhan',
        'muzaffargarh','muzaffar garh','muzaffar', 'muzaffargar', 'rahim yar khan','ry khan','rahim yar', 'kasur','sheikhupura','okara','sahiwal',
        'pakpattan','toba tek singh','toba','jhang','chiniot','hafizabad','gujrat','mandi bahauddin','narowal','khushab','bhakkar','mianwali',
        'bahawalnagar','lodhran','vehari','daska','kot addu','kot-addu','kot addu','sanawan','sangla hill','nankana','nankana sahib','chiaot',
        'pakpattan','chishtian','shujabad','jalalpur peerzaman','dera','dera sahib'
    ];
    for (const c of punjabCities) {
        if (n.includes(c)) return 'Punjab';
    }
    // fallback: check province names
    if (n.includes('punjab')) return 'Punjab';
    if (n.includes('sindh')) return 'Sindh';
    if (n.includes('khyber') || n.includes('kpk') || n.includes('pakhtunkhwa')) return 'KPK';
    if (n.includes('baloch') || n.includes('balochistan')) return 'Balochistan';
    if (n.includes('gilgit') || n.includes('skardu') || n.includes('hunza')) return 'Gilgit';
    return null;
}

const THRESHOLD_KEY = 'farmerAid_thresholds_v1';

function loadCustomThresholds() {
    try {
        const raw = localStorage.getItem(THRESHOLD_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load thresholds from storage', e);
        return {};
    }
}

function saveCustomThresholds(obj) {
    try {
        localStorage.setItem(THRESHOLD_KEY, JSON.stringify(obj));
    } catch (e) {
        console.error('Failed to save thresholds to storage', e);
    }
}

/**
 * When evaluating thresholds, prefer custom saved thresholds for zone+crop if present.
 */
function getEffectiveThresholds(crop, zone, district) {
    const custom = loadCustomThresholds();
    const key = `${zone || 'default'}::${crop.toLowerCase()}`;
    if (custom && custom[key]) return custom[key];
    // Zone-specific built-in defaults (Punjab tuned)
    const zoneDefaults = {
        Punjab: {
            wheat: { idealMax: [12, 24], idealMin: [4, 14], minSoilTemp: 5, minTotalRain5d: 0 },
            rice: { idealMax: [28, 34], idealMin: [22, 28], minSoilTemp: 20, minTotalRain5d: 25 },
            cotton: { idealMax: [30, 38], idealMin: [20, 28], minSoilTemp: 18, minTotalRain5d: 0 },
            sugarcane: { idealMax: [26, 34], idealMin: [20, 28], minSoilTemp: 20, minTotalRain5d: 15 },
            maize: { idealMax: [22, 32], idealMin: [14, 24], minSoilTemp: 14, minTotalRain5d: 5 }
        }
        // Additional zone defaults can be added here
    };
    // If district-level thresholds for Punjab are available, prefer those
    try {
        if (zone === 'Punjab' && district && window.getPunjabDistrictThreshold) {
            const dt = window.getPunjabDistrictThreshold(district, crop);
            if (dt) return dt;
        }
    } catch (e) {
        // ignore and continue
    }

    if (zone && zoneDefaults[zone] && zoneDefaults[zone][crop.toLowerCase()]) return zoneDefaults[zone][crop.toLowerCase()];
    return getCropThresholds(crop);
}

// Monkey-patch evaluateCropSuitability to use getEffectiveThresholds
const __origEvaluate = evaluateCropSuitability;
function evaluateCropSuitability(weatherData, crop) {
    // Try to detect zone and district from UI, coords, or location name
    const zoneSelectEl = document.getElementById('zoneSelect');
    let zone = zoneSelectEl ? zoneSelectEl.value : 'auto';
    let district = null;
    if (zone === 'auto') {
        // first try by location name
        if (lastQuery && lastQuery.name) {
            const zFromName = detectZoneFromName(lastQuery.name);
            if (zFromName) zone = zFromName;
            // also try to get canonical district
            try {
                if (window.getDistrictFromName) district = window.getDistrictFromName(lastQuery.name);
            } catch (e) {
                district = null;
            }
        }
        // fallback to coords detection
        if (zone === 'auto' && lastQuery && lastQuery.lat && lastQuery.lon) {
            zone = detectZoneFromCoords(lastQuery.lat, lastQuery.lon);
        }
    }

    // Get thresholds: saved custom for zone+crop first, otherwise default
    const customObj = loadCustomThresholds();
    const customKey = `${zone || 'default'}::${(crop || '').toLowerCase()}`;
    const isCustom = !!(customObj && customObj[customKey]);
    const eff = getEffectiveThresholds(crop, zone, district);
    if (!eff) return __origEvaluate(weatherData, crop); // fall back to original logic

    // Now copy original evaluator but using eff instead of getCropThresholds
    const daily = weatherData.daily || {};
    const hourly = weatherData.hourly || {};
    const days = Math.min(5, (daily.time || []).length);
    if (days === 0) throw new Error('Insufficient forecast data for suitability evaluation.');

    const maxArr = daily.temperature_2m_max || [];
    const minArr = daily.temperature_2m_min || [];
    const rainArr = daily.precipitation_sum || daily.rain_sum || [];

    let avgMax = 0, avgMin = 0, totalRain = 0;
    for (let i = 0; i < days; i++) {
        avgMax += (maxArr[i] || 0);
        avgMin += (minArr[i] || 0);
        totalRain += (rainArr[i] || 0);
    }
    avgMax = avgMax / days;
    avgMin = avgMin / days;

    let avgSoilTemp = null;
    const soil = hourly.soil_temperature_0cm || [];
    if (soil.length >= days * 24) {
        let sum = 0, count = 0;
        for (let i = 0; i < days * 24; i++) {
            if (typeof soil[i] === 'number') { sum += soil[i]; count++; }
        }
        if (count > 0) avgSoilTemp = sum / count;
    }

    const metrics = { avgMaxTemp: avgMax, avgMinTemp: avgMin, totalRain5d: totalRain, avgSoilTemp };

    const thr = eff; // use effective thresholds
    const reasons = [];
    if (avgMax > thr.idealMax[1]) reasons.push(`Average daytime temperature (${avgMax.toFixed(1)}°C) is above the recommended upper bound for ${crop}.`);
    if (avgMax < thr.idealMax[0]) reasons.push(`Average daytime temperature (${avgMax.toFixed(1)}°C) is below the typical lower expected range for ${crop}.`);
    if (avgMin > thr.idealMin[1]) reasons.push(`Average night temperature (${avgMin.toFixed(1)}°C) is higher than ideal upper bound for ${crop}.`);
    if (avgMin < thr.idealMin[0]) reasons.push(`Average night temperature (${avgMin.toFixed(1)}°C) is lower than ideal lower bound for ${crop}.`);

    if (thr.minSoilTemp && avgSoilTemp !== null && avgSoilTemp < thr.minSoilTemp) {
        reasons.push(`Soil temperature (~${avgSoilTemp.toFixed(1)}°C) is below recommended minimum (${thr.minSoilTemp}°C) for ${crop} establishment.`);
    }

    if (thr.minTotalRain5d && metrics.totalRain5d < thr.minTotalRain5d) {
        reasons.push(`Forecast rainfall (${metrics.totalRain5d.toFixed(1)} mm over ${days} days) may be insufficient for ${crop} without irrigation.`);
    }

    let status = 'Suitable';
    if (reasons.length === 0) status = 'Suitable';
    else if (reasons.length === 1) status = 'Marginal';
    else status = 'Unsuitable';

    return { status, reasons, metrics, zone, isCustom };
}

// Modal and threshold editor wiring
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements to previously-declared variables
    searchBtn = document.getElementById('searchBtn');
    locBtn = document.getElementById('locBtn');
    refreshBtn = document.getElementById('refreshBtn');
    cityInput = document.getElementById('cityInput');
    cropSelect = document.getElementById('cropSelect');
    zoneSelect = document.getElementById('zoneSelect');
    const heroCheckBtn = document.getElementById('heroCheckBtn');
    const heroForecastBtn = document.getElementById('heroForecastBtn');
    loadingSpinner = document.getElementById('loadingSpinner');
    errorMessage = document.getElementById('errorMessage');

    // Current Weather Elements
    currentWeatherDiv = document.getElementById('currentWeather');
    currentCitySpan = document.getElementById('currentCity');
    currentWeatherIcon = document.getElementById('currentWeatherIcon');
    currentTemperature = document.getElementById('currentTemperature');
    currentDescription = document.getElementById('currentDescription');
    currentFeelsLike = document.getElementById('currentFeelsLike');
    currentHumidity = document.getElementById('currentHumidity');
    currentWindSpeed = document.getElementById('currentWindSpeed');
    currentSunrise = document.getElementById('currentSunrise');
    currentSunset = document.getElementById('currentSunset');

    // Forecast Elements
    forecastDiv = document.getElementById('forecast');
    forecastGrid = document.getElementById('forecastGrid');

    // AI Advisory Elements
    aiAdvisoryDiv = document.getElementById('aiAdvisory');
    aiAdvisoryContent = document.getElementById('aiAdvisoryContent');

    // Crop Care Cards Elements
    cropCareCardsDiv = document.getElementById('cropCareCards');
    fertilizerAdvisoryContent = document.getElementById('fertilizerAdvisoryContent');
    wateringAdvisoryContent = document.getElementById('wateringAdvisoryContent');
    pestPreventionContent = document.getElementById('pestPreventionContent');

    copyYear = document.getElementById('copyYear');
    if (copyYear) copyYear.textContent = new Date().getFullYear();

    // Modal elements
    const editBtn = document.getElementById('editThresholdsBtn');
    const modal = document.getElementById('thresholdModal');
    const modalCrop = document.getElementById('modalCropSelect');
    const modalZone = document.getElementById('modalZoneSelect');
    const saveBtn = document.getElementById('saveThresholdBtn');
    const bsModal = modal ? new bootstrap.Modal(modal) : null;

    // Apply ripple to main action buttons (including hero CTAs)
    try {
        [searchBtn, refreshBtn, editBtn, locBtn, heroCheckBtn, heroForecastBtn].filter(Boolean).forEach(b => applyButtonRipple(b));
    } catch (e) { /* ignore */ }

    // Build custom select for cropSelect (animated options) while keeping original select value
    let cropCustom = null;
    try {
        if (cropSelect) {
            cropCustom = createCustomSelect(cropSelect);
            // when original select changes (programmatically or by custom options), ensure UI reflects
            cropSelect.addEventListener('change', () => {
                try {
                    if (cropCustom && cropCustom.label) cropCustom.label.textContent = cropSelect.options[cropSelect.selectedIndex].textContent;
                } catch (e) {}
            });
        }
    } catch (e) { /* ignore custom select build errors */ }

    // Give hero CTAs a small staggered entrance for hero polish
    try {
        staggerEntrance([heroCheckBtn, heroForecastBtn].filter(Boolean), 120);
    } catch (e) { /* ignore */ }

    // Location button pulse while retrieving geolocation
    function toggleLocPulse(active) {
        try { if (locBtn) locBtn.classList.toggle('active', !!active); } catch (e) {}
    }

    // Sync modal crop/zone with main controls when opening
    if (editBtn && modal && bsModal) {
        editBtn.addEventListener('click', () => {
            // Pre-select modal crop from main cropSelect if available
            try {
                if (cropSelect && modalCrop) modalCrop.value = cropSelect.value || modalCrop.value;
                if (zoneSelect && modalZone) modalZone.value = zoneSelect.value || modalZone.value || 'default';
            } catch (e) { /* ignore */ }

            // load defaults for selected crop into modal
            const c = (modalCrop.value || 'Wheat');
            const thr = getCropThresholds(c) || { idealMax: [0, 0], idealMin: [0, 0], minSoilTemp: 0, minTotalRain5d: 0 };
            document.getElementById('idealMaxLower').value = thr.idealMax[0];
            document.getElementById('idealMaxUpper').value = thr.idealMax[1];
            document.getElementById('idealMinLower').value = thr.idealMin[0];
            document.getElementById('idealMinUpper').value = thr.idealMin[1];
            document.getElementById('minSoilTemp').value = thr.minSoilTemp || '';
            document.getElementById('minTotalRain5d').value = thr.minTotalRain5d || '';
            bsModal.show();
        });
    }

    // Temp cache for last deleted custom thresholds to support Undo
    let _lastDeletedThreshold = null;

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const crop = (document.getElementById('modalCropSelect').value || 'Other');
            const zone = (document.getElementById('modalZoneSelect').value || 'default');
            const key = `${zone}::${crop.toLowerCase()}`;
            const obj = loadCustomThresholds();
            obj[key] = {
                idealMax: [Number(document.getElementById('idealMaxLower').value || 0), Number(document.getElementById('idealMaxUpper').value || 0)],
                idealMin: [Number(document.getElementById('idealMinLower').value || 0), Number(document.getElementById('idealMinUpper').value || 0)],
                minSoilTemp: Number(document.getElementById('minSoilTemp').value || 0),
                minTotalRain5d: Number(document.getElementById('minTotalRain5d').value || 0)
            };
            saveCustomThresholds(obj);
            // show save toast (green)
            try {
                const toastEl = document.getElementById('thresholdToast');
                const toastBody = document.getElementById('thresholdToastBody');
                if (toastEl) {
                    toastEl.classList.remove('text-bg-danger');
                    toastEl.classList.add('text-bg-success');
                }
                if (toastBody) toastBody.innerHTML = `Thresholds saved for <strong>${crop}</strong> (${zone}).`;
                if (toastEl) {
                    const t = new bootstrap.Toast(toastEl, { delay: 3000 });
                    t.show();
                }
            } catch (e) { /* ignore toast errors */ }
            // close modal
            const modalEl = document.getElementById('thresholdModal');
            const bs = bootstrap.Modal.getInstance(modalEl);
            if (bs) bs.hide();
        });
    }

    // Add a small reset button into modal footer dynamically for convenience
    try {
        const modalFooter = modal ? modal.querySelector('.modal-footer') : null;
        if (modalFooter && !modalFooter.querySelector('#resetThresholdsBtn')) {
            const resetBtn = document.createElement('button');
            resetBtn.id = 'resetThresholdsBtn';
            resetBtn.type = 'button';
            resetBtn.className = 'btn btn-outline-danger me-auto';
            resetBtn.textContent = 'Reset to Defaults';
            modalFooter.insertBefore(resetBtn, modalFooter.firstChild);
            resetBtn.addEventListener('click', () => {
                try {
                    // Remove all custom keys for this zone+crop if present
                    const crop = (document.getElementById('modalCropSelect').value || 'Other');
                    const zone = (document.getElementById('modalZoneSelect').value || 'default');
                    const key = `${zone}::${crop.toLowerCase()}`;
                    const obj = loadCustomThresholds();
                    if (obj && obj[key]) {
                        // Cache deleted entry for potential undo
                        _lastDeletedThreshold = { key, value: obj[key] };
                        delete obj[key];
                        saveCustomThresholds(obj);
                    }
                    // reload defaults into modal inputs
                    const thr = getCropThresholds(crop) || { idealMax: [0,0], idealMin: [0,0], minSoilTemp:0, minTotalRain5d:0 };
                    document.getElementById('idealMaxLower').value = thr.idealMax[0];
                    document.getElementById('idealMaxUpper').value = thr.idealMax[1];
                    document.getElementById('idealMinLower').value = thr.idealMin[0];
                    document.getElementById('idealMinUpper').value = thr.idealMin[1];
                    document.getElementById('minSoilTemp').value = thr.minSoilTemp || '';
                    document.getElementById('minTotalRain5d').value = thr.minTotalRain5d || '';
                    // show reset toast (red) with Undo link
                    try {
                        const toastEl = document.getElementById('thresholdToast');
                        const toastBody = document.getElementById('thresholdToastBody');
                        if (toastEl) {
                            toastEl.classList.remove('text-bg-success');
                            toastEl.classList.add('text-bg-danger');
                        }
                        if (toastBody) toastBody.innerHTML = `Custom thresholds reset for <strong>${crop}</strong> (${zone}). <a href="#" id="undoThresholdsLink">Undo</a>`;
                        if (toastEl) {
                            const t = new bootstrap.Toast(toastEl, { delay: 6000 });
                            t.show();
                            // Attach Undo handler
                            setTimeout(() => {
                                const undo = document.getElementById('undoThresholdsLink');
                                if (undo) {
                                    undo.addEventListener('click', (ev) => {
                                        ev.preventDefault();
                                        try {
                                            if (_lastDeletedThreshold) {
                                                const store = loadCustomThresholds();
                                                store[_lastDeletedThreshold.key] = _lastDeletedThreshold.value;
                                                saveCustomThresholds(store);
                                                // Show a success toast for undo
                                                if (toastEl) {
                                                    toastEl.classList.remove('text-bg-danger');
                                                    toastEl.classList.add('text-bg-success');
                                                }
                                                if (toastBody) toastBody.innerHTML = `Restored custom thresholds for <strong>${crop}</strong> (${zone}).`;
                                                const t2 = new bootstrap.Toast(toastEl, { delay: 3000 });
                                                t2.show();
                                                _lastDeletedThreshold = null;
                                            }
                                        } catch (err) { console.error('Undo failed', err); }
                                    });
                                }
                            }, 50);
                        }
                    } catch (e) { /* ignore */ }
                    } catch (e) { console.error('Reset thresholds failed', e); }
            });
        }
    } catch (e) { /* ignore */ }

    // Wire other UI event listeners that were previously top-level
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const city = cityInput && cityInput.value ? cityInput.value.trim() : '';
            if (!city) {
                showError('Please enter a city name.');
                return;
            }
            showLoading(true);
            const loc = await geocodeCity(city);
            if (loc) {
                await getWeatherAndAdvisory(loc.latitude, loc.longitude, loc.name);
            } else {
                showLoading(false);
            }
        });
    }

    if (locBtn) {
        locBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showError('Geolocation is not supported by your browser.');
                return;
            }
            showLoading(true);
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await getWeatherAndAdvisory(pos.coords.latitude, pos.coords.longitude, 'Your Location');
            }, (err) => {
                console.error('Geolocation error', err);
                showError('Unable to retrieve your location. Please search by city.');
                showLoading(false);
            }, { timeout: 12000 });
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (!lastQuery) {
                showError('No previous location to refresh.');
                return;
            }
            await getWeatherAndAdvisory(lastQuery.lat, lastQuery.lon, lastQuery.name);
        });
    }

    if (cropSelect) {
        cropSelect.addEventListener('change', async () => {
            if (lastWeatherData && lastQuery) {
                await generateAIAdvisory(lastWeatherData, cropSelect.value, lastQuery.name);
                await generateCropCareCards(lastWeatherData, cropSelect.value);
                try {
                    const suitability = evaluateCropSuitability(lastWeatherData, cropSelect.value);
                    renderSuitabilityUI(suitability, cropSelect.value, lastQuery.name);
                } catch (err) {
                    console.error('Suitability evaluation on crop change failed:', err);
                }
            }
        });
    }

    if (cityInput) {
        cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (searchBtn) searchBtn.click();
            }
        });
    }
});
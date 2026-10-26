// FAU Owls Weather — live data from Open-Meteo (no API key needed)

const DEFAULT_PLACE = { name: 'Boca Raton, FL', lat: 26.3683, lon: -80.1289 };

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud: '<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4"/><path d="M15.9 13A4 4 0 0 0 8.1 11"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z"/>',
  rain: '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  storm: '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M13 12l-3 5h4l-3 5"/>',
  snow: '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>',
  fog: '<path d="M4 9h16M3 13h18M5 17h14"/>'
};

const HERO_SUN = '<circle cx="12" cy="12" r="4.5" fill="#FFD1E6"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';

// WMO weather codes → [icon, short label, hero line, outfit tip]
function describe(code) {
  if (code === 0) return ['sun', 'Sunny', 'Sunny & fabulous', 'Sunnies, SPF and something pink. Perfect pool-day weather.'];
  if (code <= 2) return ['cloud', 'Partly cloudy', 'Partly cloudy & cute', 'A light top and sunnies — the sun is playing peekaboo.'];
  if (code === 3) return ['cloud', 'Cloudy', 'Cloudy but cozy', 'Comfy layers in pastel pink. Still bring the SPF!'];
  if (code <= 48) return ['fog', 'Foggy', 'Dreamy & foggy', 'Something bright so everyone can spot you in the haze.'];
  if (code <= 67 || (code >= 80 && code <= 82)) return ['rain', 'Showers', 'Rainy but radiant', 'Grab a pink umbrella and water-friendly shoes.'];
  if (code <= 77 || code === 85 || code === 86) return ['snow', 'Snow', 'Snowy & sparkly', 'Bundle up in your fluffiest pink coat.'];
  return ['storm', 'Storms', 'Stormy — stay in style', 'Stay inside, stay cute. Thunderstorms around.'];
}

const state = { unit: localStorage.getItem('unit') || 'F', place: DEFAULT_PLACE, data: null };

const $ = (id) => document.getElementById(id);
const svg = (paths, extra = '') =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;
const toUnit = (f) => Math.round(state.unit === 'F' ? f : (f - 32) * 5 / 9);

function setStatus(msg) {
  const el = $('status');
  el.textContent = msg || '';
  el.hidden = !msg;
}

async function fetchWeather({ lat, lon }) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
    timezone: 'auto', forecast_days: 7
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('Weather service unavailable');
  return res.json();
}

async function geocode(query) {
  const params = new URLSearchParams({ name: query, count: 1, language: 'en', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) throw new Error('City search unavailable');
  const json = await res.json();
  const hit = json.results && json.results[0];
  if (!hit) return null;
  const region = hit.country_code === 'US' ? usState(hit.admin1) : hit.country;
  return { name: region ? `${hit.name}, ${region}` : hit.name, lat: hit.latitude, lon: hit.longitude };
}

const US_STATES = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC' };
const usState = (name) => US_STATES[name] || name;

function render() {
  const d = state.data;
  if (!d) return;
  const c = d.current;
  const [icon, , heroLine, tip] = describe(c.weather_code);
  const metric = state.unit === 'C';

  $('place').textContent = state.place.name;
  $('local-time').textContent = new Date().toLocaleString('en-US', {
    timeZone: d.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).replace(/, (\d+:)/, ' · $1');

  $('hero-icon').innerHTML = icon === 'sun' && c.is_day
    ? svg(HERO_SUN, 'stroke="#FFFFFF" stroke-width="1.6"')
    : svg(ICONS[icon], 'stroke="#FFFFFF" stroke-width="1.6"');
  $('temp').textContent = toUnit(c.temperature_2m);
  $('unit').textContent = state.unit;
  $('condition').textContent = heroLine;
  $('feels').textContent = toUnit(c.apparent_temperature);
  $('humidity').textContent = Math.round(c.relative_humidity_2m);
  $('wind').textContent = Math.round(metric ? c.wind_speed_10m * 1.609 : c.wind_speed_10m);
  $('wind-unit').textContent = metric ? 'km/h' : 'mph';
  $('precip').textContent = metric ? (c.precipitation * 25.4).toFixed(1) : c.precipitation.toFixed(2);
  $('precip-unit').textContent = metric ? 'mm' : 'in';
  $('tip').textContent = tip;

  $('days').innerHTML = d.daily.time.map((iso, i) => {
    const date = new Date(`${iso}T12:00:00`);
    const [dayIcon, label] = describe(d.daily.weather_code[i]);
    return `<div class="day">
      <p class="day-name">${i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
      <p class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      <div class="day-icon">${svg(ICONS[dayIcon])}</div>
      <p class="day-cond">${label}</p>
      <p class="day-temps">${toUnit(d.daily.temperature_2m_max[i])}° <span>${toUnit(d.daily.temperature_2m_min[i])}°</span></p>
    </div>`;
  }).join('');

  document.querySelectorAll('.unit-toggle button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.unit === state.unit));
  });
}

async function load(place) {
  setStatus('');
  try {
    state.data = await fetchWeather(place);
    state.place = place;
    render();
  } catch (err) {
    setStatus(`Oops! ${err.message}. Please try again.`);
  }
}

// Search
$('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('city-search').value.trim();
  if (!q) return;
  try {
    const place = await geocode(q);
    if (!place) return setStatus(`We couldn't find "${q}". Try another city.`);
    await load(place);
    $('city-search').value = '';
  } catch (err) {
    setStatus(`Oops! ${err.message}. Please try again.`);
  }
});

// My Location
$('locate-btn').addEventListener('click', () => {
  if (!navigator.geolocation) return setStatus('Location is not supported in this browser.');
  const btn = $('locate-btn');
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      btn.disabled = false;
      await load({ name: 'My Location', lat: pos.coords.latitude, lon: pos.coords.longitude });
    },
    () => {
      btn.disabled = false;
      setStatus('We could not get your location. Check your browser permissions.');
    }
  );
});

// °F / °C
document.querySelectorAll('.unit-toggle button').forEach((b) => {
  b.addEventListener('click', () => {
    state.unit = b.dataset.unit;
    localStorage.setItem('unit', state.unit);
    render();
  });
});

// Dark mode
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}
applyTheme(localStorage.getItem('theme') || 'light');
$('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

load(DEFAULT_PLACE);

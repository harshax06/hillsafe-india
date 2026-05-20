// ─── Weather Service ─────────────────────────────────────────────────────────
// Free OpenWeatherMap API — 1000 calls/day free, no card needed
//
// SETUP (2 minutes):
// 1. Go to https://openweathermap.org/api
// 2. Click "Sign Up" — free account
// 3. Go to API Keys tab → copy your key
// 4. Paste below in OWM_API_KEY
// 5. Key activates within 10 minutes of signup

import AsyncStorage from '@react-native-async-storage/async-storage';

const OWM_API_KEY = process.env.EXPO_PUBLIC_OWM_API_KEY || ''; // paste your free key here
const BASE_URL    = 'https://api.openweathermap.org/data/2.5';
const CACHE_TTL   = 30 * 60 * 1000; // 30 minutes cache

// ── Fetch current weather + 3h forecast ─────────────────────────────────────
export async function fetchWeather(latitude, longitude) {
  const cacheKey = 'hs_weather_' + Math.round(latitude * 10) + '_' + Math.round(longitude * 10);

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return { data, error: null, cached: true };
    }
  } catch {}

  // If no API key, return mock data
  if (OWM_API_KEY === 'YOUR_OWM_API_KEY') {
    return { data: getMockWeather(latitude, longitude), error: null, mock: true };
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(BASE_URL + '/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + OWM_API_KEY + '&units=metric'),
      fetch(BASE_URL + '/forecast?lat=' + latitude + '&lon=' + longitude + '&appid=' + OWM_API_KEY + '&units=metric&cnt=8'),
    ]);

    if (!currentRes.ok) throw new Error('Weather API error: ' + currentRes.status);

    const current  = await currentRes.json();
    const forecast = await forecastRes.json();

    const data = parseWeatherData(current, forecast);

    // Cache the result
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return { data, error: null, mock: false };
  } catch (e) {
    // Return mock data on error so app still works
    return { data: getMockWeather(latitude, longitude), error: e.message, mock: true };
  }
}

// ── Parse raw API response ────────────────────────────────────────────────────
function parseWeatherData(current, forecast) {
  const rain1h  = current.rain?.['1h'] || 0;
  const rain3h  = current.rain?.['3h'] || 0;
  const humidity = current.main?.humidity || 0;
  const windSpeed = current.wind?.speed || 0;

  // Next 24h forecast
  const next24h = (forecast.list || []).slice(0, 8).map(item => ({
    time:    new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temp:    Math.round(item.main?.temp || 0),
    rain:    item.rain?.['3h'] || 0,
    desc:    item.weather?.[0]?.description || '',
    icon:    item.weather?.[0]?.main || 'Clear',
    windSpeed: item.wind?.speed || 0,
  }));

  const maxRainNext24h = Math.max(...next24h.map(f => f.rain), 0);
  const totalRainNext24h = next24h.reduce((sum, f) => sum + f.rain, 0);

  return {
    location:       current.name || 'Your location',
    temp:           Math.round(current.main?.temp || 0),
    feelsLike:      Math.round(current.main?.feels_like || 0),
    humidity,
    windSpeed:      Math.round(windSpeed * 3.6), // m/s to km/h
    description:    current.weather?.[0]?.description || '',
    main:           current.weather?.[0]?.main || 'Clear',
    rain1h,
    rain3h,
    maxRainNext24h,
    totalRainNext24h: Math.round(totalRainNext24h * 10) / 10,
    next24h,
    visibility:     Math.round((current.visibility || 10000) / 1000),
    pressure:       current.main?.pressure || 1013,
    cloudiness:     current.clouds?.all || 0,
    sunrise:        new Date((current.sys?.sunrise || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sunset:         new Date((current.sys?.sunset || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fetchedAt:      Date.now(),
  };
}

// ── Mock weather for testing without API key ─────────────────────────────────
function getMockWeather(lat, lon) {
  // Slightly randomize to simulate changes
  const rain = Math.random() > 0.6 ? Math.round(Math.random() * 45) : 0;
  return {
    location:         'Your Area (Mock)',
    temp:             28,
    feelsLike:        31,
    humidity:         75,
    windSpeed:        18,
    description:      rain > 20 ? 'heavy rain' : rain > 0 ? 'light rain' : 'partly cloudy',
    main:             rain > 20 ? 'Rain' : 'Clouds',
    rain1h:           rain * 0.3,
    rain3h:           rain,
    maxRainNext24h:   rain * 1.4,
    totalRainNext24h: rain * 3,
    next24h: ['Now','3h','6h','9h','12h','15h','18h','21h'].map((t, i) => ({
      time:      t,
      temp:      26 + Math.round(Math.random() * 4),
      rain:      i < 3 ? rain * (1 - i * 0.2) : Math.random() * 10,
      desc:      i < 3 ? 'rain' : 'cloudy',
      icon:      i < 3 ? 'Rain' : 'Clouds',
      windSpeed: 15 + Math.round(Math.random() * 10),
    })),
    visibility:         8,
    pressure:           1008,
    cloudiness:         75,
    sunrise:           '06:12',
    sunset:            '18:45',
    fetchedAt:         Date.now(),
    isMock:            true,
  };
}

// ── Calculate weather risk score (0-3 points) ─────────────────────────────────
export function getWeatherRiskScore(weather) {
  if (!weather) return 0;
  let score = 0;
  // Rain contribution
  if (weather.maxRainNext24h > 50)      score += 3;
  else if (weather.maxRainNext24h > 25) score += 2;
  else if (weather.maxRainNext24h > 10) score += 1;
  // Wind contribution
  if (weather.windSpeed > 60)      score += 1;
  else if (weather.windSpeed > 40) score += 0.5;
  return Math.min(score, 3);
}

// ── Weather condition label ───────────────────────────────────────────────────
export function getWeatherLabel(main) {
  const labels = {
    'Thunderstorm': 'Thunderstorm',
    'Drizzle':      'Drizzle',
    'Rain':         'Rainy',
    'Snow':         'Snow',
    'Clear':        'Clear Sky',
    'Clouds':       'Cloudy',
    'Mist':         'Misty',
    'Fog':          'Foggy',
  };
  return labels[main] || main || 'Unknown';
}

// ── Weather icon text (no emoji — uses text badges) ──────────────────────────
export function getWeatherIcon(main) {
  const icons = {
    'Thunderstorm': 'T-STORM',
    'Drizzle':      'DRIZZLE',
    'Rain':         'RAIN',
    'Snow':         'SNOW',
    'Clear':        'CLEAR',
    'Clouds':       'CLOUDY',
    'Mist':         'MIST',
    'Fog':          'FOG',
  };
  return icons[main] || 'WEATHER';
}

// ── Rain severity ──────────────────────────────────────────────────────────────
export function getRainSeverity(mm3h) {
  if (mm3h === 0)   return { label: 'No rain',     color: '#6b8ab0', level: 0 };
  if (mm3h < 5)     return { label: 'Light rain',  color: '#00d4ff', level: 1 };
  if (mm3h < 15)    return { label: 'Moderate',    color: '#ffd700', level: 2 };
  if (mm3h < 35)    return { label: 'Heavy rain',  color: '#ff8c42', level: 3 };
  return             { label: 'Very heavy!',        color: '#ff4455', level: 4 };
}



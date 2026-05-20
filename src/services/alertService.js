// ─── Alert Service ────────────────────────────────────────────────────────────
// Combines altitude + slope + weather + nearby pins into risk score
// Generates smart alerts and stores them locally

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeatherRiskScore } from './weather';

const ALERTS_KEY    = 'hs_alerts';
const MAX_ALERTS    = 50;
const ALERT_TYPES   = {
  LANDSLIDE_RISK:  { id: 'landslide_risk',  label: 'Landslide Risk',     severity: 'high'   },
  FLOOD_RISK:      { id: 'flood_risk',      label: 'Flash Flood Risk',   severity: 'high'   },
  STEEP_SLOPE:     { id: 'steep_slope',     label: 'Steep Slope',        severity: 'medium' },
  HIGH_ALTITUDE:   { id: 'high_altitude',   label: 'High Altitude Zone', severity: 'medium' },
  HEAVY_RAIN:      { id: 'heavy_rain',      label: 'Heavy Rain Warning', severity: 'high'   },
  STRONG_WIND:     { id: 'strong_wind',     label: 'Strong Wind Alert',  severity: 'medium' },
  NEARBY_HAZARD:   { id: 'nearby_hazard',   label: 'Hazard Nearby',      severity: 'high'   },
  ALL_CLEAR:       { id: 'all_clear',       label: 'All Clear',          severity: 'safe'   },
};

// ── Calculate combined risk score (0-10) ─────────────────────────────────────
export function calculateTotalRisk(altitude, slope, weather, nearbyPins = 0) {
  let score = 0;

  // Altitude score (0-4)
  if (altitude > 1400)      score += 4;
  else if (altitude > 800)  score += 2;
  else if (altitude > 400)  score += 0.5;

  // Slope score (0-3)
  if (slope > 35)           score += 3;
  else if (slope > 20)      score += 1.5;
  else if (slope > 10)      score += 0.5;

  // Weather score (0-3)
  score += getWeatherRiskScore(weather);

  // Nearby pins score (0-2)
  if (nearbyPins >= 3)      score += 2;
  else if (nearbyPins >= 1) score += 1;

  return Math.min(Math.round(score * 10) / 10, 10);
}

// ── Generate alerts based on current conditions ──────────────────────────────
export function generateAlerts(altitude, slope, weather, nearbyPins = 0) {
  const alerts = [];
  const now    = Date.now();

  // Landslide risk: high altitude + heavy rain + steep slope
  if (altitude > 800 && weather?.maxRainNext24h > 25 && slope > 20) {
    alerts.push({
      ...ALERT_TYPES.LANDSLIDE_RISK,
      message: 'High altitude (' + altitude + 'm) with ' + Math.round(weather.maxRainNext24h) + 'mm rain forecast and ' + slope + ' degree slope detected.',
      timestamp: now,
      read: false,
    });
  }

  // Flash flood risk: heavy rain in any area
  if (weather?.maxRainNext24h > 35) {
    alerts.push({
      ...ALERT_TYPES.FLOOD_RISK,
      message: 'Very heavy rain expected: ' + Math.round(weather.maxRainNext24h) + 'mm in next 24 hours. Avoid low-lying areas and river banks.',
      timestamp: now,
      read: false,
    });
  } else if (weather?.maxRainNext24h > 15) {
    alerts.push({
      ...ALERT_TYPES.HEAVY_RAIN,
      message: 'Heavy rain forecast: ' + Math.round(weather.maxRainNext24h) + 'mm expected. Stay alert for waterlogging.',
      timestamp: now,
      read: false,
    });
  }

  // Steep slope warning
  if (slope > 35) {
    alerts.push({
      ...ALERT_TYPES.STEEP_SLOPE,
      message: 'Terrain slope ' + slope + ' degrees detected. Very steep — reduce movement speed and watch footing.',
      timestamp: now,
      read: false,
    });
  }

  // High altitude
  if (altitude > 1400) {
    alerts.push({
      ...ALERT_TYPES.HIGH_ALTITUDE,
      message: 'You are at ' + altitude + 'm elevation — high risk zone. Monitor weather changes closely.',
      timestamp: now,
      read: false,
    });
  }

  // Strong wind
  if (weather?.windSpeed > 50) {
    alerts.push({
      ...ALERT_TYPES.STRONG_WIND,
      message: 'Strong winds of ' + weather.windSpeed + ' km/h detected. Avoid exposed ridges and hilltops.',
      timestamp: now,
      read: false,
    });
  }

  // Nearby community hazards
  if (nearbyPins >= 3) {
    alerts.push({
      ...ALERT_TYPES.NEARBY_HAZARD,
      message: nearbyPins + ' community-reported hazards detected within 5km of your location.',
      timestamp: now,
      read: false,
    });
  }

  // All clear
  if (alerts.length === 0) {
    alerts.push({
      ...ALERT_TYPES.ALL_CLEAR,
      message: 'No hazards detected. Altitude ' + altitude + 'm, slope ' + slope + ' degrees — conditions normal.',
      timestamp: now,
      read: true,
    });
  }

  return alerts;
}

// ── Save alerts to storage ────────────────────────────────────────────────────
export async function saveAlerts(newAlerts) {
  try {
    const existing = await loadAlerts();
    const combined = [...newAlerts, ...existing].slice(0, MAX_ALERTS);
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(combined));
    return combined;
  } catch (e) {
    return newAlerts;
  }
}

// ── Load alerts from storage ──────────────────────────────────────────────────
export async function loadAlerts() {
  try {
    const saved = await AsyncStorage.getItem(ALERTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// ── Mark alert as read ────────────────────────────────────────────────────────
export async function markAlertRead(timestamp) {
  try {
    const alerts = await loadAlerts();
    const updated = alerts.map(a => a.timestamp === timestamp ? { ...a, read: true } : a);
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// ── Mark all as read ──────────────────────────────────────────────────────────
export async function markAllRead() {
  try {
    const alerts  = await loadAlerts();
    const updated = alerts.map(a => ({ ...a, read: true }));
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// ── Clear all alerts ──────────────────────────────────────────────────────────
export async function clearAlerts() {
  await AsyncStorage.removeItem(ALERTS_KEY);
}

// ── Unread count ──────────────────────────────────────────────────────────────
export function getUnreadCount(alerts) {
  return alerts.filter(a => !a.read && a.id !== 'all_clear').length;
}

// ── Severity config ───────────────────────────────────────────────────────────
export const SEVERITY_CONFIG = {
  high:   { color: '#ff4455', bg: '#ff445522', border: '#ff445566', label: 'HIGH'   },
  medium: { color: '#ffd700', bg: '#ffd70022', border: '#ffd70066', label: 'MEDIUM' },
  safe:   { color: '#00ff88', bg: '#00ff8822', border: '#00ff8866', label: 'SAFE'   },
  info:   { color: '#00d4ff', bg: '#00d4ff22', border: '#00d4ff66', label: 'INFO'   },
};

// ─── useSensors v2 ──────────────────────────────────────────────────────────
// Week 2 upgrades:
//   ✅ Altitude history (last 20 readings) for graph
//   ✅ Barometer calibration offset
//   ✅ Smoothing filter to reduce GPS jitter
//   ✅ Max/min altitude tracking
//   ✅ Ascent/descent detection
//   ✅ Pressure trend (rising/falling/stable)

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { Barometer, Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALTITUDE_THRESHOLDS, SLOPE_THRESHOLDS } from '../constants/theme';

const SEA_LEVEL_PRESSURE = 1013.25;
const HISTORY_MAX = 20;       // keep last 20 altitude readings
const SMOOTH_FACTOR = 0.3;    // 0=no smoothing, 1=no update (EMA filter)

// ── Formulas ────────────────────────────────────────────────────────────────
export const calcBaroAltitude = (p) =>
  p > 0 ? Math.round(44330 * (1 - Math.pow(p / SEA_LEVEL_PRESSURE, 1 / 5.255))) : null;

export const calcSlopeAngle = (x, y, z) => {
  const r = Math.atan2(Math.abs(z), Math.sqrt(x * x + y * y));
  return Math.abs(Math.round((r * 180) / Math.PI));
};

export const getRiskLevel = (alt) =>
  alt < ALTITUDE_THRESHOLDS.safe ? 'safe' : alt < ALTITUDE_THRESHOLDS.caution ? 'caution' : 'danger';

export const getSlopeSeverity = (angle) =>
  angle < SLOPE_THRESHOLDS.safe ? 'gentle' : angle < SLOPE_THRESHOLDS.moderate ? 'moderate' : 'steep';

export const getRiskScore = (alt, slope) => {
  let s = 0;
  if (alt > 1400) s += 4; else if (alt > 800) s += 2;
  if (slope > 35) s += 3; else if (slope > 20) s += 1.5;
  return Math.min(Math.round(s * 10) / 10, 10);
};

export const getPressureTrend = (history) => {
  if (history.length < 3) return 'stable';
  const recent = history.slice(-3);
  const diff = recent[2] - recent[0];
  if (diff > 0.5) return 'rising';
  if (diff < -0.5) return 'falling';
  return 'stable';
};

// ── Open-Elevation API fallback ──────────────────────────────────────────────
// Free, no API key needed. Uses latitude/longitude to get altitude from
// a global elevation dataset (SRTM — accurate to ±10m anywhere on Earth)
async function fetchElevationFromAPI(latitude, longitude) {
  try {
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${latitude},${longitude}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data?.results?.[0]?.elevation ?? null;
  } catch {
    return null; // silently fail, use GPS instead
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────
export default function useSensors() {
  const [coords, setCoords]           = useState(null);
  const [gpsAltitude, setGpsAltitude] = useState(null);
  const [pressure, setPressure]       = useState(null);
  const [baroAltitude, setBaroAlt]    = useState(null);
  const [slope, setSlope]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [permitted, setPermitted]     = useState(false);
  const [calibOffset, setCalibOffset] = useState(0);

  // History arrays for graph
  const [altHistory, setAltHistory]   = useState([]);
  const [pressHistory, setPressHist]  = useState([]);

  // Tracking
  const [maxAlt, setMaxAlt] = useState(null);
  const [minAlt, setMinAlt] = useState(null);
  const [sessionStart] = useState(Date.now());

  const locationSub = useRef(null);
  const baroSub     = useRef(null);
  const accelSub    = useRef(null);
  const smoothedAlt = useRef(null);

  // Best altitude: barometer > GPS
  const rawAlt = (baroAltitude ?? gpsAltitude ?? 0) + calibOffset;
  const altitude = Math.round(rawAlt);

  // ── Load saved calibration ──────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('hs_calib_offset').then(v => {
      if (v) setCalibOffset(parseFloat(v));
    });
  }, []);

  // ── Save calibration ────────────────────────────────────────────────────
  const calibrate = useCallback((knownAltitude) => {
    const current = baroAltitude ?? gpsAltitude ?? 0;
    const offset = knownAltitude - current;
    setCalibOffset(offset);
    AsyncStorage.setItem('hs_calib_offset', offset.toString());
  }, [baroAltitude, gpsAltitude]);

  const resetCalibration = useCallback(() => {
    setCalibOffset(0);
    AsyncStorage.removeItem('hs_calib_offset');
  }, []);

  // ── Update history & tracking when altitude changes ─────────────────────
  useEffect(() => {
    if (!altitude) return;
    // EMA smoothing
    if (smoothedAlt.current === null) smoothedAlt.current = altitude;
    smoothedAlt.current = Math.round(
      SMOOTH_FACTOR * altitude + (1 - SMOOTH_FACTOR) * smoothedAlt.current
    );
    const ts = Date.now();
    setAltHistory(prev => {
      const next = [...prev, { value: smoothedAlt.current, ts }];
      return next.slice(-HISTORY_MAX);
    });
    setMaxAlt(prev => prev === null ? altitude : Math.max(prev, altitude));
    setMinAlt(prev => prev === null ? altitude : Math.min(prev, altitude));
  }, [altitude]);

  // ── Request location permission ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable in Settings.');
        setLoading(false);
        return;
      }
      setPermitted(true);
    })();
  }, []);

  // ── GPS ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!permitted) return;
    (async () => {
      try {
        locationSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
          (loc) => {
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setCoords({ latitude: lat, longitude: lng });

            const gpsAlt = loc.coords.altitude;

            if (gpsAlt !== null && gpsAlt !== 0) {
            // GPS has altitude — use it directly
            setGpsAltitude(Math.round(gpsAlt));
            setLoading(false);
            } else {
              // GPS has no altitude — fetch from Open-Elevation API
              fetchElevationFromAPI(lat, lng).then(apiAlt => {
              if (apiAlt !== null) setGpsAltitude(Math.round(apiAlt));
              setLoading(false);
              }
    );
  }
}
        );
      } catch (e) {
        setError('GPS error: ' + e.message);
        setLoading(false);
      }
    })();
    return () => locationSub.current?.remove();
  }, [permitted]);

  // ── Barometer ───────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    Barometer.isAvailableAsync().then(available => {
      if (!available || !active) return;
      baroSub.current = Barometer.addListener(({ pressure: p }) => {
        const rounded = Math.round(p * 10) / 10;
        setPressure(rounded);
        setPressHist(prev => [...prev, rounded].slice(-HISTORY_MAX));
        const alt = calcBaroAltitude(p);
        if (alt !== null) setBaroAlt(alt);
      });
      Barometer.setUpdateInterval(2000);
    });
    return () => { active = false; baroSub.current?.remove(); };
  }, []);

  // ── Accelerometer ───────────────────────────────────────────────────────
  useEffect(() => {
    Accelerometer.setUpdateInterval(400);
    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      setSlope(calcSlopeAngle(x, y, z));
    });
    return () => accelSub.current?.remove();
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const riskLevel     = getRiskLevel(altitude);
  const slopeSeverity = getSlopeSeverity(slope);
  const riskScore     = getRiskScore(altitude, slope);
  const pressureTrend = getPressureTrend(pressHistory);
  const hasBarometer  = baroAltitude !== null;

  // Ascent/descent
  const movement = altHistory.length >= 4
    ? altHistory[altHistory.length - 1].value - altHistory[altHistory.length - 4].value
    : 0;
  const movementLabel = Math.abs(movement) < 3 ? 'Stable' : movement > 0 ? `▲ +${movement}m` : `▼ ${movement}m`;

  const sessionMinutes = Math.round((Date.now() - sessionStart) / 60000);

  return {
    altitude, gpsAltitude, baroAltitude, pressure,
    slope, coords, riskLevel, slopeSeverity, riskScore,
    altHistory, pressHistory, pressureTrend,
    maxAlt, minAlt, movementLabel, sessionMinutes,
    loading, error, hasBarometer,
    calibOffset, calibrate, resetCalibration,
  };
}

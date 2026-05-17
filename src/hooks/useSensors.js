// ─── useSensors hook ────────────────────────────────────────────────────────
// Reads all three phone sensors needed for HillSafe:
//   1. GPS       → latitude, longitude, gpsAltitude
//   2. Barometer → pressure (hPa) → calculated barometric altitude
//   3. Accelerometer → x, y, z → slope angle in degrees
//
// Usage:
//   const { altitude, slope, pressure, coords, riskLevel, loading, error } = useSensors();

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Barometer, Accelerometer } from 'expo-sensors';
import { ALTITUDE_THRESHOLDS, SLOPE_THRESHOLDS } from '../constants/theme';

// ─── Barometric altitude formula ────────────────────────────────────────────
// h = 44330 × (1 − (P / P₀) ^ (1/5.255))
// P  = current atmospheric pressure in hPa
// P₀ = standard sea-level pressure = 1013.25 hPa
const SEA_LEVEL_PRESSURE = 1013.25;

export function calculateBarometricAltitude(pressureHpa) {
  if (!pressureHpa || pressureHpa <= 0) return null;
  return 44330 * (1 - Math.pow(pressureHpa / SEA_LEVEL_PRESSURE, 1 / 5.255));
}

// ─── Slope angle from accelerometer ─────────────────────────────────────────
// angle = atan2(z, sqrt(x² + y²)) converted to degrees
// Gives the tilt of the phone (and terrain if phone is flat on ground)
export function calculateSlopeAngle(x, y, z) {
  if (x === undefined || y === undefined || z === undefined) return 0;
  const radians = Math.atan2(Math.abs(z), Math.sqrt(x * x + y * y));
  return Math.abs((radians * 180) / Math.PI);
}

// ─── Risk level from altitude ────────────────────────────────────────────────
export function getRiskLevel(altitude) {
  if (altitude === null || altitude === undefined) return 'unknown';
  if (altitude < ALTITUDE_THRESHOLDS.safe)    return 'safe';
  if (altitude < ALTITUDE_THRESHOLDS.caution) return 'caution';
  return 'danger';
}

// ─── Slope severity ──────────────────────────────────────────────────────────
export function getSlopeSeverity(angle) {
  if (angle < SLOPE_THRESHOLDS.safe)     return 'gentle';
  if (angle < SLOPE_THRESHOLDS.moderate) return 'moderate';
  return 'steep';
}

// ─── Risk score (0–10) ───────────────────────────────────────────────────────
export function calculateRiskScore(altitude, slope) {
  let score = 0;
  // Altitude contribution (0–4 points)
  if (altitude > 1400) score += 4;
  else if (altitude > 800) score += 2;
  // Slope contribution (0–3 points)
  if (slope > 35) score += 3;
  else if (slope > 20) score += 1.5;
  return Math.min(score, 10);
}

// ─── Main hook ───────────────────────────────────────────────────────────────
export default function useSensors() {
  const [coords, setCoords] = useState(null);          // { latitude, longitude }
  const [gpsAltitude, setGpsAltitude] = useState(null);
  const [pressure, setPressure] = useState(null);       // hPa
  const [baroAltitude, setBaroAltitude] = useState(null);
  const [slope, setSlope] = useState(0);               // degrees
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const locationSub = useRef(null);
  const baroSub = useRef(null);
  const accelSub = useRef(null);

  // ── Best altitude: prefer barometer (more accurate), fallback to GPS ──────
  const altitude = baroAltitude ?? gpsAltitude ?? 0;
  const riskLevel = getRiskLevel(altitude);
  const slopeSeverity = getSlopeSeverity(slope);
  const riskScore = calculateRiskScore(altitude, slope);

  // ── Request location permission ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied. HillSafe needs GPS to measure altitude.');
          setLoading(false);
          return;
        }
        setPermissionGranted(true);
      } catch (e) {
        setError('Failed to request location permission: ' + e.message);
        setLoading(false);
      }
    })();
  }, []);

  // ── Start GPS location updates ───────────────────────────────────────────
  useEffect(() => {
    if (!permissionGranted) return;

    (async () => {
      try {
        locationSub.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,     // update every 2 seconds
            distanceInterval: 5,    // or every 5 metres moved
          },
          (location) => {
            setCoords({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            // GPS altitude (less accurate than barometer but always available)
            if (location.coords.altitude !== null) {
              setGpsAltitude(location.coords.altitude);
            }
            setLoading(false);
          }
        );
      } catch (e) {
        setError('GPS error: ' + e.message);
        setLoading(false);
      }
    })();

    return () => {
      if (locationSub.current) locationSub.current.remove();
    };
  }, [permissionGranted]);

  // ── Start Barometer updates ───────────────────────────────────────────────
  useEffect(() => {
    let available = true;

    Barometer.isAvailableAsync().then((isAvailable) => {
      if (!isAvailable || !available) return;
      // Note: Barometer may not be available on all Android phones
      // HillSafe falls back to GPS altitude if not available
      baroSub.current = Barometer.addListener(({ pressure: p }) => {
        setPressure(p);
        const alt = calculateBarometricAltitude(p);
        if (alt !== null) setBaroAltitude(Math.round(alt));
      });
      Barometer.setUpdateInterval(2000);
    });

    return () => {
      available = false;
      if (baroSub.current) baroSub.current.remove();
    };
  }, []);

  // ── Start Accelerometer updates (for slope) ───────────────────────────────
  useEffect(() => {
    Accelerometer.setUpdateInterval(500); // 2x per second is enough for slope

    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      setAccel({ x, y, z });
      const angle = calculateSlopeAngle(x, y, z);
      setSlope(Math.round(angle));
    });

    return () => {
      if (accelSub.current) accelSub.current.remove();
    };
  }, []);

  return {
    // Values
    altitude:     Math.round(altitude),
    gpsAltitude:  gpsAltitude ? Math.round(gpsAltitude) : null,
    baroAltitude: baroAltitude,
    pressure:     pressure ? Math.round(pressure * 10) / 10 : null,
    slope:        slope,
    accel,
    coords,
    // Derived
    riskLevel,       // 'safe' | 'caution' | 'danger' | 'unknown'
    slopeSeverity,   // 'gentle' | 'moderate' | 'steep'
    riskScore:       Math.round(riskScore * 10) / 10,
    // State
    loading,
    error,
    permissionGranted,
    // Helpers
    hasBarometer: baroAltitude !== null,
  };
}

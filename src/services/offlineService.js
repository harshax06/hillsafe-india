// ─── Offline Service ──────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PINS:               'hs_offline_pins',
  WEATHER:            'hs_offline_weather',
  ALERTS:             'hs_offline_alerts',
  LAST_SYNC:          'hs_last_sync',
  ROUTE_HISTORY:      'hs_route_history',
  EMERGENCY_CONTACTS: 'hs_emergency_contacts',
  PENDING_QUEUE:      'hs_pending_queue',
};

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ── Pins ──────────────────────────────────────────────────────────────────────
export async function cachePins(pins) {
  try {
    await AsyncStorage.setItem(KEYS.PINS, JSON.stringify({
      data: pins, cachedAt: new Date().toISOString(),
    }));
  } catch (e) { console.warn('cachePins:', e); }
}

export async function getCachedPins() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PINS);
    return raw ? JSON.parse(raw) : { data: [], cachedAt: null };
  } catch { return { data: [], cachedAt: null }; }
}

// ── Weather ───────────────────────────────────────────────────────────────────
export async function cacheWeather(weather) {
  try {
    await AsyncStorage.setItem(KEYS.WEATHER, JSON.stringify({
      data: weather, cachedAt: new Date().toISOString(),
    }));
  } catch (e) { console.warn('cacheWeather:', e); }
}

export async function getCachedWeather() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WEATHER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageMs  = Date.now() - new Date(parsed.cachedAt).getTime();
    return ageMs < 3600000 ? parsed.data : null; // 1 hour TTL
  } catch { return null; }
}

// ── Last Sync ─────────────────────────────────────────────────────────────────
export async function updateLastSync() {
  await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
}

export async function getLastSync() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_SYNC);
    return raw ? new Date(raw) : null;
  } catch { return null; }
}

// ── Route History ─────────────────────────────────────────────────────────────
export async function saveRoute(route) {
  try {
    const existing = await getRouteHistory();
    const updated  = [route, ...existing].slice(0, 10);
    await AsyncStorage.setItem(KEYS.ROUTE_HISTORY, JSON.stringify(updated));
  } catch (e) { console.warn('saveRoute:', e); }
}

export async function getRouteHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ROUTE_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Emergency Contacts ────────────────────────────────────────────────────────
export async function saveEmergencyContacts(contacts) {
  await AsyncStorage.setItem(KEYS.EMERGENCY_CONTACTS, JSON.stringify(contacts));
}

export async function getEmergencyContacts() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.EMERGENCY_CONTACTS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Pending Reports Queue ─────────────────────────────────────────────────────
export async function queueReport(report) {
  try {
    const queue = await getPendingQueue();
    queue.push({ ...report, queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(KEYS.PENDING_QUEUE, JSON.stringify(queue));
  } catch (e) { console.warn('queueReport:', e); }
}

export async function getPendingQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearPendingQueue() {
  await AsyncStorage.removeItem(KEYS.PENDING_QUEUE);
}

// ── Offline Status Summary ────────────────────────────────────────────────────
export async function getOfflineStatus() {
  try {
    const [pins, weather, lastSync, queue] = await Promise.all([
      getCachedPins(),
      getCachedWeather(),
      getLastSync(),
      getPendingQueue(),
    ]);
    return {
      pinsCached:    pins.data.length,
      weatherCached: !!weather,
      lastSync:      lastSync ? formatTimeAgo(lastSync) : 'Never',
      lastSyncDate:  lastSync,
      pendingReports: queue.length,
    };
  } catch {
    return { pinsCached: 0, weatherCached: false, lastSync: 'Unknown', lastSyncDate: null, pendingReports: 0 };
  }
}

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Barometer, Accelerometer } from 'expo-sensors';

import { fetchWeather, getWeatherRiskScore } from '../services/weather';
import {
  calculateTotalRisk, generateAlerts, saveAlerts,
  loadAlerts, markAlertRead, markAllRead, clearAlerts,
  getUnreadCount, SEVERITY_CONFIG,
} from '../services/alertService';
import WeatherCard from '../components/WeatherCard';
import RiskDashboard from '../components/RiskDashboard';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function AlertScreen() {
  const [weather,     setWeather]     = useState(null);
  const [alerts,      setAlerts]      = useState([]);
  const [coords,      setCoords]      = useState(null);
  const [altitude,    setAltitude]    = useState(0);
  const [slope,       setSlope]       = useState(0);
  const [nearbyPins,  setNearbyPins]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [weatherMock, setWeatherMock] = useState(true);
  const [activeTab,   setActiveTab]   = useState('alerts');

  // Read live sensors directly in this screen
  useEffect(() => {
    let accelSub = null;
    let baroSub  = null;

    // Accelerometer for slope
    Accelerometer.setUpdateInterval(1000);
    accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const angle = Math.abs(Math.round((Math.atan2(Math.abs(z), Math.sqrt(x*x + y*y)) * 180) / Math.PI));
      setSlope(angle);
    });

    // Barometer (if available)
    Barometer.isAvailableAsync().then(avail => {
      if (!avail) return;
      baroSub = Barometer.addListener(({ pressure: p }) => {
        const alt = Math.round(44330 * (1 - Math.pow(p / 1013.25, 1 / 5.255)));
        if (alt > 0) setAltitude(alt);
      });
    });

    return () => {
      if (accelSub) accelSub.remove();
      if (baroSub)  baroSub.remove();
    };
  }, []);

  useEffect(() => {
    loadSavedAlerts();
    getLocationAndWeather();
    // Load nearby pins count
    AsyncStorage.getItem('hs_nearby_pins').then(v => v && setNearbyPins(parseInt(v)));
  }, []);

  const loadSavedAlerts = async () => {
    const saved = await loadAlerts();
    setAlerts(saved);
    setLoading(false);
  };

  const getLocationAndWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(c);

      // Use GPS altitude if barometer not available
      if (loc.coords.altitude && altitude === 0) {
        setAltitude(Math.round(loc.coords.altitude));
      }

      // Save coords for reuse
      await AsyncStorage.setItem('hs_last_lat', c.latitude.toString());
      await AsyncStorage.setItem('hs_last_lon', c.longitude.toString());

      await refreshWeather(c);
    } catch (e) {
      // Try last known coords
      const lat = await AsyncStorage.getItem('hs_last_lat');
      const lon = await AsyncStorage.getItem('hs_last_lon');
      if (lat && lon) {
        const c = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
        setCoords(c);
        await refreshWeather(c);
      }
    }
  };

  const refreshWeather = async (c = coords) => {
    if (!c) return;
    setRefreshing(true);
    const { data, mock, error } = await fetchWeather(c.latitude, c.longitude);
    setWeather(data);
    setWeatherMock(mock);
    if (error) console.log('Weather error:', error);
    // Generate alerts with current sensor values
    await generateAndSaveAlerts(altitude, slope, data);
    setRefreshing(false);
  };

  const generateAndSaveAlerts = async (alt, slp, wx) => {
    const newAlerts = generateAlerts(alt || 0, slp || 0, wx, nearbyPins);
    const all       = await saveAlerts(newAlerts);
    setAlerts(all);
  };

  const handleMarkRead      = async (ts) => setAlerts(await markAlertRead(ts));
  const handleMarkAllRead   = async ()   => setAlerts(await markAllRead());
  const handleClearAlerts   = async ()   => { await clearAlerts(); setAlerts([]); };

  const totalRisk   = calculateTotalRisk(altitude, slope, weather, nearbyPins);
  const unreadCount = getUnreadCount(alerts);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.tabBar}>
        {[
          { id: 'alerts',  label: 'Alerts' + (unreadCount > 0 ? ' (' + unreadCount + ')' : '') },
          { id: 'weather', label: 'Weather' },
          { id: 'risk',    label: 'Risk Score' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshWeather()} tintColor={COLORS.accent} />}
      >
        {activeTab === 'alerts' && (
          <View>
            <View style={styles.actionsRow}>
              <Text style={styles.sectionSub}>{alerts.length} total alerts · Pull to refresh</Text>
              <View style={styles.actionBtns}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllRead}>
                    <Text style={styles.actionBtnText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={handleClearAlerts}>
                  <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {alerts.length === 0 ? (
              <View style={styles.emptyAlerts}>
                <Text style={styles.emptyTitle}>No Alerts</Text>
                <Text style={styles.emptyText}>Pull down to refresh and check current conditions.</Text>
                <TouchableOpacity style={styles.generateBtn} onPress={() => generateAndSaveAlerts(altitude, slope, weather)}>
                  <Text style={styles.generateBtnText}>Check Conditions Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              alerts.map((alert, i) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.alertCard, { borderLeftColor: sev.color, borderLeftWidth: 4 }, !alert.read && { backgroundColor: sev.bg }]}
                    onPress={() => handleMarkRead(alert.timestamp)}
                  >
                    <View style={styles.alertHeader}>
                      <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                        <Text style={[styles.severityText, { color: sev.color }]}>{sev.label}</Text>
                      </View>
                      <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
                      {!alert.read && <View style={[styles.unreadDot, { backgroundColor: sev.color }]} />}
                    </View>
                    <Text style={[styles.alertTitle, { color: sev.color }]}>{alert.label}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity style={styles.refreshAlertsBtn} onPress={() => generateAndSaveAlerts(altitude, slope, weather)}>
              <Text style={styles.refreshAlertsBtnText}>Re-check Conditions</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'weather' && (
          <View>
            {weatherMock && (
              <View style={styles.demoNotice}>
                <Text style={styles.demoTitle}>Using Demo Weather</Text>
                <Text style={styles.demoText}>
                  Add EXPO_PUBLIC_OWM_API_KEY in .env file{'\n'}
                  Get free key at openweathermap.org{'\n'}
                  Restart Expo after adding key
                </Text>
              </View>
            )}
            {coords && (
              <View style={styles.coordsBar}>
                <Text style={styles.coordsText}>
                  Fetching weather for: {coords.latitude.toFixed(4)}N, {coords.longitude.toFixed(4)}E
                </Text>
              </View>
            )}
            <WeatherCard
              weather={weather}
              onRefresh={() => refreshWeather()}
              loading={refreshing}
              isMock={weatherMock}
            />
          </View>
        )}

        {activeTab === 'risk' && (
          <View>
            <View style={styles.riskHeader}>
              <Text style={styles.riskHeaderText}>
                Combining altitude, slope, weather and community reports into one risk score
              </Text>
            </View>
            <RiskDashboard
              altitude={altitude}
              slope={slope}
              weather={weather}
              nearbyPins={nearbyPins}
              totalRisk={totalRisk}
            />
            <View style={styles.sourcesCard}>
              <Text style={styles.sourcesTitle}>Live Data Sources</Text>
              {[
                { label: 'Altitude',       value: altitude + 'm',                          active: altitude > 0  },
                { label: 'Slope',          value: slope + ' degrees',                      active: true          },
                { label: 'Weather',        value: weather ? (weatherMock ? 'Demo' : 'Live ' + coords?.latitude.toFixed(2) + 'N') : 'Loading', active: !!weather },
                { label: 'Community Pins', value: nearbyPins + ' nearby',                  active: true          },
              ].map(src => (
                <View key={src.label} style={styles.sourceRow}>
                  <View style={[styles.sourceDot, { backgroundColor: src.active ? COLORS.safe : COLORS.border }]} />
                  <Text style={styles.sourceLabel}>{src.label}</Text>
                  <Text style={[styles.sourceValue, { color: src.active ? COLORS.accent : COLORS.muted }]}>{src.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: SPACING.lg },
  centered:{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.text, marginTop: SPACING.md },
  tabBar:      { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText:     { color: COLORS.muted, fontSize: FONTS.small, fontWeight: '600' },
  tabTextActive:{ color: COLORS.accent },
  actionsRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionSub:  { color: COLORS.muted, fontSize: 11 },
  actionBtns:  { flexDirection: 'row', gap: 8 },
  actionBtn:   { paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: COLORS.card, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  actionBtnText:{ color: COLORS.accent, fontSize: 11 },
  alertCard:   { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  severityBadge:{ borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  severityText: { fontSize: 10, fontWeight: '700' },
  alertTime:   { color: COLORS.muted, fontSize: 11, flex: 1 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4 },
  alertTitle:  { fontSize: FONTS.label, fontWeight: '700', marginBottom: 4 },
  alertMessage:{ color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },
  emptyAlerts: { padding: SPACING.xl, alignItems: 'center' },
  emptyTitle:  { color: COLORS.text, fontSize: FONTS.title, fontWeight: '700', marginBottom: 8 },
  emptyText:   { color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center', lineHeight: 20 },
  generateBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  generateBtnText:{ color: COLORS.black, fontWeight: '700', fontSize: FONTS.body },
  refreshAlertsBtn:    { marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  refreshAlertsBtnText:{ color: COLORS.accent, fontSize: FONTS.body },
  demoNotice:  { backgroundColor: COLORS.caution + '11', borderWidth: 1, borderColor: COLORS.caution + '44', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  demoTitle:   { color: COLORS.caution, fontSize: FONTS.body, fontWeight: '700', marginBottom: 4 },
  demoText:    { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },
  coordsBar:   { backgroundColor: COLORS.card, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  coordsText:  { color: COLORS.accent, fontSize: 11 },
  riskHeader:  { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md },
  riskHeaderText:{ color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },
  sourcesCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.md },
  sourcesTitle:{ color: COLORS.text, fontSize: FONTS.label, fontWeight: '700', marginBottom: SPACING.md },
  sourceRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sourceDot:   { width: 8, height: 8, borderRadius: 4 },
  sourceLabel: { color: COLORS.text, fontSize: FONTS.body, flex: 1 },
  sourceValue: { fontSize: FONTS.body, fontWeight: '600' },
});



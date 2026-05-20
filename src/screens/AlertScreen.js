// ─── AlertScreen v5 ──────────────────────────────────────────────────────────
// Week 5: Full smart alert system
//   ✅ Live weather from OpenWeatherMap
//   ✅ Combined risk score display
//   ✅ Auto-generated smart alerts
//   ✅ Alert history with read/unread
//   ✅ Rain forecast bar chart
//   ✅ Works without API key (demo mode)

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [weather,      setWeather]      = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [altitude,     setAltitude]     = useState(0);
  const [slope,        setSlope]        = useState(0);
  const [coords,       setCoords]       = useState(null);
  const [nearbyPins,   setNearbyPins]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [weatherMock,  setWeatherMock]  = useState(true);
  const [activeTab,    setActiveTab]    = useState('alerts'); // alerts | weather | risk

  // Load saved sensor values and alerts on mount
  useEffect(() => {
    loadSavedData();
    getLocationAndWeather();
  }, []);

  const loadSavedData = async () => {
    const savedAlerts = await loadAlerts();
    setAlerts(savedAlerts);
    // Load last known altitude and slope from HomeScreen
    const alt   = await AsyncStorage.getItem('hs_last_altitude');
    const slp   = await AsyncStorage.getItem('hs_last_slope');
    const pins  = await AsyncStorage.getItem('hs_nearby_pins');
    if (alt)  setAltitude(parseInt(alt));
    if (slp)  setSlope(parseInt(slp));
    if (pins) setNearbyPins(parseInt(pins));
    setLoading(false);
  };

  const getLocationAndWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c   = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(c);
      if (loc.coords.altitude) setAltitude(Math.round(loc.coords.altitude));

      await refreshWeather(c);
    } catch (e) {
      // Use mock weather
      const { data } = await fetchWeather(0, 0);
      setWeather(data);
      await generateAndSaveAlerts(altitude, slope, data);
    }
  };

  const refreshWeather = async (c = coords) => {
    if (!c) return;
    setRefreshing(true);
    const { data, mock } = await fetchWeather(c.latitude, c.longitude);
    setWeather(data);
    setWeatherMock(mock);
    await generateAndSaveAlerts(altitude, slope, data);
    setRefreshing(false);
  };

  const generateAndSaveAlerts = async (alt, slp, wx) => {
    const newAlerts = generateAlerts(alt, slp, wx, nearbyPins);
    const all       = await saveAlerts(newAlerts);
    setAlerts(all);
  };

  const handleMarkRead = async (timestamp) => {
    const updated = await markAlertRead(timestamp);
    setAlerts(updated);
  };

  const handleMarkAllRead = async () => {
    const updated = await markAllRead();
    setAlerts(updated);
  };

  const handleClearAlerts = async () => {
    await clearAlerts();
    setAlerts([]);
  };

  const totalRisk  = calculateTotalRisk(altitude, slope, weather, nearbyPins);
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
      {/* Tab bar */}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshWeather()}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <View>
            {/* Actions row */}
            <View style={styles.actionsRow}>
              <Text style={styles.sectionSub}>
                Pull down to refresh · {alerts.length} total alerts
              </Text>
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

            {/* Alert list */}
            {alerts.length === 0 ? (
              <View style={styles.emptyAlerts}>
                <Text style={styles.emptyTitle}>No Alerts</Text>
                <Text style={styles.emptyText}>
                  Pull down to refresh and check current conditions.
                </Text>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={() => generateAndSaveAlerts(altitude, slope, weather)}
                >
                  <Text style={styles.generateBtnText}>Check Conditions Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              alerts.map((alert, i) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.alertCard,
                      { borderLeftColor: sev.color, borderLeftWidth: 4 },
                      !alert.read && { backgroundColor: sev.bg },
                    ]}
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

            {/* Manual refresh button */}
            <TouchableOpacity
              style={styles.refreshAlertsBtn}
              onPress={() => generateAndSaveAlerts(altitude, slope, weather)}
            >
              <Text style={styles.refreshAlertsBtnText}>Re-check Conditions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WEATHER TAB */}
        {activeTab === 'weather' && (
          <View>
            {weatherMock && (
              <View style={styles.demoNotice}>
                <Text style={styles.demoTitle}>Demo Weather Mode</Text>
                <Text style={styles.demoText}>
                  Add your free OpenWeatherMap API key in{'\n'}
                  src/services/weather.js → OWM_API_KEY{'\n'}
                  Sign up free at openweathermap.org
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

        {/* RISK TAB */}
        {activeTab === 'risk' && (
          <View>
            <View style={styles.riskHeader}>
              <Text style={styles.riskHeaderText}>
                Real-time risk assessment combining all available sensor and community data
              </Text>
            </View>
            <RiskDashboard
              altitude={altitude}
              slope={slope}
              weather={weather}
              nearbyPins={nearbyPins}
              totalRisk={totalRisk}
            />

            {/* Data sources */}
            <View style={styles.sourcesCard}>
              <Text style={styles.sourcesTitle}>Data Sources</Text>
              {[
                { label: 'Altitude',      value: altitude + 'm',                    active: true },
                { label: 'Slope',         value: slope + ' degrees',                active: true },
                { label: 'Weather',       value: weather ? (weatherMock ? 'Demo' : 'Live') : 'Loading',  active: !!weather },
                { label: 'Community Pins',value: nearbyPins + ' nearby',            active: true },
              ].map(s => (
                <View key={s.label} style={styles.sourceRow}>
                  <View style={[styles.sourceDot, { backgroundColor: s.active ? COLORS.safe : COLORS.border }]} />
                  <Text style={styles.sourceLabel}>{s.label}</Text>
                  <Text style={[styles.sourceValue, { color: s.active ? COLORS.accent : COLORS.muted }]}>
                    {s.value}
                  </Text>
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

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:    { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText:   { color: COLORS.muted, fontSize: FONTS.small, fontWeight: '600' },
  tabTextActive: { color: COLORS.accent },

  actionsRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionSub:  { color: COLORS.muted, fontSize: 11 },
  actionBtns:  { flexDirection: 'row', gap: 8 },
  actionBtn:   { paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: COLORS.card, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  actionBtnText: { color: COLORS.accent, fontSize: 11 },

  alertCard:   { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  severityBadge:{ borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  severityText: { fontSize: 10, fontWeight: '700' },
  alertTime:   { color: COLORS.muted, fontSize: 11, flex: 1 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4 },
  alertTitle:  { fontSize: FONTS.label, fontWeight: '700', marginBottom: 4 },
  alertMessage:{ color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },

  emptyAlerts:    { padding: SPACING.xl, alignItems: 'center' },
  emptyTitle:     { color: COLORS.text, fontSize: FONTS.title, fontWeight: '700', marginBottom: 8 },
  emptyText:      { color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center', lineHeight: 20 },
  generateBtn:    { marginTop: SPACING.lg, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  generateBtnText:{ color: COLORS.black, fontWeight: '700', fontSize: FONTS.body },

  refreshAlertsBtn:    { marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  refreshAlertsBtnText:{ color: COLORS.accent, fontSize: FONTS.body },

  demoNotice: { backgroundColor: COLORS.caution + '11', borderWidth: 1, borderColor: COLORS.caution + '44', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  demoTitle:  { color: COLORS.caution, fontSize: FONTS.body, fontWeight: '700', marginBottom: 4 },
  demoText:   { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },

  riskHeader:     { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md },
  riskHeaderText: { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },

  sourcesCard:  { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.md },
  sourcesTitle: { color: COLORS.text, fontSize: FONTS.label, fontWeight: '700', marginBottom: SPACING.md },
  sourceRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sourceDot:    { width: 8, height: 8, borderRadius: 4 },
  sourceLabel:  { color: COLORS.text, fontSize: FONTS.body, flex: 1 },
  sourceValue:  { fontSize: FONTS.body, fontWeight: '600' },
});

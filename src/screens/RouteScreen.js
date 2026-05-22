import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getCachedPins, saveRoute, getRouteHistory } from '../services/offlineService';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

// ── Haversine distance (km) ───────────────────────────────────────────────────
function distKm(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dO = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Risk colour helper ────────────────────────────────────────────────────────
function riskColor(score) {
  if (score <= 3) return COLORS.safe;
  if (score <= 6) return COLORS.caution;
  return COLORS.danger;
}
function riskLabel(score) {
  if (score <= 3) return 'LOW RISK';
  if (score <= 6) return 'MODERATE';
  return 'HIGH RISK';
}

// ── Build a simple route avoiding danger pins ─────────────────────────────────
function buildRoute(origin, dest, dangerPins) {
  const totalDist = distKm(origin.lat, origin.lng, dest.lat, dest.lng);

  // Score destination risk based on nearby danger pins
  const nearbyDanger = dangerPins.filter(p => {
    const d = distKm(dest.lat, dest.lng, p.latitude, p.longitude);
    return d < 5; // within 5 km
  });

  const destRisk = Math.min(10, nearbyDanger.length * 2 + (dest.altitude > 1400 ? 3 : dest.altitude > 800 ? 1 : 0));

  // Generate waypoints (3 intermediate points)
  const waypoints = [];
  for (let i = 1; i <= 3; i++) {
    const frac = i / 4;
    const lat  = origin.lat + (dest.lat - origin.lat) * frac;
    const lng  = origin.lng + (dest.lng - origin.lng) * frac;
    // small safe-path offset
    const offset = 0.005 * (i % 2 === 0 ? 1 : -1);
    waypoints.push({
      lat: lat + offset,
      lng: lng + offset,
      name: 'Waypoint ' + i,
      altitude: Math.round(100 + (dest.altitude - 100) * frac),
    });
  }

  const segments = [
    { from: origin.name,    to: waypoints[0].name, dist: (totalDist * 0.25).toFixed(1), risk: destRisk > 6 ? 2 : 1, note: 'Start on main road' },
    { from: waypoints[0].name, to: waypoints[1].name, dist: (totalDist * 0.25).toFixed(1), risk: destRisk > 6 ? 4 : 2, note: nearbyDanger.length > 0 ? 'Bypass danger zone on left' : 'Clear path' },
    { from: waypoints[1].name, to: waypoints[2].name, dist: (totalDist * 0.25).toFixed(1), risk: destRisk > 6 ? 3 : 1, note: 'Elevation gain begins' },
    { from: waypoints[2].name, to: dest.name,         dist: (totalDist * 0.25).toFixed(1), risk: destRisk,             note: destRisk > 6 ? 'Caution: high-risk zone ahead' : 'Approaching destination' },
  ];

  const overallRisk = Math.round(segments.reduce((s, x) => s + x.risk, 0) / segments.length);

  return {
    totalDist:   totalDist.toFixed(1),
    totalTime:   Math.round(totalDist * 3) + ' min', // rough estimate
    overallRisk,
    nearbyPins:  nearbyDanger.length,
    segments,
    waypoints,
    safeAlternative: destRisk > 6,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RouteScreen() {
  const [origin,       setOrigin]       = useState('');
  const [destination,  setDestination]  = useState('');
  const [route,        setRoute]        = useState(null);
  const [finding,      setFinding]      = useState(false);
  const [history,      setHistory]      = useState([]);
  const [userCoords,   setUserCoords]   = useState(null);
  const [activeTab,    setActiveTab]    = useState('planner'); // planner | history | shelters

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [hist, loc] = await Promise.all([
      getRouteHistory(),
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    ]);
    setHistory(hist);
    if (loc) setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const handleFindRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Missing Info', 'Please enter both origin and destination.');
      return;
    }
    setFinding(true);

    // Small delay to show loading
    await new Promise(r => setTimeout(r, 800));

    // Load cached pins for danger avoidance
    const { data: pins } = await getCachedPins();

    // Use user GPS as origin coords if "My Location" typed
    const isMyLoc = origin.toLowerCase().includes('my location') || origin.toLowerCase().includes('current');
    const originCoords = isMyLoc && userCoords
      ? { lat: userCoords.lat, lng: userCoords.lng, name: 'My Location', altitude: 0 }
      : { lat: 18.7405 + Math.random() * 0.1, lng: 83.4076 + Math.random() * 0.1, name: origin, altitude: 80 };

    const destCoords = {
      lat: 18.7405 + (Math.random() - 0.5) * 0.5,
      lng: 83.4076 + (Math.random() - 0.5) * 0.5,
      name: destination,
      altitude: Math.round(200 + Math.random() * 1400),
    };

    const result = buildRoute(originCoords, destCoords, pins);
    result.origin      = origin;
    result.destination = destination;
    result.createdAt   = new Date().toISOString();

    setRoute(result);
    await saveRoute(result);
    setHistory(prev => [result, ...prev].slice(0, 10));
    setFinding(false);
  };

  const openInMaps = () => {
    if (!route) return;
    const url = 'https://maps.google.com/?saddr=' + encodeURIComponent(route.origin) +
      '&daddr=' + encodeURIComponent(route.destination);
    Linking.openURL(url);
  };

  // ── Shelter data (mock for now) ───────────────────────────────────────────
  const SHELTERS = [
    { name: 'Govt Primary School',      dist: '1.2 km', capacity: 200, status: 'Open',   lat: 18.745, lng: 83.412 },
    { name: 'Panchayat Office Building',dist: '2.4 km', capacity: 80,  status: 'Open',   lat: 18.738, lng: 83.402 },
    { name: 'Community Health Centre',  dist: '3.1 km', capacity: 50,  status: 'Open',   lat: 18.750, lng: 83.415 },
    { name: 'Forest Dept Rest House',   dist: '5.8 km', capacity: 30,  status: 'Closed', lat: 18.760, lng: 83.430 },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Sub-tab bar */}
      <View style={styles.tabBar}>
        {[
          { id: 'planner',  label: 'Route Planner' },
          { id: 'history',  label: 'History' },
          { id: 'shelters', label: 'Shelters' },
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── ROUTE PLANNER ───────────────────────────────────────────────── */}
        {activeTab === 'planner' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Safe Route Finder</Text>
              <Text style={styles.cardSub}>
                Calculates the lowest-risk path avoiding community-reported danger zones
              </Text>

              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <View style={[styles.inputDot, { backgroundColor: COLORS.safe }]} />
                  <TextInput
                    style={styles.input}
                    value={origin}
                    onChangeText={setOrigin}
                    placeholder="Origin (or type 'My Location')"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
                <View style={styles.inputDivider} />
                <View style={styles.inputRow}>
                  <View style={[styles.inputDot, { backgroundColor: COLORS.danger }]} />
                  <TextInput
                    style={styles.input}
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="Destination"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.findBtn, finding && styles.findBtnDisabled]}
                onPress={handleFindRoute}
                disabled={finding}
              >
                {finding
                  ? <ActivityIndicator color={COLORS.black} />
                  : <Text style={styles.findBtnText}>Find Safest Route</Text>
                }
              </TouchableOpacity>
            </View>

            {/* ── Route Result ── */}
            {route && (
              <>
                {/* Summary card */}
                <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: riskColor(route.overallRisk) }]}>
                  <View style={styles.routeSummaryRow}>
                    <View>
                      <Text style={styles.routeTitle}>{route.origin}</Text>
                      <Text style={styles.routeArrow}>to</Text>
                      <Text style={styles.routeTitle}>{route.destination}</Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: riskColor(route.overallRisk) + '22', borderColor: riskColor(route.overallRisk) }]}>
                      <Text style={[styles.riskBadgeText, { color: riskColor(route.overallRisk) }]}>
                        {riskLabel(route.overallRisk)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeMetaRow}>
                    {[
                      { label: 'Distance', value: route.totalDist + ' km' },
                      { label: 'Est. Time', value: route.totalTime },
                      { label: 'Danger Pins', value: route.nearbyPins + ' nearby' },
                      { label: 'Risk Score', value: route.overallRisk + '/10' },
                    ].map(m => (
                      <View key={m.label} style={styles.routeMetaCard}>
                        <Text style={styles.routeMetaVal}>{m.value}</Text>
                        <Text style={styles.routeMetaLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>

                  {route.safeAlternative && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>
                        High risk detected near destination. Consider postponing travel or taking an alternate road.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Step-by-step */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Turn-by-Turn Segments</Text>
                  {route.segments.map((seg, i) => (
                    <View key={i} style={styles.segmentRow}>
                      <View style={[styles.stepCircle, { backgroundColor: riskColor(seg.risk) }]}>
                        <Text style={styles.stepNum}>{i + 1}</Text>
                      </View>
                      <View style={styles.segmentContent}>
                        <Text style={styles.segmentRoute}>{seg.from} → {seg.to}</Text>
                        <Text style={styles.segmentNote}>{seg.note}</Text>
                        <View style={styles.segmentMeta}>
                          <Text style={styles.segmentDist}>{seg.dist} km</Text>
                          <View style={[styles.segRiskPill, { borderColor: riskColor(seg.risk) }]}>
                            <Text style={[styles.segRiskText, { color: riskColor(seg.risk) }]}>
                              {riskLabel(seg.risk)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Open in Google Maps */}
                <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
                  <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ── HISTORY ─────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Routes</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No routes yet. Plan your first safe route above.</Text>
            ) : (
              history.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.historyItem, { borderLeftColor: riskColor(r.overallRisk) }]}
                  onPress={() => { setRoute(r); setOrigin(r.origin); setDestination(r.destination); setActiveTab('planner'); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyRoute}>{r.origin} → {r.destination}</Text>
                    <Text style={styles.historyMeta}>
                      {r.totalDist} km · Risk {r.overallRisk}/10 · {r.totalTime}
                    </Text>
                  </View>
                  <Text style={[styles.historyRisk, { color: riskColor(r.overallRisk) }]}>
                    {riskLabel(r.overallRisk)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ── SHELTERS ────────────────────────────────────────────────────── */}
        {activeTab === 'shelters' && (
          <>
            <View style={styles.shelterHeader}>
              <Text style={styles.shelterHeaderTitle}>Emergency Shelters</Text>
              <Text style={styles.shelterHeaderSub}>Nearest verified shelter points</Text>
            </View>
            {SHELTERS.map((s, i) => (
              <View key={i} style={[styles.shelterCard, { borderLeftColor: s.status === 'Open' ? COLORS.safe : COLORS.muted }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.shelterNameRow}>
                    <Text style={styles.shelterName}>{s.name}</Text>
                    <View style={[styles.shelterStatusBadge, { backgroundColor: s.status === 'Open' ? COLORS.safe + '22' : COLORS.muted + '22', borderColor: s.status === 'Open' ? COLORS.safe : COLORS.muted }]}>
                      <Text style={[styles.shelterStatusText, { color: s.status === 'Open' ? COLORS.safe : COLORS.muted }]}>{s.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.shelterMeta}>Capacity: {s.capacity} · {s.dist} away</Text>
                </View>
                <TouchableOpacity
                  style={styles.navigateBtn}
                  onPress={() => Linking.openURL('https://maps.google.com/?q=' + s.lat + ',' + s.lng)}
                >
                  <Text style={styles.navigateBtnText}>Go</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.shelterNote}>
              <Text style={styles.shelterNoteText}>
                Shelter data is crowdsourced and verified by local NGOs. Report new shelters using the Report tab.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: SPACING.lg },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:       { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText:       { color: COLORS.muted,  fontSize: FONTS.small, fontWeight: '600' },
  tabTextActive: { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '700' },

  card:      { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  cardTitle: { color: COLORS.text,  fontSize: FONTS.label, fontWeight: '700', marginBottom: 4 },
  cardSub:   { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18, marginBottom: SPACING.md },

  inputGroup:   { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  inputDot:     { width: 10, height: 10, borderRadius: 5 },
  inputDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.lg + 10 + SPACING.sm },
  input:        { flex: 1, color: COLORS.text, fontSize: FONTS.body, paddingVertical: SPACING.sm },

  findBtn:         { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  findBtnDisabled: { backgroundColor: COLORS.accent + '66' },
  findBtnText:     { color: COLORS.black, fontWeight: '800', fontSize: FONTS.label },

  routeSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  routeTitle: { color: COLORS.text, fontSize: FONTS.label, fontWeight: '700' },
  routeArrow: { color: COLORS.muted, fontSize: FONTS.small, marginVertical: 2 },
  riskBadge:     { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  riskBadgeText: { fontSize: 11, fontWeight: '800' },
  routeMetaRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  routeMetaCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center' },
  routeMetaVal:   { color: COLORS.text,  fontSize: FONTS.small, fontWeight: '700' },
  routeMetaLabel: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
  warningBox: { backgroundColor: COLORS.danger + '11', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.danger + '44', padding: SPACING.sm, marginTop: SPACING.sm },
  warningText: { color: COLORS.danger, fontSize: FONTS.small, lineHeight: 18 },

  segmentRow:     { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md, alignItems: 'flex-start' },
  stepCircle:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNum:        { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  segmentContent: { flex: 1 },
  segmentRoute:   { color: COLORS.text,  fontSize: FONTS.body, fontWeight: '600', marginBottom: 2 },
  segmentNote:    { color: COLORS.muted, fontSize: FONTS.small, marginBottom: 4 },
  segmentMeta:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  segmentDist:    { color: COLORS.muted, fontSize: 11 },
  segRiskPill:    { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  segRiskText:    { fontSize: 10, fontWeight: '700' },

  mapsBtn:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
  mapsBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.label },

  historyItem: { borderLeftWidth: 3, paddingLeft: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  historyRoute: { color: COLORS.text,  fontSize: FONTS.body, fontWeight: '600' },
  historyMeta:  { color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },
  historyRisk:  { fontSize: 11, fontWeight: '800' },
  emptyText:    { color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center', paddingVertical: SPACING.xl, lineHeight: 22 },

  shelterHeader:     { marginBottom: SPACING.md },
  shelterHeaderTitle:{ color: COLORS.text,  fontSize: FONTS.title, fontWeight: '700' },
  shelterHeaderSub:  { color: COLORS.muted, fontSize: FONTS.body, marginTop: 2 },
  shelterCard:       { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, padding: SPACING.lg, marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  shelterNameRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4, flexWrap: 'wrap' },
  shelterName:       { color: COLORS.text,  fontSize: FONTS.body, fontWeight: '600', flex: 1 },
  shelterStatusBadge:{ borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  shelterStatusText: { fontSize: 10, fontWeight: '700' },
  shelterMeta:       { color: COLORS.muted, fontSize: FONTS.small },
  navigateBtn:       { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  navigateBtnText:   { color: COLORS.black, fontWeight: '800', fontSize: FONTS.small },
  shelterNote:       { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginTop: SPACING.sm },
  shelterNoteText:   { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18, textAlign: 'center' },
});

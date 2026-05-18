import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useSensors from '../hooks/useSensors';
import AltitudeMeter from '../components/AltitudeMeter';
import { SlopeGauge, RiskScoreCard } from '../components/SlopeGauge';
import AltitudeGraph from '../components/AltitudeGraph';
import PressureCard from '../components/PressureCard';
import CalibrationModal from '../components/CalibrationModal';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function HomeScreen() {
  const [showCalib, setShowCalib] = useState(false);

  const {
    altitude,
    gpsAltitude,
    baroAltitude,
    slope,
    pressure,
    coords,
    riskLevel,
    slopeSeverity,
    riskScore,
    altHistory,
    pressureTrend,
    movementLabel,
    maxAlt,
    minAlt,
    sessionMinutes,
    loading,
    error,
    hasBarometer,
    calibOffset,
    calibrate,
    resetCalibration,
  } = useSensors();

  const handleSOS = () => {
    if (!coords) {
      Alert.alert('GPS not ready', 'Waiting for GPS signal...');
      return;
    }
    const msg =
      'HILLSAFE SOS ALERT!\n' +
      'I need help! My location:\n' +
      'Lat: ' + coords.latitude.toFixed(5) + '\n' +
      'Lng: ' + coords.longitude.toFixed(5) + '\n' +
      'Altitude: ' + altitude + 'm\n' +
      'Maps: https://maps.google.com/?q=' + coords.latitude + ',' + coords.longitude;
    Linking.openURL('sms:?body=' + encodeURIComponent(msg)).catch(() =>
      Alert.alert('SOS Alert', msg)
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Acquiring GPS signal...</Text>
        <Text style={styles.loadingSub}>Allow location permission when prompted</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const riskColor =
    riskScore <= 3 ? COLORS.safe :
    riskScore <= 6 ? COLORS.caution :
    COLORS.danger;

  const altitudeSource =
    hasBarometer      ? 'Barometric sensor — accurate to 5m' :
    gpsAltitude !== null ? 'GPS altitude — accurate to 20m' :
    'Open-Elevation API — accurate to 10m';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={styles.gpsRow}>
            <View style={[styles.dot, { backgroundColor: coords ? COLORS.safe : COLORS.caution }]} />
            <Text style={styles.gpsText}>{coords ? 'GPS Active · Live' : 'Acquiring...'}</Text>
          </View>
          <TouchableOpacity style={styles.calibBtn} onPress={() => setShowCalib(true)}>
            <Text style={styles.calibBtnText}>Calibrate</Text>
          </TouchableOpacity>
        </View>

        {coords && (
          <Text style={styles.coords}>
            {coords.latitude.toFixed(4)}N  {coords.longitude.toFixed(4)}E
          </Text>
        )}

        {/* Altitude meter */}
        <AltitudeMeter altitude={altitude} riskLevel={riskLevel} hasBarometer={hasBarometer} />
        <View style={styles.gap} />

        {/* Session stats */}
        <View style={styles.sessionRow}>
          {[
            { label: 'Session High', value: (maxAlt ?? altitude) + 'm', color: COLORS.danger  },
            { label: 'Session Low',  value: (minAlt ?? altitude) + 'm', color: COLORS.safe    },
            { label: 'Movement',     value: movementLabel,               color: COLORS.accent  },
            { label: 'Time',         value: sessionMinutes + ' min',     color: COLORS.muted   },
          ].map(s => (
            <View key={s.label} style={styles.sessionCard}>
              <Text style={[styles.sessionVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.sessionLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.gap} />

        {/* Altitude source info card */}
        <View style={styles.sourceCard}>
          <Text style={styles.sourceTitle}>Altitude Source</Text>
          {[
            { method: 'Barometer',          accuracy: '5m',  active: hasBarometer,         color: COLORS.safe    },
            { method: 'GPS',                accuracy: '20m', active: gpsAltitude !== null,  color: COLORS.caution },
            { method: 'Open-Elevation API', accuracy: '10m', active: !hasBarometer,         color: COLORS.accent  },
          ].map(s => (
            <View key={s.method} style={styles.sourceRow}>
              <View style={[styles.sourceDot, { backgroundColor: s.active ? s.color : COLORS.border }]} />
              <Text style={[styles.sourceMethod, { color: s.active ? COLORS.text : COLORS.muted }]}>
                {s.method}
              </Text>
              <Text style={styles.sourceAccuracy}>+/- {s.accuracy}</Text>
              <Text style={[styles.sourceStatus, { color: s.active ? s.color : COLORS.border }]}>
                {s.active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.gap} />

        {/* Altitude graph */}
        <AltitudeGraph
          altHistory={altHistory}
          maxAlt={maxAlt ?? altitude}
          minAlt={minAlt ?? altitude}
          movementLabel={movementLabel}
        />
        <View style={styles.gap} />

        {/* Slope gauge */}
        <SlopeGauge slope={slope} slopeSeverity={slopeSeverity} />
        <View style={styles.gap} />

        {/* Pressure card */}
        <PressureCard
          pressure={pressure}
          pressureTrend={pressureTrend}
          hasBarometer={hasBarometer}
        />
        <View style={styles.gap} />

        {/* Risk score */}
        <RiskScoreCard riskScore={riskScore} altitude={altitude} slope={slope} />
        <View style={styles.gap} />

        {/* SOS button */}
        <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.85}>
          <Text style={styles.sosBtnText}>SOS — BROADCAST MY LOCATION</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      <CalibrationModal
        visible={showCalib}
        onClose={() => setShowCalib(false)}
        currentAltitude={altitude}
        calibOffset={calibOffset}
        onCalibrate={calibrate}
        onReset={resetCalibration}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: SPACING.lg },
  centered: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  loadingText: { color: COLORS.text, fontSize: FONTS.title, marginTop: SPACING.lg, fontWeight: '600' },
  loadingSub:  { color: COLORS.muted, fontSize: FONTS.body, marginTop: SPACING.sm, textAlign: 'center' },
  errorText:   { color: COLORS.danger, fontSize: FONTS.label, textAlign: 'center' },
  statusBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gpsRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  gpsText:     { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '600' },
  calibBtn:    { paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: COLORS.card, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  calibBtnText:{ color: COLORS.accent, fontSize: FONTS.small },
  coords:      { color: COLORS.muted, fontSize: 11, marginBottom: SPACING.md },
  gap:         { height: SPACING.md },
  sessionRow:  { flexDirection: 'row', gap: SPACING.sm },
  sessionCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm, alignItems: 'center' },
  sessionVal:  { fontSize: FONTS.small, fontWeight: '700' },
  sessionLabel:{ color: COLORS.muted, fontSize: 9, marginTop: 2, textAlign: 'center' },
  sourceCard:  { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  sourceTitle: { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.sm },
  sourceRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sourceDot:   { width: 8, height: 8, borderRadius: 4 },
  sourceMethod:{ flex: 1, fontSize: FONTS.body },
  sourceAccuracy:{ color: COLORS.muted, fontSize: FONTS.small },
  sourceStatus:{ fontSize: 11, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  sosBtn:      { backgroundColor: COLORS.danger, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  sosBtnText:  { color: COLORS.white, fontWeight: '800', fontSize: FONTS.label, letterSpacing: 0.5 },
});

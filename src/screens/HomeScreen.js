// ─── HomeScreen ──────────────────────────────────────────────────────────────
// The main dashboard screen of HillSafe.
// Shows: GPS status, altitude meter, slope gauge, stat grid, risk score, SOS button.
// All sensor data comes from the useSensors() hook.

import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useSensors from '../hooks/useSensors';
import AltitudeMeter from '../components/AltitudeMeter';
import SlopeGauge from '../components/SlopeGauge';
import RiskScoreCard from '../components/RiskScoreCard';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function HomeScreen() {
  const {
    altitude, slope, pressure, coords,
    riskLevel, slopeSeverity, riskScore,
    loading, error, hasBarometer,
  } = useSensors();

  // ── SOS handler ─────────────────────────────────────────────────────────
  const handleSOS = () => {
    if (!coords) {
      Alert.alert('GPS not ready', 'Please wait for GPS to acquire your location.');
      return;
    }
    const msg = `🆘 HILLSAFE SOS ALERT!\nI need help! My location:\nLat: ${coords.latitude.toFixed(5)}\nLng: ${coords.longitude.toFixed(5)}\nAltitude: ${altitude}m\nGoogle Maps: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    // Opens WhatsApp or SMS with pre-filled message
    const smsUrl = `sms:?body=${encodeURIComponent(msg)}`;
    Linking.openURL(smsUrl).catch(() => {
      Alert.alert('SOS', msg); // fallback: show in alert so user can copy
    });
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Acquiring GPS signal...</Text>
        <Text style={styles.loadingSubtext}>Please allow location permission</Text>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 40 }}>📡</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>
          Go to phone Settings → Apps → HillSafe → Permissions → Location
        </Text>
      </View>
    );
  }

  // ── GPS status row ───────────────────────────────────────────────────────
  const gpsStatus = coords
    ? `${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`
    : 'Searching...';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* GPS status bar */}
        <View style={styles.gpsBar}>
          <View style={styles.gpsLive}>
            <View style={[styles.dot, { backgroundColor: coords ? COLORS.safe : COLORS.caution }]} />
            <Text style={styles.gpsLabel}>
              {coords ? 'GPS Active · Live' : 'Acquiring GPS...'}
            </Text>
          </View>
          <Text style={styles.gpsCoords}>{gpsStatus}</Text>
        </View>

        {/* Altitude meter */}
        <AltitudeMeter
          altitude={altitude}
          riskLevel={riskLevel}
          hasBarometer={hasBarometer}
        />

        <View style={styles.gap} />

        {/* Slope gauge */}
        <SlopeGauge slope={slope} slopeSeverity={slopeSeverity} />

        <View style={styles.gap} />

        {/* Quick stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="thermometer" label="Pressure" value={pressure ? `${pressure} hPa` : 'N/A'} />
          <StatCard icon="speedometer" label="Risk Score" value={`${riskScore}/10`} color={riskScoreColor(riskScore)} />
          <StatCard icon="home" label="Nearest Shelter" value="Week 3" muted />
          <StatCard icon="pin" label="Nearby Pins" value="Week 4" muted />
        </View>

        <View style={styles.gap} />

        {/* Risk score card */}
        <RiskScoreCard
          riskScore={riskScore}
          altitude={altitude}
          slope={slope}
        />

        <View style={styles.gap} />

        {/* Barometer note */}
        {!hasBarometer && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color={COLORS.accent} />
            <Text style={styles.infoText}>
              Barometer not detected — using GPS altitude. Result may vary by ±20m.
            </Text>
          </View>
        )}

        {/* SOS Button */}
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.85}>
          <Ionicons name="alert-circle" size={22} color={COLORS.white} />
          <Text style={styles.sosText}>SOS — BROADCAST MY LOCATION</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StatCard sub-component ──────────────────────────────────────────────────
function StatCard({ icon, label, value, color, muted }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon + '-outline'} size={20} color={muted ? COLORS.border : COLORS.accent} />
      <Text style={[statStyles.value, color ? { color } : null, muted && statStyles.muted]}>
        {value}
      </Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function riskScoreColor(score) {
  if (score <= 3) return COLORS.safe;
  if (score <= 6) return COLORS.caution;
  return COLORS.danger;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg },
  centered: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.text, fontSize: FONTS.title, marginTop: SPACING.lg, fontWeight: '600',
  },
  loadingSubtext: {
    color: COLORS.muted, fontSize: FONTS.body, marginTop: SPACING.sm, textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger, fontSize: FONTS.label, marginTop: SPACING.md,
    textAlign: 'center', fontWeight: '600',
  },
  errorSubtext: {
    color: COLORS.muted, fontSize: FONTS.body, marginTop: SPACING.sm,
    textAlign: 'center', lineHeight: 20,
  },
  gpsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  gpsLive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gpsLabel: { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '600' },
  gpsCoords: { color: COLORS.muted, fontSize: 11 },
  gap: { height: SPACING.md },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  infoText: { color: COLORS.muted, fontSize: FONTS.small, flex: 1, lineHeight: 18 },
  sosButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.danger,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  sosText: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.label, letterSpacing: 0.5 },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: 4,
  },
  value: { color: COLORS.text, fontSize: FONTS.label, fontWeight: '700' },
  label: { color: COLORS.muted, fontSize: 11 },
  muted: { color: COLORS.border },
});

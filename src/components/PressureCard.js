import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function PressureCard({ pressure, pressureTrend, hasBarometer }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atmospheric Pressure</Text>

      {hasBarometer ? (
        <>
          <Text style={styles.value}>{pressure} hPa</Text>
          <View style={[styles.trendBadge, {
            backgroundColor: pressureTrend === 'falling' ? COLORS.danger + '22' :
                             pressureTrend === 'rising'  ? COLORS.safe + '22' :
                             COLORS.accent + '22',
            borderColor: pressureTrend === 'falling' ? COLORS.danger :
                         pressureTrend === 'rising'  ? COLORS.safe :
                         COLORS.accent,
          }]}>
            <Text style={[styles.trendText, {
              color: pressureTrend === 'falling' ? COLORS.danger :
                     pressureTrend === 'rising'  ? COLORS.safe :
                     COLORS.accent,
            }]}>
              {pressureTrend === 'rising'  ? 'Rising — Weather improving' :
               pressureTrend === 'falling' ? 'Falling — Weather worsening' :
               'Stable — Conditions steady'}
            </Text>
          </View>
          <View style={styles.scaleTrack}>
            <View style={[styles.scaleFill, {
              width: (Math.min(((pressure - 980) / 50) * 100, 100)) + '%',
              backgroundColor: pressure > 1010 ? COLORS.safe :
                               pressure > 995  ? COLORS.caution : COLORS.danger,
            }]} />
          </View>
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleLabel, { color: COLORS.danger }]}>980 hPa</Text>
            <Text style={[styles.scaleLabel, { color: COLORS.caution }]}>1000</Text>
            <Text style={[styles.scaleLabel, { color: COLORS.safe }]}>1030 hPa</Text>
          </View>
        </>
      ) : (
        <>
          {/* No barometer — show what we use instead */}
          <View style={styles.noBaroHeader}>
            <Text style={styles.noBaroMain}>No Barometer</Text>
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>HARDWARE NOT FOUND</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How HillSafe compensates:</Text>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.caution }]} />
              <Text style={styles.infoText}>GPS altitude used instead (±20m accuracy)</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.infoText}>Open-Elevation API as secondary backup</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.safe }]} />
              <Text style={styles.infoText}>Manual calibration available (tap Calibrate)</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Phones with barometers:</Text>
            <Text style={styles.tipText}>Samsung Galaxy S-series, Google Pixel, OnePlus Pro, iPhone 6+</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title:       { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.sm },
  value:       { fontSize: 28, fontWeight: '800', color: COLORS.accent, marginBottom: SPACING.sm },
  trendBadge:  { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md },
  trendText:   { fontSize: FONTS.body, fontWeight: '600' },
  scaleTrack:  { height: 6, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 4 },
  scaleFill:   { height: '100%', borderRadius: RADIUS.full },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel:  { fontSize: 9, fontWeight: '600' },
  noBaroHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  noBaroMain:  { color: COLORS.muted, fontSize: 22, fontWeight: '800' },
  inactiveBadge:   { backgroundColor: COLORS.border + '44', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  inactiveBadgeText: { color: COLORS.muted, fontSize: 9, fontWeight: '700' },
  infoBox:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm },
  infoTitle:   { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '700', marginBottom: SPACING.sm },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  infoText:    { color: COLORS.text, fontSize: FONTS.small, flex: 1 },
  tipBox:      { backgroundColor: COLORS.accent + '11', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent + '44', padding: SPACING.md },
  tipTitle:    { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '700', marginBottom: 4 },
  tipText:     { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18 },
});

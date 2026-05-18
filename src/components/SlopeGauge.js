// SlopeGauge v2
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const SLOPE_CONFIG = {
  gentle:   { color: COLORS.safe,    label: 'Gentle slope'   },
  moderate: { color: COLORS.caution, label: 'Moderate slope'  },
  steep:    { color: COLORS.danger,  label: 'Steep terrain!'  },
};

export function SlopeGauge({ slope, slopeSeverity }) {
  const config   = SLOPE_CONFIG[slopeSeverity] || SLOPE_CONFIG.gentle;
  const activeBars = Math.round((Math.min(slope, 50) / 50) * 10);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Slope Angle</Text>
      <View style={styles.row}>
        <Text style={[styles.angle, { color: config.color }]}>{slope}deg</Text>
        <Text style={[styles.severity, { color: config.color }]}>{config.label}</Text>
      </View>
      <View style={styles.barsRow}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={[styles.bar, {
            height: 6 + i * 4,
            backgroundColor: i < activeBars ? config.color : COLORS.border,
          }]} />
        ))}
      </View>
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleLabel, { color: COLORS.safe }]}>0 safe</Text>
        <Text style={[styles.scaleLabel, { color: COLORS.caution }]}>20 moderate</Text>
        <Text style={[styles.scaleLabel, { color: COLORS.danger }]}>35+ steep</Text>
      </View>
      <Text style={styles.tip}>
        Tip: Lay phone flat on ground surface to measure terrain slope
      </Text>
    </View>
  );
}

// RiskScoreCard v2
export function RiskScoreCard({ riskScore, altitude, slope }) {
  const color = riskScore <= 3 ? COLORS.safe : riskScore <= 6 ? COLORS.caution : COLORS.danger;
  const label = riskScore <= 3 ? 'Low Risk' : riskScore <= 6 ? 'Moderate Risk' : 'High Risk - Stay Alert';

  const factors = [
    { name: 'Altitude',       value: altitude + 'm', points: altitude > 1400 ? 4 : altitude > 800 ? 2 : 0, max: 4 },
    { name: 'Slope',          value: slope + 'deg',  points: slope > 35 ? 3 : slope > 20 ? 1.5 : 0,        max: 3 },
    { name: 'Rain forecast',  value: 'Week 5',       points: 0, max: 3, disabled: true },
    { name: 'Nearby reports', value: 'Week 4',       points: 0, max: 2, disabled: true },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.scoreRow}>
        <View>
          <Text style={styles.label}>Risk Score</Text>
          <Text style={[styles.score, { color }]}>{riskScore}<Text style={styles.scoreMax}>/10</Text></Text>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
        </View>
        <View style={[styles.circle, { borderColor: color }]}>
          <Text style={[styles.circleScore, { color }]}>{riskScore}</Text>
          <Text style={styles.circleMax}>/10</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.breakdownTitle}>Score Breakdown</Text>
      {factors.map(f => (
        <View key={f.name} style={styles.factorRow}>
          <Text style={[styles.factorName, f.disabled && styles.disabled]}>{f.name}</Text>
          <Text style={[styles.factorValue, f.disabled && styles.disabled]}>{f.value}</Text>
          <View style={styles.factorBarTrack}>
            <View style={[styles.factorBarFill, {
              width: `${(f.points / f.max) * 100}%`,
              backgroundColor: f.disabled ? COLORS.border : color,
            }]} />
          </View>
          <Text style={[styles.factorPoints, f.disabled && styles.disabled]}>
            {f.disabled ? '-' : '+' + f.points}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg,
  },
  label:    { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1.5 },
  row:      { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: SPACING.md },
  angle:    { fontSize: 38, fontWeight: '800' },
  severity: { fontSize: FONTS.label, fontWeight: '600', paddingBottom: 6 },
  barsRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: SPACING.sm },
  bar:      { flex: 1, borderRadius: 3 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { fontSize: 10, fontWeight: '600' },
  tip: { color: COLORS.muted, fontSize: 11, marginTop: SPACING.sm, fontStyle: 'italic' },
  // RiskScore styles
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score:    { fontSize: 36, fontWeight: '800' },
  scoreMax: { fontSize: FONTS.label, color: COLORS.muted },
  scoreLabel: { fontSize: FONTS.small, fontWeight: '600' },
  circle: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  circleScore: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  circleMax:   { fontSize: 10, color: COLORS.muted },
  divider:     { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  breakdownTitle: { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm },
  factorRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 8 },
  factorName:  { color: COLORS.text, fontSize: FONTS.small, width: 90 },
  factorValue: { color: COLORS.accent, fontSize: FONTS.small, width: 55, textAlign: 'right' },
  factorBarTrack: { flex: 1, height: 6, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden' },
  factorBarFill:  { height: '100%', borderRadius: RADIUS.full },
  factorPoints:   { color: COLORS.text, fontSize: FONTS.small, width: 24, textAlign: 'right', fontWeight: '700' },
  disabled: { color: COLORS.border },
});

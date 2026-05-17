// ─── SlopeGauge Component ───────────────────────────────────────────────────
// Displays terrain slope angle with growing bar segments.
// Reads from accelerometer via useSensors hook.

import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SLOPE_THRESHOLDS } from '../constants/theme';

const SLOPE_CONFIG = {
  gentle:   { color: COLORS.safe,    label: 'Gentle slope',   icon: '🟢' },
  moderate: { color: COLORS.caution, label: 'Moderate slope',  icon: '🟡' },
  steep:    { color: COLORS.danger,  label: 'Steep! ⚠️',       icon: '🔴' },
};

const NUM_BARS = 10;
const MAX_ANGLE = 50; // 50° = all bars full

export default function SlopeGauge({ slope, slopeSeverity }) {
  const config = SLOPE_CONFIG[slopeSeverity] || SLOPE_CONFIG.gentle;
  const activeBars = Math.round((slope / MAX_ANGLE) * NUM_BARS);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Slope Angle</Text>

      <View style={styles.row}>
        <Text style={[styles.angle, { color: config.color }]}>
          {slope}°
        </Text>
        <Text style={[styles.severity, { color: config.color }]}>
          {config.icon} {config.label}
        </Text>
      </View>

      {/* Growing bar segments — taller as slope increases */}
      <View style={styles.barsRow}>
        {Array.from({ length: NUM_BARS }).map((_, i) => {
          const isActive = i < activeBars;
          const height = 6 + i * 4; // bars grow taller left to right
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: isActive ? config.color : COLORS.border,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Scale labels */}
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleLabel, { color: COLORS.safe }]}>
          0° safe
        </Text>
        <Text style={[styles.scaleLabel, { color: COLORS.caution }]}>
          {SLOPE_THRESHOLDS.safe}° moderate
        </Text>
        <Text style={[styles.scaleLabel, { color: COLORS.danger }]}>
          {SLOPE_THRESHOLDS.moderate}°+ steep
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  label: {
    color: COLORS.muted,
    fontSize: FONTS.small,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: SPACING.md,
  },
  angle: {
    fontSize: 38,
    fontWeight: '800',
  },
  severity: {
    fontSize: FONTS.label,
    fontWeight: '600',
    paddingBottom: 6,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

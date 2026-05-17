// ─── AltitudeMeter Component ────────────────────────────────────────────────
// Displays current altitude with a color-coded risk bar and label.
// Green = safe, Yellow = caution, Red = danger

import { View, Text, StyleSheet, Animated, useEffect } from 'react-native';
import { useRef } from 'react';
import { COLORS, FONTS, RADIUS, SPACING, ALTITUDE_THRESHOLDS } from '../constants/theme';

const RISK_CONFIG = {
  safe:    { color: COLORS.safe,    label: 'SAFE ZONE',    emoji: '✅' },
  caution: { color: COLORS.caution, label: 'CAUTION ZONE', emoji: '⚠️' },
  danger:  { color: COLORS.danger,  label: 'HIGH RISK',    emoji: '🔴' },
  unknown: { color: COLORS.muted,   label: 'ACQUIRING...', emoji: '📡' },
};

const MAX_DISPLAY_ALTITUDE = 2000; // metres — bar is full at 2000m

export default function AltitudeMeter({ altitude, riskLevel, hasBarometer }) {
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.unknown;
  const barPercent = Math.min((altitude / MAX_DISPLAY_ALTITUDE) * 100, 100);
  const animWidth = useRef(new Animated.Value(0)).current;

  // Animate bar width whenever altitude changes
  useRef(() => {
    Animated.timing(animWidth, {
      toValue: barPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  });

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.row}>
        <Text style={styles.label}>Current Altitude</Text>
        <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>
            {config.emoji} {config.label}
          </Text>
        </View>
      </View>

      {/* Big altitude number */}
      <Text style={[styles.altNumber, { color: config.color }]}>
        {altitude.toLocaleString()}
        <Text style={styles.unit}> m</Text>
      </Text>

      {/* Sensor source label */}
      <Text style={styles.source}>
        {hasBarometer ? '🌡️ Barometric (accurate)' : '📡 GPS altitude'}
      </Text>

      {/* Risk bar */}
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: `${barPercent}%`,
              backgroundColor: config.color,
            },
          ]}
        />
      </View>

      {/* Scale labels */}
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleLabel, { color: COLORS.safe }]}>0m</Text>
        <Text style={[styles.scaleLabel, { color: COLORS.caution }]}>
          {ALTITUDE_THRESHOLDS.safe}m
        </Text>
        <Text style={[styles.scaleLabel, { color: COLORS.danger }]}>
          {ALTITUDE_THRESHOLDS.caution}m+
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    color: COLORS.muted,
    fontSize: FONTS.small,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  altNumber: {
    fontSize: FONTS.hero,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unit: {
    fontSize: FONTS.title,
    color: COLORS.muted,
  },
  source: {
    color: COLORS.muted,
    fontSize: FONTS.small,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  barTrack: {
    height: 10,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  scaleLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

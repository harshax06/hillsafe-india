import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const RISK_CONFIG = {
  safe:    { color: COLORS.safe,    label: 'SAFE ZONE'    },
  caution: { color: COLORS.caution, label: 'CAUTION ZONE' },
  danger:  { color: COLORS.danger,  label: 'HIGH RISK'    },
  unknown: { color: COLORS.muted,   label: 'ACQUIRING...' },
};

export default function AltitudeMeter({ altitude, riskLevel, hasBarometer }) {
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.unknown;
  const barPct = Math.min((altitude / 2000) * 100, 100);
  const animW  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animW, {
      toValue: barPct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [barPct]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Current Altitude</Text>
        <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      <Text style={[styles.altNumber, { color: config.color }]}>
        {altitude.toLocaleString()}
        <Text style={styles.unit}> m</Text>
      </Text>

      <Text style={styles.source}>
        {hasBarometer ? 'Barometric sensor — accurate to 5m' : 'GPS altitude — accurate to 20m'}
      </Text>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, {
          width: animW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          backgroundColor: config.color,
        }]} />
      </View>

      <View style={styles.scaleRow}>
        <Text style={[styles.scaleLabel, { color: COLORS.safe }]}>0m Safe</Text>
        <Text style={[styles.scaleLabel, { color: COLORS.caution }]}>800m</Text>
        <Text style={[styles.scaleLabel, { color: COLORS.danger }]}>1400m+ Risk</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  label:      { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1.5 },
  badge:      { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  altNumber:  { fontSize: FONTS.hero, fontWeight: '800', letterSpacing: -1 },
  unit:       { fontSize: FONTS.title, color: COLORS.muted },
  source:     { color: COLORS.muted, fontSize: FONTS.small, marginTop: 2, marginBottom: SPACING.md },
  barTrack:   { height: 10, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: RADIUS.full },
  scaleRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  scaleLabel: { fontSize: 10, fontWeight: '600' },
});

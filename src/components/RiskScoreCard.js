// ─── RiskScoreCard Component ─────────────────────────────────────────────────
// Shows the combined risk score (0–10) based on altitude + slope.
// Week 5 will add rain and nearby pins to this score.

import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

function getScoreColor(score) {
  if (score <= 3) return COLORS.safe;
  if (score <= 6) return COLORS.caution;
  return COLORS.danger;
}

function getScoreLabel(score) {
  if (score <= 3) return 'Low Risk';
  if (score <= 6) return 'Moderate Risk';
  return 'High Risk — Stay Alert';
}

export default function RiskScoreCard({ riskScore, altitude, slope }) {
  const color = getScoreColor(riskScore);
  const label = getScoreLabel(riskScore);

  const factors = [
    {
      name: 'Altitude',
      value: altitude + 'm',
      points: altitude > 1400 ? 4 : altitude > 800 ? 2 : 0,
      max: 4,
    },
    {
      name: 'Slope',
      value: slope + '°',
      points: slope > 35 ? 3 : slope > 20 ? 1.5 : 0,
      max: 3,
    },
    {
      name: 'Rain forecast',
      value: 'Week 5',
      points: 0,
      max: 3,
      disabled: true,
    },
    {
      name: 'Nearby reports',
      value: 'Week 4',
      points: 0,
      max: 2,
      disabled: true,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Score display */}
      <View style={styles.scoreRow}>
        <View>
          <Text style={styles.label}>Risk Score</Text>
          <Text style={[styles.score, { color }]}>
            {riskScore}
            <Text style={styles.scoreMax}>/10</Text>
          </Text>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
        </View>

        {/* Circle indicator */}
        <View style={[styles.circle, { borderColor: color }]}>
          <Text style={[styles.circleScore, { color }]}>{riskScore}</Text>
          <Text style={[styles.circleMax, { color: COLORS.muted }]}>/10</Text>
        </View>
      </View>

      {/* Factor breakdown */}
      <View style={styles.divider} />
      <Text style={styles.breakdownTitle}>Score Breakdown</Text>
      {factors.map((f) => (
        <View key={f.name} style={styles.factorRow}>
          <Text style={[styles.factorName, f.disabled && styles.disabled]}>
            {f.name}
          </Text>
          <Text style={[styles.factorValue, f.disabled && styles.disabled]}>
            {f.value}
          </Text>
          <View style={styles.factorBarTrack}>
            <View
              style={[
                styles.factorBarFill,
                {
                  width: `${(f.points / f.max) * 100}%`,
                  backgroundColor: f.disabled ? COLORS.border : color,
                },
              ]}
            />
          </View>
          <Text style={[styles.factorPoints, f.disabled && styles.disabled]}>
            {f.disabled ? '—' : `+${f.points}`}
          </Text>
        </View>
      ))}
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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: COLORS.muted,
    fontSize: FONTS.small,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: FONTS.label,
    color: COLORS.muted,
  },
  scoreLabel: {
    fontSize: FONTS.small,
    fontWeight: '600',
  },
  circle: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleScore: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  circleMax: {
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  breakdownTitle: {
    color: COLORS.muted,
    fontSize: FONTS.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 8,
  },
  factorName: {
    color: COLORS.text,
    fontSize: FONTS.small,
    width: 90,
  },
  factorValue: {
    color: COLORS.accent,
    fontSize: FONTS.small,
    width: 55,
    textAlign: 'right',
  },
  factorBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  factorPoints: {
    color: COLORS.text,
    fontSize: FONTS.small,
    width: 24,
    textAlign: 'right',
    fontWeight: '700',
  },
  disabled: {
    color: COLORS.border,
  },
});

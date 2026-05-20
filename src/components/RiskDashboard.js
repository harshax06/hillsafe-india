// ─── RiskDashboard ────────────────────────────────────────────────────────────
// Shows combined risk score from altitude + slope + weather + pins

import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { getWeatherRiskScore } from '../services/weather';

function RiskFactor({ label, score, maxScore, color, value }) {
  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <Text style={[styles.factorValue, { color: color || COLORS.muted }]}>{value}</Text>
      <View style={styles.factorBarTrack}>
        <View style={[styles.factorBarFill, {
          width: ((score / maxScore) * 100) + '%',
          backgroundColor: color || COLORS.muted,
        }]} />
      </View>
      <Text style={[styles.factorScore, { color: color || COLORS.muted }]}>
        +{score}
      </Text>
    </View>
  );
}

export default function RiskDashboard({ altitude, slope, weather, nearbyPins, totalRisk }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: totalRisk / 10,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [totalRisk]);

  const riskColor =
    totalRisk <= 3  ? COLORS.safe :
    totalRisk <= 6  ? COLORS.caution :
    totalRisk <= 8  ? COLORS.orange :
    COLORS.danger;

  const riskLabel =
    totalRisk <= 3  ? 'LOW RISK'      :
    totalRisk <= 6  ? 'MODERATE RISK' :
    totalRisk <= 8  ? 'HIGH RISK'     :
    'EXTREME RISK';

  const altScore     = altitude > 1400 ? 4 : altitude > 800 ? 2 : altitude > 400 ? 0.5 : 0;
  const slopeScore   = slope > 35 ? 3 : slope > 20 ? 1.5 : slope > 10 ? 0.5 : 0;
  const weatherScore = getWeatherRiskScore(weather);
  const pinScore     = nearbyPins >= 3 ? 2 : nearbyPins >= 1 ? 1 : 0;

  return (
    <View style={styles.container}>
      {/* Big score display */}
      <View style={styles.scoreRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Combined Risk Score</Text>
          <Text style={[styles.bigScore, { color: riskColor }]}>
            {totalRisk}
            <Text style={styles.bigScoreMax}>/10</Text>
          </Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor + '22', borderColor: riskColor }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>{riskLabel}</Text>
          </View>
        </View>

        {/* Circular progress */}
        <View style={[styles.circle, { borderColor: riskColor }]}>
          <Text style={[styles.circleNum, { color: riskColor }]}>{totalRisk}</Text>
          <Text style={styles.circleDenom}>/10</Text>
        </View>
      </View>

      {/* Animated bar */}
      <View style={styles.totalBarTrack}>
        <Animated.View style={[styles.totalBarFill, {
          width: animVal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: riskColor,
        }]} />
        {/* Risk zone markers */}
        <View style={[styles.marker, { left: '30%' }]} />
        <View style={[styles.marker, { left: '60%' }]} />
        <View style={[styles.marker, { left: '80%' }]} />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabel, { color: COLORS.safe }]}>Low</Text>
        <Text style={[styles.barLabel, { color: COLORS.caution }]}>Moderate</Text>
        <Text style={[styles.barLabel, { color: COLORS.orange }]}>High</Text>
        <Text style={[styles.barLabel, { color: COLORS.danger }]}>Extreme</Text>
      </View>

      {/* Factor breakdown */}
      <View style={styles.divider} />
      <Text style={styles.breakdownTitle}>SCORE BREAKDOWN</Text>

      <RiskFactor
        label="Altitude"
        value={altitude + 'm'}
        score={altScore}
        maxScore={4}
        color={altitude > 1400 ? COLORS.danger : altitude > 800 ? COLORS.caution : COLORS.safe}
      />
      <RiskFactor
        label="Slope"
        value={slope + 'deg'}
        score={slopeScore}
        maxScore={3}
        color={slope > 35 ? COLORS.danger : slope > 20 ? COLORS.caution : COLORS.safe}
      />
      <RiskFactor
        label="Weather"
        value={weather ? Math.round(weather.maxRainNext24h) + 'mm' : 'N/A'}
        score={weatherScore}
        maxScore={3}
        color={weatherScore >= 2 ? COLORS.danger : weatherScore >= 1 ? COLORS.caution : COLORS.safe}
      />
      <RiskFactor
        label="Nearby Pins"
        value={nearbyPins + ' reports'}
        score={pinScore}
        maxScore={2}
        color={nearbyPins >= 3 ? COLORS.danger : nearbyPins >= 1 ? COLORS.caution : COLORS.safe}
      />

      {/* Action advice */}
      <View style={[styles.adviceBox, { backgroundColor: riskColor + '11', borderColor: riskColor + '44' }]}>
        <Text style={[styles.adviceText, { color: riskColor }]}>
          {totalRisk <= 3  ? 'Conditions safe. Continue normal activities but stay observant.'          :
           totalRisk <= 6  ? 'Moderate risk detected. Stay alert and avoid unstable terrain.'           :
           totalRisk <= 8  ? 'High risk! Limit movement, stay away from slopes and water bodies.'       :
           'Extreme risk! Seek shelter immediately and alert authorities.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#162033', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e3a5f', padding: 16,
  },
  scoreRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label:     { color: '#6b8ab0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  bigScore:  { fontSize: 48, fontWeight: '900', lineHeight: 54 },
  bigScoreMax: { fontSize: 18, color: '#6b8ab0' },
  riskBadge:   { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },
  circle:    { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  circleNum: { fontSize: 24, fontWeight: '900', lineHeight: 28 },
  circleDenom: { color: '#6b8ab0', fontSize: 11 },

  totalBarTrack: { height: 12, backgroundColor: '#0a0f1a', borderRadius: 6, overflow: 'hidden', marginBottom: 4, position: 'relative' },
  totalBarFill:  { height: '100%', borderRadius: 6 },
  marker:        { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#1e3a5f' },
  barLabels:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  barLabel:      { fontSize: 9, fontWeight: '600' },

  divider:        { height: 1, backgroundColor: '#1e3a5f', marginBottom: 12 },
  breakdownTitle: { color: '#6b8ab0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },

  factorRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  factorLabel:    { color: '#e2eaf4', fontSize: 12, width: 72 },
  factorValue:    { fontSize: 12, width: 60, textAlign: 'right' },
  factorBarTrack: { flex: 1, height: 6, backgroundColor: '#0a0f1a', borderRadius: 3, overflow: 'hidden' },
  factorBarFill:  { height: '100%', borderRadius: 3 },
  factorScore:    { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'right' },

  adviceBox:  { marginTop: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  adviceText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
});

// ─── AltitudeGraph ──────────────────────────────────────────────────────────
// Real-time line graph of last 20 altitude readings.
// Drawn using React Native's built-in SVG-style View positioning.
// No external library needed!

import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function AltitudeGraph({ altHistory, maxAlt, minAlt, movementLabel }) {
  const W = 300; // graph width  (arbitrary units, stretched by flex)
  const H = 80;  // graph height in px

  // Need at least 2 points to draw
  const hasData = altHistory && altHistory.length >= 2;

  // Calculate Y position for a value (inverted: high value = low Y = top)
  const getY = (value) => {
    const range = (maxAlt - minAlt) || 10;
    const pct = (value - minAlt) / range;
    return H - pct * H * 0.8 - H * 0.1; // 10% padding top/bottom
  };

  // Build polyline points string
  const points = hasData
    ? altHistory.map((d, i) => {
        const x = (i / (altHistory.length - 1)) * W;
        const y = getY(d.value);
        return `${x},${y}`;
      }).join(' ')
    : '';

  // Last value for the dot
  const lastPoint = hasData ? altHistory[altHistory.length - 1] : null;
  const lastX = hasData ? W : 0;
  const lastY = lastPoint ? getY(lastPoint.value) : H / 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Altitude History</Text>
        <View style={styles.movement}>
          <Text style={[
            styles.movementText,
            { color: movementLabel.includes('▲') ? COLORS.danger : movementLabel.includes('▼') ? COLORS.safe : COLORS.muted }
          ]}>
            {movementLabel}
          </Text>
        </View>
      </View>

      {/* Graph area */}
      <View style={styles.graphArea}>
        {!hasData ? (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Collecting data...</Text>
          </View>
        ) : (
          <View style={styles.graph}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={styles.yLabel}>{maxAlt}m</Text>
              <Text style={styles.yLabel}>{Math.round((maxAlt + minAlt) / 2)}m</Text>
              <Text style={styles.yLabel}>{minAlt}m</Text>
            </View>

            {/* Line graph drawn using absolute-positioned views */}
            <View style={styles.lineArea}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(pct => (
                <View key={pct} style={[styles.gridLine, { top: `${pct * 100}%` }]} />
              ))}

              {/* Draw line segments between points */}
              {altHistory.slice(1).map((point, i) => {
                const prev = altHistory[i];
                const x1 = (i / (altHistory.length - 1)) * 100;
                const x2 = ((i + 1) / (altHistory.length - 1)) * 100;
                const y1 = getY(prev.value);
                const y2 = getY(point.value);

                // Calculate line segment dimensions
                const dx = x2 - x1; // in percent
                const dy = y2 - y1; // in px
                const length = Math.sqrt((dx * 2.5) ** 2 + dy ** 2); // approximate
                const angle = Math.atan2(dy, dx * 2.5) * (180 / Math.PI);

                return (
                  <View
                    key={i}
                    style={[
                      styles.segment,
                      {
                        left: `${x1}%`,
                        top: y1,
                        width: `${dx}%`,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: 'left center',
                      }
                    ]}
                  />
                );
              })}

              {/* Live dot at latest reading */}
              <View style={[
                styles.liveDot,
                {
                  left: '97%',
                  top: getY(altHistory[altHistory.length - 1].value) - 5,
                }
              ]} />
            </View>
          </View>
        )}
      </View>

      {/* Footer stats */}
      <View style={styles.footer}>
        <View style={styles.footerStat}>
          <Text style={styles.footerVal}>{maxAlt ?? '—'}m</Text>
          <Text style={styles.footerLabel}>Session High</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerVal}>{minAlt ?? '—'}m</Text>
          <Text style={styles.footerLabel}>Session Low</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerVal}>{altHistory.length}</Text>
          <Text style={styles.footerLabel}>Readings</Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.muted,
    fontSize: FONTS.small,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  movement: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  movementText: { fontSize: FONTS.small, fontWeight: '700' },
  graphArea: { height: 90, marginBottom: SPACING.sm },
  noData: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noDataText: { color: COLORS.muted, fontSize: FONTS.small },
  graph: { flex: 1, flexDirection: 'row' },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  yLabel: { color: COLORS.muted, fontSize: 9, textAlign: 'right' },
  lineArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.4,
  },
  segment: {
    position: 'absolute',
    height: 2,
    backgroundColor: COLORS.accent,
    opacity: 0.8,
  },
  liveDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  footerStat: { alignItems: 'center' },
  footerVal: { color: COLORS.accent, fontSize: FONTS.label, fontWeight: '700' },
  footerLabel: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
});

// ─── MapScreen (Week 3 placeholder) ─────────────────────────────────────────
// Full map with community pins will be built in Week 3.
// This placeholder shows a static preview so the app is complete and runs.

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const MOCK_PINS = [
  { id: 1, type: 'landslide', label: 'Landslide Scar',    votes: 12, color: COLORS.danger  },
  { id: 2, type: 'flood',     label: 'Flash Flood Zone',  votes: 8,  color: COLORS.caution },
  { id: 3, type: 'road',      label: 'Road Blocked',       votes: 5,  color: COLORS.orange  },
  { id: 4, type: 'shelter',   label: 'Emergency Shelter',  votes: 21, color: COLORS.safe    },
];

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>

        {/* Coming soon banner */}
        <View style={styles.banner}>
          <Ionicons name="map" size={32} color={COLORS.accent} />
          <Text style={styles.bannerTitle}>Community Map</Text>
          <Text style={styles.bannerSub}>
            OpenStreetMap + live danger pins coming in Week 3.{'\n'}
            Here's a preview of what pins will look like:
          </Text>
        </View>

        {/* Mock pin list */}
        {MOCK_PINS.map((pin) => (
          <View key={pin.id} style={[styles.pinCard, { borderLeftColor: pin.color }]}>
            <View style={[styles.pinDot, { backgroundColor: pin.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pinLabel}>{pin.label}</Text>
              <Text style={styles.pinVotes}>👍 {pin.votes} community confirmations</Text>
            </View>
            <Text style={[styles.pinType, { color: pin.color }]}>
              {pin.type.toUpperCase()}
            </Text>
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Pin Types</Text>
          <View style={styles.legendRow}>
            {[
              { label: 'Landslide', color: COLORS.danger  },
              { label: 'Flood',     color: COLORS.caution },
              { label: 'Road',      color: COLORS.orange  },
              { label: 'Shelter',   color: COLORS.safe    },
            ].map((l) => (
              <View key={l.label} style={[styles.legendTag, { backgroundColor: l.color + '22', borderColor: l.color }]}>
                <Text style={[styles.legendTagText, { color: l.color }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: SPACING.lg },
  banner: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg,
  },
  bannerTitle: {
    color: COLORS.text, fontSize: FONTS.title, fontWeight: '700', marginTop: SPACING.sm,
  },
  bannerSub: {
    color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center',
    marginTop: SPACING.sm, lineHeight: 20,
  },
  pinCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  pinLabel: { color: COLORS.text, fontSize: FONTS.label, fontWeight: '600' },
  pinVotes: { color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },
  pinType:  { fontSize: 10, fontWeight: '700' },
  legend: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginTop: SPACING.sm,
  },
  legendTitle: { color: COLORS.muted, fontSize: FONTS.small, marginBottom: SPACING.sm },
  legendRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendTag: {
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  legendTagText: { fontSize: FONTS.small, fontWeight: '600' },
});

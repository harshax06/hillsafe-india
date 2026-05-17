import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const TYPES = [
  { id: 'landslide', label: 'Landslide', icon: '??', color: COLORS.danger  },
  { id: 'flood',     label: 'Flood Zone', icon: '??', color: COLORS.caution },
  { id: 'road',      label: 'Road Block', icon: '??', color: COLORS.orange  },
  { id: 'shelter',   label: 'Shelter',   icon: '??', color: COLORS.safe    },
];

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.sub}>Full reporting coming Week 4. UI preview:</Text>
        <View style={styles.grid}>
          {TYPES.map((t) => (
            <View key={t.id} style={[styles.card, { borderColor: t.color }]}>
              <Text style={styles.icon}>{t.icon}</Text>
              <Text style={[styles.label, { color: t.color }]}>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  sub:     { color: COLORS.muted, fontSize: FONTS.small, marginBottom: SPACING.md },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  card: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, borderWidth: 2,
    padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm,
  },
  icon:  { fontSize: 28 },
  label: { fontSize: FONTS.label, fontWeight: '600', textAlign: 'center' },
});

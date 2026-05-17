import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const MOCK_ALERTS = [
  { icon: '??', title: 'Landslide Risk Active',    desc: 'Altitude 1,340m + heavy rain forecast', time: '2 min ago',  color: COLORS.danger  },
  { icon: '??', title: 'Steep Slope Detected',     desc: 'Current gradient 38 degrees. Reduce speed.', time: 'Just now', color: COLORS.caution },
  { icon: '??', title: 'Report Verified',           desc: 'Road block at NH-58 confirmed by 4 users.', time: '15 min ago', color: COLORS.accent },
  { icon: '??', title: 'Safe Zone Ahead',           desc: 'Shelter point 2.1 km on your route.',   time: 'Now',        color: COLORS.safe    },
];

export default function AlertScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sub}>Push alerts coming in Week 5. Preview:</Text>
        {MOCK_ALERTS.map((a, i) => (
          <View key={i} style={[styles.card, { borderLeftColor: a.color }]}>
            <Text style={styles.icon}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: a.color }]}>{a.title}</Text>
              <Text style={styles.desc}>{a.desc}</Text>
            </View>
            <Text style={styles.time}>{a.time}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: SPACING.lg },
  sub:     { color: COLORS.muted, fontSize: FONTS.small, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4,
    flexDirection: 'row', alignItems: 'flex-start',
    gap: SPACING.sm, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  icon:  { fontSize: 20 },
  title: { fontSize: FONTS.label, fontWeight: '700' },
  desc:  { color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },
  time:  { color: COLORS.muted, fontSize: 11 },
});

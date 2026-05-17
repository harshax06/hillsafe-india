import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>HS</Text>
        </View>
        <Text style={styles.name}>HillSafe User</Text>
        <Text style={styles.sub}>Google Sign-In coming Week 4</Text>
        <View style={styles.row}>
          {[{l:'Reports',v:'0'},{l:'Points',v:'0'},{l:'Badge',v:'??'}].map(s => (
            <View key={s.l} style={styles.stat}>
              <Text style={styles.val}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: SPACING.lg, alignItems: 'center' },
  avatar:    {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.accent + '33', borderWidth: 2,
    borderColor: COLORS.accent, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.md,
  },
  avatarText: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  name:       { color: COLORS.text, fontSize: FONTS.title, fontWeight: '700' },
  sub:        { color: COLORS.muted, fontSize: FONTS.body, marginTop: 4, marginBottom: SPACING.lg },
  row:        { flexDirection: 'row', gap: SPACING.sm },
  stat:       {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, alignItems: 'center', minWidth: 80,
  },
  val:        { color: COLORS.text, fontSize: FONTS.heading, fontWeight: '800' },
  statLabel:  { color: COLORS.muted, fontSize: FONTS.small },
});

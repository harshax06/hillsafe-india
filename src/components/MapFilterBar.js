// ─── MapFilterBar ────────────────────────────────────────────────────────────
// Horizontal scroll filter bar to show/hide pin types on map.

import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { PIN_TYPES } from '../services/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const FILTERS = [
  { id: 'all',       label: 'All Pins',   color: COLORS.accent },
  { id: 'landslide', label: 'Landslide',  color: PIN_TYPES.landslide.color },
  { id: 'flood',     label: 'Flood',      color: PIN_TYPES.flood.color },
  { id: 'road',      label: 'Road Block', color: PIN_TYPES.road.color },
  { id: 'shelter',   label: 'Shelter',    color: PIN_TYPES.shelter.color },
  { id: 'crack',     label: 'Crack',      color: PIN_TYPES.crack.color },
  { id: 'verified',  label: 'Verified',   color: COLORS.safe },
];

export default function MapFilterBar({ activeFilter, onFilterChange, pinCounts }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {FILTERS.map(f => {
        const isActive = activeFilter === f.id;
        const count    = f.id === 'all'
          ? Object.values(pinCounts || {}).reduce((a, b) => a + b, 0)
          : (pinCounts?.[f.id] || 0);

        return (
          <TouchableOpacity
            key={f.id}
            onPress={() => onFilterChange(f.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? f.color + '33' : COLORS.surface,
                borderColor:     isActive ? f.color : COLORS.border,
              }
            ]}
          >
            <View style={[styles.dot, { backgroundColor: isActive ? f.color : COLORS.muted }]} />
            <Text style={[styles.label, { color: isActive ? f.color : COLORS.muted }]}>
              {f.label}
            </Text>
            {count > 0 && (
              <View style={[styles.countBadge, { backgroundColor: isActive ? f.color : COLORS.border }]}>
                <Text style={[styles.countText, { color: isActive ? COLORS.black : COLORS.muted }]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flexGrow: 0 },
  content:  { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8, flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  label:      { fontSize: FONTS.small, fontWeight: '600' },
  countBadge: { borderRadius: RADIUS.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText:  { fontSize: 10, fontWeight: '700' },
});

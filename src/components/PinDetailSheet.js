// ─── PinDetailSheet ──────────────────────────────────────────────────────────
// Bottom sheet that slides up when user taps a map pin.
// Shows: type, description, votes, verified status, confirm button.

import { useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  Animated, ScrollView,
} from 'react-native';
import { PIN_TYPES } from '../services/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

function timeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function PinDetailSheet({ pin, onClose, onVote, onNavigate }) {
  if (!pin) return null;

  const pinType = PIN_TYPES[pin.type] || PIN_TYPES.landslide;
  const isVerified = pin.status === 'verified';
  const needsMore  = Math.max(0, 3 - (pin.votes || 0));

  return (
    <Modal
      visible={!!pin}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Type header */}
          <View style={[styles.typeHeader, { backgroundColor: pinType.color + '22', borderColor: pinType.color }]}>
            <View style={[styles.typeIcon, { backgroundColor: pinType.color }]}>
              <Text style={styles.typeIconText}>{pinType.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeName, { color: pinType.color }]}>{pinType.label}</Text>
              <Text style={styles.typeTime}>{timeAgo(pin.created_at)}</Text>
            </View>
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>PENDING</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.desc}>{pin.description || 'No description provided.'}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{pin.altitude || 0}m</Text>
              <Text style={styles.statLabel}>Altitude</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: pinType.color }]}>{pin.votes || 0}</Text>
              <Text style={styles.statLabel}>Confirmations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{isVerified ? '3+' : needsMore}</Text>
              <Text style={styles.statLabel}>{isVerified ? 'Verified' : 'More needed'}</Text>
            </View>
          </View>

          {/* Verification progress */}
          {!isVerified && (
            <View style={styles.progressBox}>
              <Text style={styles.progressLabel}>
                Needs {needsMore} more confirmation{needsMore !== 1 ? 's' : ''} to verify
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(((pin.votes || 0) / 3) * 100, 100)}%`,
                  backgroundColor: pinType.color,
                }]} />
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: pinType.color + '22', borderColor: pinType.color }]}
              onPress={() => { onVote(pin.id); onClose(); }}
            >
              <Text style={[styles.confirmBtnText, { color: pinType.color }]}>
                Confirm Report (+1)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => { onNavigate(pin); onClose(); }}>
              <Text style={styles.navBtnText}>Navigate Here</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    paddingBottom: 36,
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
  typeHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  typeIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  typeIconText: { color: COLORS.white, fontWeight: '900', fontSize: 16 },
  typeName: { fontSize: FONTS.title, fontWeight: '700' },
  typeTime: { color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },
  verifiedBadge: { backgroundColor: COLORS.safe + '22', borderWidth: 1, borderColor: COLORS.safe, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  verifiedText:  { color: COLORS.safe, fontSize: 10, fontWeight: '700' },
  pendingBadge:  { backgroundColor: COLORS.caution + '22', borderWidth: 1, borderColor: COLORS.caution, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  pendingText:   { color: COLORS.caution, fontSize: 10, fontWeight: '700' },
  desc: { color: COLORS.text, fontSize: FONTS.body, lineHeight: 22, marginBottom: SPACING.lg },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  stat: { flex: 1, alignItems: 'center', padding: SPACING.md },
  statVal: { color: COLORS.text, fontSize: FONTS.title, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  progressBox: { marginBottom: SPACING.md },
  progressLabel: { color: COLORS.muted, fontSize: FONTS.small, marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: RADIUS.full },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  confirmBtn: { flex: 1, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  confirmBtnText: { fontWeight: '700', fontSize: FONTS.body },
  navBtn: { flex: 1, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  navBtnText: { color: COLORS.black, fontWeight: '700', fontSize: FONTS.body },
  closeBtn: { alignItems: 'center', padding: SPACING.sm },
  closeBtnText: { color: COLORS.muted, fontSize: FONTS.body },
});

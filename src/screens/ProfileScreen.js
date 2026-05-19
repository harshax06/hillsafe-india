// ─── ProfileScreen v4 ────────────────────────────────────────────────────────
// Week 4: Full profile with points, badges, report history, stats

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const BADGES = [
  { id: 'newcomer',    label: 'Newcomer',     desc: 'Joined HillSafe',          points: 0,   color: COLORS.muted  },
  { id: 'reporter',    label: 'Reporter',      desc: 'Submitted first report',   points: 10,  color: COLORS.accent },
  { id: 'safemapper',  label: 'SafeMapper',    desc: 'Earned 50 points',         points: 50,  color: COLORS.caution},
  { id: 'guardian',    label: 'Hill Guardian', desc: 'Earned 100 points',        points: 100, color: COLORS.safe   },
  { id: 'hero',        label: 'Community Hero',desc: 'Earned 200 points',        points: 200, color: '#ff8c42'     },
];

const HAZARD_LABELS = {
  landslide: 'Landslide',
  flood:     'Flash Flood',
  road:      'Road Blocked',
  shelter:   'Safe Shelter',
  crack:     'Ground Crack',
  rockfall:  'Rockfall',
};

const HAZARD_COLORS = {
  landslide: COLORS.danger,
  flood:     COLORS.caution,
  road:      COLORS.orange,
  shelter:   COLORS.safe,
  crack:     '#ff6b6b',
  rockfall:  COLORS.danger,
};

function timeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function ProfileScreen() {
  const [points,    setPoints]    = useState(0);
  const [reports,   setReports]   = useState([]);
  const [userName,  setUserName]  = useState('HillSafe User');
  const [editName,  setEditName]  = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await AsyncStorage.getItem('hs_points');
    const r = await AsyncStorage.getItem('hs_reports');
    const n = await AsyncStorage.getItem('hs_username');
    if (p) setPoints(parseInt(p));
    if (r) setReports(JSON.parse(r));
    if (n) setUserName(n);
  };

  // Current badge
  const currentBadge = [...BADGES].reverse().find(b => points >= b.points) || BADGES[0];
  const nextBadge    = BADGES.find(b => b.points > points);
  const badgePct     = nextBadge
    ? Math.round(((points - currentBadge.points) / (nextBadge.points - currentBadge.points)) * 100)
    : 100;

  const clearData = () => {
    Alert.alert('Reset Data', 'This will clear all your points and reports. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['hs_points', 'hs_reports']);
            setPoints(0); setReports([]);
          }
        }
      ]
    );
  };

  // Report type counts
  const typeCounts = reports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { borderColor: currentBadge.color }]}>
            <Text style={[styles.avatarText, { color: currentBadge.color }]}>
              {userName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userSub}>Community Safety Reporter</Text>

          {/* Current badge */}
          <View style={[styles.currentBadge, { backgroundColor: currentBadge.color + '22', borderColor: currentBadge.color }]}>
            <Text style={[styles.currentBadgeText, { color: currentBadge.color }]}>
              {currentBadge.label}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Reports',  value: reports.length, color: COLORS.accent  },
            { label: 'Points',   value: points,         color: COLORS.caution },
            { label: 'Verified', value: reports.filter(r => r.status === 'verified').length, color: COLORS.safe },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Badge progress */}
        <View style={styles.badgeCard}>
          <View style={styles.badgeHeader}>
            <Text style={styles.sectionTitle}>Badge Progress</Text>
            <Text style={[styles.badgeName, { color: currentBadge.color }]}>{currentBadge.label}</Text>
          </View>
          <View style={styles.badgeTrack}>
            <View style={[styles.badgeFill, { width: `${badgePct}%`, backgroundColor: currentBadge.color }]} />
          </View>
          <Text style={styles.badgeHint}>
            {nextBadge
              ? `${nextBadge.points - points} more points to earn "${nextBadge.label}"`
              : 'Maximum badge achieved! You are a Community Hero!'}
          </Text>

          {/* All badges */}
          <View style={styles.allBadges}>
            {BADGES.map(b => {
              const earned = points >= b.points;
              return (
                <View key={b.id} style={[styles.badgeItem, earned && { borderColor: b.color }]}>
                  <View style={[styles.badgeCircle, { backgroundColor: earned ? b.color + '33' : COLORS.surface, borderColor: earned ? b.color : COLORS.border }]}>
                    <Text style={[styles.badgeCircleText, { color: earned ? b.color : COLORS.border }]}>
                      {b.points}
                    </Text>
                  </View>
                  <Text style={[styles.badgeItemLabel, { color: earned ? b.color : COLORS.border }]}>
                    {b.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Report type breakdown */}
        {reports.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Reports by Type</Text>
            {Object.entries(typeCounts).map(([type, count]) => (
              <View key={type} style={styles.typeRow}>
                <View style={[styles.typeDot, { backgroundColor: HAZARD_COLORS[type] || COLORS.accent }]} />
                <Text style={styles.typeRowLabel}>{HAZARD_LABELS[type] || type}</Text>
                <View style={styles.typeBarTrack}>
                  <View style={[styles.typeBarFill, {
                    width: `${(count / reports.length) * 100}%`,
                    backgroundColor: HAZARD_COLORS[type] || COLORS.accent,
                  }]} />
                </View>
                <Text style={styles.typeRowCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent reports */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>My Recent Reports</Text>
          {reports.length === 0 ? (
            <View style={styles.emptyReports}>
              <Text style={styles.emptyReportsText}>
                No reports yet. Go to Report Hazard tab to submit your first report and earn points!
              </Text>
            </View>
          ) : (
            reports.slice(0, 5).map((r, i) => (
              <View key={i} style={[styles.reportItem, { borderLeftColor: HAZARD_COLORS[r.type] || COLORS.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.reportItemHeader}>
                    <Text style={[styles.reportType, { color: HAZARD_COLORS[r.type] || COLORS.accent }]}>
                      {HAZARD_LABELS[r.type] || r.type}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: r.status === 'verified' ? COLORS.safe + '22' : COLORS.caution + '22',
                        borderColor:      r.status === 'verified' ? COLORS.safe : COLORS.caution }
                    ]}>
                      <Text style={[styles.statusText, { color: r.status === 'verified' ? COLORS.safe : COLORS.caution }]}>
                        {r.status === 'pending_sync' ? 'Pending' : r.status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reportDesc} numberOfLines={1}>{r.description}</Text>
                  <Text style={styles.reportMeta}>
                    {r.altitude}m altitude · {timeAgo(r.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* How points work */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How Points Work</Text>
          {[
            { action: 'Submit a hazard report',    pts: '+10' },
            { action: 'Your report gets verified', pts: '+20' },
            { action: 'Confirm another report',    pts: '+5'  },
            { action: 'Daily check-in',            pts: '+2'  },
          ].map(p => (
            <View key={p.action} style={styles.pointsRow}>
              <Text style={styles.pointsAction}>{p.action}</Text>
              <Text style={styles.pointsPts}>{p.pts}</Text>
            </View>
          ))}
        </View>

        {/* Reset button */}
        <TouchableOpacity style={styles.resetBtn} onPress={clearData}>
          <Text style={styles.resetBtnText}>Reset My Data</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },

  profileHeader: { alignItems: 'center', marginBottom: SPACING.lg },
  avatar:        { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.card, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  avatarText:    { fontSize: 32, fontWeight: '900' },
  userName:      { color: COLORS.text, fontSize: FONTS.title, fontWeight: '700' },
  userSub:       { color: COLORS.muted, fontSize: FONTS.body, marginTop: 2, marginBottom: SPACING.sm },
  currentBadge:  { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  currentBadgeText: { fontSize: FONTS.body, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  statVal:  { fontSize: FONTS.heading, fontWeight: '800' },
  statLabel:{ color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },

  badgeCard:   { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  badgeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  badgeName:   { fontSize: FONTS.body, fontWeight: '700' },
  badgeTrack:  { height: 8, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 6 },
  badgeFill:   { height: '100%', borderRadius: RADIUS.full },
  badgeHint:   { color: COLORS.muted, fontSize: FONTS.small, marginBottom: SPACING.md },
  allBadges:   { flexDirection: 'row', justifyContent: 'space-between' },
  badgeItem:   { alignItems: 'center', gap: 4 },
  badgeCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeCircleText: { fontSize: 10, fontWeight: '700' },
  badgeItemLabel:  { fontSize: 9, fontWeight: '600', textAlign: 'center', maxWidth: 52 },

  sectionCard:  { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.label, fontWeight: '700', marginBottom: SPACING.md },

  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  typeRowLabel: { color: COLORS.text, fontSize: FONTS.small, width: 90 },
  typeBarTrack: { flex: 1, height: 6, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden' },
  typeBarFill:  { height: '100%', borderRadius: RADIUS.full },
  typeRowCount: { color: COLORS.muted, fontSize: FONTS.small, width: 20, textAlign: 'right' },

  emptyReports:    { padding: SPACING.md },
  emptyReportsText:{ color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center', lineHeight: 22 },

  reportItem:       { borderLeftWidth: 3, paddingLeft: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reportItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  reportType:       { fontSize: FONTS.body, fontWeight: '700' },
  statusBadge:      { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:       { fontSize: 9, fontWeight: '700' },
  reportDesc:       { color: COLORS.muted, fontSize: FONTS.small },
  reportMeta:       { color: COLORS.border, fontSize: 10, marginTop: 2 },

  pointsRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pointsAction: { color: COLORS.text, fontSize: FONTS.body, flex: 1 },
  pointsPts:    { color: COLORS.safe, fontSize: FONTS.body, fontWeight: '700' },

  resetBtn:     { borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  resetBtnText: { color: COLORS.danger, fontSize: FONTS.body, fontWeight: '600' },
});

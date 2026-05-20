import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle, signOut, getCurrentUser } from '../services/auth';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const BADGES = [
  { id: 'newcomer',   label: 'Newcomer',      points: 0,   color: COLORS.muted   },
  { id: 'reporter',   label: 'Reporter',       points: 10,  color: COLORS.accent  },
  { id: 'safemapper', label: 'SafeMapper',     points: 50,  color: COLORS.caution },
  { id: 'guardian',   label: 'Hill Guardian',  points: 100, color: COLORS.safe    },
  { id: 'hero',       label: 'Community Hero', points: 200, color: COLORS.orange  },
];

const HAZARD_COLORS = {
  landslide: COLORS.danger,  flood: COLORS.caution,
  road: COLORS.orange,       shelter: COLORS.safe,
  crack: '#ff6b6b',          rockfall: COLORS.danger,
};

const HAZARD_LABELS = {
  landslide: 'Landslide', flood: 'Flash Flood',
  road: 'Road Blocked',   shelter: 'Safe Shelter',
  crack: 'Ground Crack',  rockfall: 'Rockfall',
};

function timeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function ProfileScreen() {
  const [user,       setUser]       = useState(null);
  const [points,     setPoints]     = useState(0);
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [signingIn,  setSigningIn]  = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [u, p, r] = await Promise.all([
      getCurrentUser(),
      AsyncStorage.getItem('hs_points'),
      AsyncStorage.getItem('hs_reports'),
    ]);
    if (u) setUser(u);
    if (p) setPoints(parseInt(p));
    if (r) setReports(JSON.parse(r));
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    const { user: u, error } = await signInWithGoogle();
    if (u) {
      setUser(u);
      Alert.alert('Welcome!', 'Signed in as ' + (u.user_metadata?.full_name || u.email));
    } else if (error && error !== 'Sign in cancelled') {
      Alert.alert('Sign in failed', error);
    }
    setSigningIn(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await signOut();
        setUser(null);
      }},
    ]);
  };

  const currentBadge = [...BADGES].reverse().find(b => points >= b.points) || BADGES[0];
  const nextBadge    = BADGES.find(b => b.points > points);
  const badgePct     = nextBadge
    ? Math.round(((points - currentBadge.points) / (nextBadge.points - currentBadge.points)) * 100)
    : 100;

  const typeCounts = reports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          {user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: user.user_metadata.avatar_url }} style={[styles.avatar, { borderColor: currentBadge.color }]} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: currentBadge.color }]}>
              <Text style={[styles.avatarText, { color: currentBadge.color }]}>
                {(user?.user_metadata?.full_name || 'HS').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.userName}>
            {user?.user_metadata?.full_name || 'HillSafe User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || 'Not signed in'}</Text>

          <View style={[styles.badgePill, { backgroundColor: currentBadge.color + '22', borderColor: currentBadge.color }]}>
            <Text style={[styles.badgePillText, { color: currentBadge.color }]}>{currentBadge.label}</Text>
          </View>
        </View>

        {/* Google Sign In / Sign Out */}
        {!user ? (
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={signingIn}>
            {signingIn ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Reports',  value: reports.length,                                         color: COLORS.accent  },
            { label: 'Points',   value: points,                                                  color: COLORS.caution },
            { label: 'Verified', value: reports.filter(r => r.status === 'verified').length,     color: COLORS.safe    },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Badge progress */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Badge Progress</Text>
            <Text style={[styles.cardBadge, { color: currentBadge.color }]}>{currentBadge.label}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: badgePct + '%', backgroundColor: currentBadge.color }]} />
          </View>
          <Text style={styles.progressHint}>
            {nextBadge ? (nextBadge.points - points) + " more points for " + nextBadge.label : 'Max badge achieved!'}
          </Text>
          <View style={styles.badgesRow}>
            {BADGES.map(b => {
              const earned = points >= b.points;
              return (
                <View key={b.id} style={styles.badgeItem}>
                  <View style={[styles.badgeCircle, { borderColor: earned ? b.color : COLORS.border, backgroundColor: earned ? b.color + '22' : COLORS.surface }]}>
                    <Text style={[styles.badgeCircleNum, { color: earned ? b.color : COLORS.border }]}>{b.points}</Text>
                  </View>
                  <Text style={[styles.badgeItemLabel, { color: earned ? b.color : COLORS.border }]} numberOfLines={2}>{b.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Report breakdown */}
        {reports.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reports by Type</Text>
            {Object.entries(typeCounts).map(([type, count]) => (
              <View key={type} style={styles.typeRow}>
                <View style={[styles.typeDot, { backgroundColor: HAZARD_COLORS[type] || COLORS.accent }]} />
                <Text style={styles.typeLabel}>{HAZARD_LABELS[type] || type}</Text>
                <View style={styles.typeBarTrack}>
                  <View style={[styles.typeBarFill, { width: ((count / reports.length) * 100) + '%', backgroundColor: HAZARD_COLORS[type] || COLORS.accent }]} />
                </View>
                <Text style={styles.typeCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent reports */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Recent Reports</Text>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>No reports yet. Submit your first hazard report to earn points!</Text>
          ) : (
            reports.slice(0, 5).map((r, i) => (
              <View key={i} style={[styles.reportItem, { borderLeftColor: HAZARD_COLORS[r.type] || COLORS.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.reportHeader}>
                    <Text style={[styles.reportType, { color: HAZARD_COLORS[r.type] || COLORS.accent }]}>
                      {HAZARD_LABELS[r.type] || r.type}
                    </Text>
                    <Text style={[styles.reportStatus, { color: r.status === 'verified' ? COLORS.safe : COLORS.caution }]}>
                      {r.status === 'pending_sync' ? 'Pending' : r.status || 'Pending'}
                    </Text>
                  </View>
                  <Text style={styles.reportDesc} numberOfLines={1}>{r.description}</Text>
                  <Text style={styles.reportMeta}>{r.altitude}m · {timeAgo(r.createdAt)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Points guide */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to Earn Points</Text>
          {[
            { action: 'Submit a hazard report',    pts: '+10' },
            { action: 'Report gets verified',       pts: '+20' },
            { action: 'Confirm another report',     pts: '+5'  },
            { action: 'Daily check-in',             pts: '+2'  },
          ].map(p => (
            <View key={p.action} style={styles.pointsRow}>
              <Text style={styles.pointsAction}>{p.action}</Text>
              <Text style={styles.pointsPts}>{p.pts}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={async () => {
          Alert.alert('Reset', 'Clear all local data?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: async () => {
              await AsyncStorage.multiRemove(['hs_points', 'hs_reports']);
              setPoints(0); setReports([]);
            }},
          ]);
        }}>
          <Text style={styles.resetText}>Reset My Data</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  centered:{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  profileHeader: { alignItems: 'center', marginBottom: SPACING.lg },
  avatar:        { width: 88, height: 88, borderRadius: 44, borderWidth: 3, marginBottom: SPACING.md },
  avatarPlaceholder: { backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 32, fontWeight: '900' },
  userName:      { color: COLORS.text, fontSize: FONTS.title, fontWeight: '700' },
  userEmail:     { color: COLORS.muted, fontSize: FONTS.body, marginTop: 2, marginBottom: SPACING.sm },
  badgePill:     { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  badgePillText: { fontSize: FONTS.body, fontWeight: '700' },

  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#4285F4', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg },
  googleIcon:    { width: 28, height: 28, borderRadius: 4, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  googleIconText:{ color: '#4285F4', fontWeight: '900', fontSize: 16 },
  googleBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.label },
  signOutBtn:    { borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', marginBottom: SPACING.lg },
  signOutText:   { color: COLORS.danger, fontSize: FONTS.body },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  statVal:  { fontSize: FONTS.heading, fontWeight: '800' },
  statLabel:{ color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },

  card:           { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  cardTitle:      { color: COLORS.text, fontSize: FONTS.label, fontWeight: '700', marginBottom: SPACING.md },
  cardHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  cardBadge:      { fontSize: FONTS.body, fontWeight: '700' },
  progressTrack:  { height: 8, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 6 },
  progressFill:   { height: '100%', borderRadius: RADIUS.full },
  progressHint:   { color: COLORS.muted, fontSize: FONTS.small, marginBottom: SPACING.md },
  badgesRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  badgeItem:      { alignItems: 'center', gap: 4, maxWidth: 56 },
  badgeCircle:    { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeCircleNum: { fontSize: 10, fontWeight: '700' },
  badgeItemLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeDot:      { width: 8, height: 8, borderRadius: 4 },
  typeLabel:    { color: COLORS.text, fontSize: FONTS.small, width: 90 },
  typeBarTrack: { flex: 1, height: 6, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden' },
  typeBarFill:  { height: '100%', borderRadius: RADIUS.full },
  typeCount:    { color: COLORS.muted, fontSize: FONTS.small, width: 20, textAlign: 'right' },

  emptyText:    { color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center', lineHeight: 22 },
  reportItem:   { borderLeftWidth: 3, paddingLeft: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  reportType:   { fontSize: FONTS.body, fontWeight: '700' },
  reportStatus: { fontSize: 11, fontWeight: '700' },
  reportDesc:   { color: COLORS.muted, fontSize: FONTS.small },
  reportMeta:   { color: COLORS.border, fontSize: 10, marginTop: 2 },

  pointsRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pointsAction: { color: COLORS.text, fontSize: FONTS.body, flex: 1 },
  pointsPts:    { color: COLORS.safe, fontSize: FONTS.body, fontWeight: '700' },

  resetBtn:  { borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  resetText: { color: COLORS.danger, fontSize: FONTS.body, fontWeight: '600' },
});


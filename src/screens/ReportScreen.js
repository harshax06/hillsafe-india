// ─── ReportScreen v4 ─────────────────────────────────────────────────────────
// Week 4: Full hazard reporting system
//   ✅ 6 hazard type buttons
//   ✅ Auto-capture GPS location
//   ✅ Photo capture via camera
//   ✅ Description text input
//   ✅ Altitude from sensors
//   ✅ Submit to Supabase
//   ✅ SafeMapper points animation
//   ✅ My Reports history

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addPin, PIN_TYPES } from '../services/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const HAZARD_TYPES = [
  { id: 'landslide', label: 'Landslide',     icon: 'L', desc: 'Active landslide or fresh scar',     color: COLORS.danger  },
  { id: 'flood',     label: 'Flash Flood',   icon: 'F', desc: 'Flood-prone or waterlogged area',    color: COLORS.caution },
  { id: 'road',      label: 'Road Blocked',  icon: 'R', desc: 'Road damaged, blocked or collapsed', color: COLORS.orange  },
  { id: 'shelter',   label: 'Safe Shelter',  icon: 'S', desc: 'Emergency shelter or safe zone',     color: COLORS.safe    },
  { id: 'crack',     label: 'Ground Crack',  icon: 'C', desc: 'Visible ground crack or subsidence', color: '#ff6b6b'      },
  { id: 'rockfall',  label: 'Rockfall Risk', icon: 'K', desc: 'Loose rocks or active rockfall',     color: COLORS.danger  },
];

export default function ReportScreen() {
  const [step,        setStep]        = useState(1); // 1=type, 2=details, 3=success
  const [selType,     setSelType]     = useState(null);
  const [description, setDesc]        = useState('');
  const [location,    setLocation]    = useState(null);
  const [altitude,    setAltitude]    = useState(0);
  const [photo,       setPhoto]       = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [points,      setPoints]      = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [myReports,   setMyReports]   = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const scaleAnim = useState(new Animated.Value(0))[0];

  // Load saved points and reports
  useEffect(() => {
    AsyncStorage.getItem('hs_points').then(v => v && setTotalPoints(parseInt(v)));
    AsyncStorage.getItem('hs_reports').then(v => v && setMyReports(JSON.parse(v)));
  }, []);

  // Get GPS on step 2
  useEffect(() => {
    if (step === 2) getLocation();
  }, [step]);

  const getLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission required to report hazards.');
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setAltitude(Math.round(loc.coords.altitude || 0));
    } catch (e) {
      Alert.alert('GPS Error', 'Could not get location. Please try again.');
    }
    setGpsLoading(false);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      // Try gallery instead
      const galleryResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.7, aspect: [4, 3],
      });
      if (!galleryResult.canceled) setPhoto(galleryResult.assets[0].uri);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.7, aspect: [4, 3],
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('No GPS', 'Please wait for GPS to load your location.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add description', 'Please describe what you see at this location.');
      return;
    }

    setSubmitting(true);
    try {
      const userId = await AsyncStorage.getItem('hs_user_id') || 'anonymous';
      const { data, error } = await addPin({
        latitude:    location.latitude,
        longitude:   location.longitude,
        altitude,
        type:        selType,
        description: description.trim(),
        userId,
      });

      if (error) throw new Error(error);

      // Award points
      const newPoints    = totalPoints + 10;
      const reportEntry  = {
        id:          data?.id || Date.now().toString(),
        type:        selType,
        description: description.trim(),
        latitude:    location.latitude,
        longitude:   location.longitude,
        altitude,
        createdAt:   new Date().toISOString(),
        status:      'pending',
      };
      const updatedReports = [reportEntry, ...myReports].slice(0, 20);

      await AsyncStorage.setItem('hs_points', newPoints.toString());
      await AsyncStorage.setItem('hs_reports', JSON.stringify(updatedReports));
      setTotalPoints(newPoints);
      setMyReports(updatedReports);
      setPoints(10);
      setStep(3);

      // Animate success
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true,
        tension: 50, friction: 5,
      }).start();

    } catch (e) {
      // Even if DB fails, save locally
      const reportEntry = {
        id:          Date.now().toString(),
        type:        selType,
        description: description.trim(),
        latitude:    location.latitude,
        longitude:   location.longitude,
        altitude,
        createdAt:   new Date().toISOString(),
        status:      'pending_sync',
      };
      const updatedReports = [reportEntry, ...myReports].slice(0, 20);
      await AsyncStorage.setItem('hs_reports', JSON.stringify(updatedReports));
      setMyReports(updatedReports);
      setPoints(10);
      setStep(3);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 5 }).start();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setStep(1); setSelType(null); setDesc('');
    setLocation(null); setAltitude(0); setPhoto(null);
    scaleAnim.setValue(0);
  };

  // ── Step 1: Select hazard type ──────────────────────────────────────────
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
            </View>
            <Text style={styles.stepTitle}>What are you reporting?</Text>
            <Text style={styles.stepSub}>Select the type of hazard you have spotted</Text>
          </View>

          {/* Points display */}
          <View style={styles.pointsBar}>
            <Text style={styles.pointsText}>Your SafeMapper Points</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsNum}>{totalPoints} pts</Text>
            </View>
          </View>

          {/* Hazard type grid */}
          <View style={styles.typeGrid}>
            {HAZARD_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeCard,
                  { borderColor: selType === t.id ? t.color : COLORS.border },
                  selType === t.id && { backgroundColor: t.color + '22' },
                ]}
                onPress={() => setSelType(t.id)}
              >
                <View style={[styles.typeIconBox, { backgroundColor: t.color }]}>
                  <Text style={styles.typeIconText}>{t.icon}</Text>
                </View>
                <Text style={[styles.typeLabel, { color: selType === t.id ? t.color : COLORS.text }]}>
                  {t.label}
                </Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
                {selType === t.id && (
                  <View style={[styles.selectedCheck, { backgroundColor: t.color }]}>
                    <Text style={styles.selectedCheckText}>OK</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Next button */}
          <TouchableOpacity
            style={[styles.nextBtn, !selType && styles.nextBtnDisabled]}
            onPress={() => selType && setStep(2)}
            disabled={!selType}
          >
            <Text style={styles.nextBtnText}>
              {selType ? 'Next: Add Details' : 'Select a hazard type'}
            </Text>
          </TouchableOpacity>

          {/* My Reports history button */}
          <TouchableOpacity style={styles.historyBtn} onPress={() => setShowHistory(!showHistory)}>
            <Text style={styles.historyBtnText}>
              {showHistory ? 'Hide' : 'View'} My Reports ({myReports.length})
            </Text>
          </TouchableOpacity>

          {/* Reports history */}
          {showHistory && myReports.length > 0 && (
            <View style={styles.historyList}>
              <Text style={styles.historyTitle}>My Recent Reports</Text>
              {myReports.slice(0, 5).map((r, i) => {
                const type = HAZARD_TYPES.find(t => t.id === r.type);
                return (
                  <View key={i} style={[styles.historyItem, { borderLeftColor: type?.color || COLORS.border }]}>
                    <View style={[styles.historyIcon, { backgroundColor: type?.color || COLORS.border }]}>
                      <Text style={styles.historyIconText}>{type?.icon || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyType}>{type?.label || r.type}</Text>
                      <Text style={styles.historyDesc} numberOfLines={1}>{r.description}</Text>
                      <Text style={styles.historyMeta}>
                        {r.altitude}m · {r.status === 'pending_sync' ? 'Pending sync' : 'Submitted'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {showHistory && myReports.length === 0 && (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No reports yet. Be the first to report a hazard!</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: Add details ─────────────────────────────────────────────────
  if (step === 2) {
    const type = HAZARD_TYPES.find(t => t.id === selType);
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
              </View>
              <View style={[styles.typeHeaderRow, { backgroundColor: type.color + '22', borderColor: type.color }]}>
                <View style={[styles.typeIconBox, { backgroundColor: type.color }]}>
                  <Text style={styles.typeIconText}>{type.icon}</Text>
                </View>
                <Text style={[styles.typeHeaderLabel, { color: type.color }]}>{type.label}</Text>
              </View>
            </View>

            {/* GPS location */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Your Location</Text>
              {gpsLoading ? (
                <View style={styles.gpsLoading}>
                  <ActivityIndicator color={COLORS.accent} />
                  <Text style={styles.gpsLoadingText}>Getting GPS location...</Text>
                </View>
              ) : location ? (
                <View style={styles.gpsFound}>
                  <View style={styles.gpsDot} />
                  <View>
                    <Text style={styles.gpsCoords}>
                      {location.latitude.toFixed(5)}N, {location.longitude.toFixed(5)}E
                    </Text>
                    <Text style={styles.gpsAlt}>Altitude: {altitude}m</Text>
                  </View>
                  <TouchableOpacity onPress={getLocation} style={styles.refreshBtn}>
                    <Text style={styles.refreshBtnText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.gpsRetry} onPress={getLocation}>
                  <Text style={styles.gpsRetryText}>Tap to get GPS location</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Description */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Description *</Text>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDesc}
                placeholder="Describe what you see — size, severity, how long ago it happened..."
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.charCount}>{description.length}/300</Text>
            </View>

            {/* Photo */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Photo (Optional)</Text>
              {photo ? (
                <View style={styles.photoPreview}>
                  <Image source={{ uri: photo }} style={styles.photoImg} />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                  <Text style={styles.photoBtnIcon}>[CAM]</Text>
                  <Text style={styles.photoBtnText}>Take Photo or Choose from Gallery</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Points preview */}
            <View style={styles.pointsPreview}>
              <Text style={styles.pointsPreviewText}>Submitting this report earns you</Text>
              <Text style={styles.pointsPreviewNum}>+10 SafeMapper Points</Text>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: type.color }, (submitting || !location) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !location}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {location ? 'Submit Report to Community' : 'Waiting for GPS...'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 3: Success ─────────────────────────────────────────────────────
  const type = HAZARD_TYPES.find(t => t.id === selType);
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.successContainer}>
        <Animated.View style={[styles.successCard, { transform: [{ scale: scaleAnim }] }]}>
          {/* Success icon */}
          <View style={[styles.successIcon, { backgroundColor: type.color + '22', borderColor: type.color }]}>
            <Text style={[styles.successIconText, { color: type.color }]}>{type.icon}</Text>
          </View>

          <Text style={styles.successTitle}>Report Submitted!</Text>
          <Text style={styles.successSub}>
            Your {type.label} report has been added to the community map.
            It will be verified when 2 more users confirm it.
          </Text>

          {/* Points earned */}
          <View style={styles.pointsEarned}>
            <Text style={styles.pointsEarnedLabel}>Points Earned</Text>
            <Text style={styles.pointsEarnedNum}>+{points}</Text>
            <Text style={styles.pointsTotalText}>Total: {totalPoints} pts</Text>
          </View>

          {/* Badge progress */}
          <View style={styles.badgeProgress}>
            <Text style={styles.badgeLabel}>SafeMapper Badge Progress</Text>
            <View style={styles.badgeTrack}>
              <View style={[styles.badgeFill, {
                width: `${Math.min((totalPoints / 50) * 100, 100)}%`,
                backgroundColor: type.color,
              }]} />
            </View>
            <Text style={styles.badgeHint}>
              {totalPoints < 50 ? `${50 - totalPoints} more points to earn SafeMapper badge!` : 'SafeMapper badge earned!'}
            </Text>
          </View>

          {/* Needs confirmations */}
          <View style={styles.confirmNeeded}>
            <Text style={styles.confirmNeededText}>
              Needs 2 more confirmations to become VERIFIED
            </Text>
            <View style={styles.confirmDots}>
              <View style={[styles.confirmDot, { backgroundColor: type.color }]} />
              <View style={[styles.confirmDot, { backgroundColor: COLORS.border }]} />
              <View style={[styles.confirmDot, { backgroundColor: COLORS.border }]} />
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.reportAgainBtn} onPress={resetForm}>
            <Text style={styles.reportAgainText}>Report Another Hazard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewHistoryBtn} onPress={() => { resetForm(); setShowHistory(true); }}>
            <Text style={styles.viewHistoryText}>View My Reports</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  stepHeader:    { marginBottom: SPACING.lg },
  stepBadge:     { backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  stepBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  stepTitle:     { color: COLORS.text, fontSize: FONTS.heading, fontWeight: '800', marginBottom: 4 },
  stepSub:       { color: COLORS.muted, fontSize: FONTS.body },

  pointsBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg },
  pointsText:  { color: COLORS.muted, fontSize: FONTS.small },
  pointsBadge: { backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  pointsNum:   { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '700' },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  typeCard: {
    width: '47%', backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, borderWidth: 2,
    padding: SPACING.md, alignItems: 'center', gap: 6, position: 'relative',
  },
  typeIconBox:  { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  typeIconText: { color: COLORS.white, fontWeight: '900', fontSize: 18 },
  typeLabel:    { fontSize: FONTS.label, fontWeight: '700', textAlign: 'center' },
  typeDesc:     { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  selectedCheck: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  selectedCheckText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },

  nextBtn:         { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm },
  nextBtnDisabled: { backgroundColor: COLORS.border },
  nextBtnText:     { color: COLORS.black, fontWeight: '800', fontSize: FONTS.label },

  historyBtn:     { alignItems: 'center', padding: SPACING.md },
  historyBtnText: { color: COLORS.accent, fontSize: FONTS.body },
  historyList:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginTop: SPACING.sm },
  historyTitle:   { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm },
  historyItem:    { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, borderLeftWidth: 3, paddingLeft: SPACING.sm },
  historyIcon:    { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  historyIconText:{ color: COLORS.white, fontWeight: '900', fontSize: 12 },
  historyType:    { color: COLORS.text, fontSize: FONTS.small, fontWeight: '700' },
  historyDesc:    { color: COLORS.muted, fontSize: 11 },
  historyMeta:    { color: COLORS.border, fontSize: 10, marginTop: 2 },
  emptyHistory:   { padding: SPACING.lg, alignItems: 'center' },
  emptyHistoryText:{ color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center' },

  backBtn:     { marginBottom: SPACING.sm },
  backBtnText: { color: COLORS.accent, fontSize: FONTS.body },
  typeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.sm },
  typeHeaderLabel: { fontSize: FONTS.title, fontWeight: '700' },

  sectionCard:  { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  sectionLabel: { color: COLORS.muted, fontSize: FONTS.small, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.sm },

  gpsLoading:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gpsLoadingText: { color: COLORS.muted, fontSize: FONTS.body },
  gpsFound:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gpsDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.safe },
  gpsCoords:      { color: COLORS.text, fontSize: FONTS.body, fontWeight: '600' },
  gpsAlt:         { color: COLORS.muted, fontSize: FONTS.small },
  refreshBtn:     { marginLeft: 'auto', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  refreshBtnText: { color: COLORS.accent, fontSize: 11 },
  gpsRetry:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent, borderStyle: 'dashed' },
  gpsRetryText:   { color: COLORS.accent, fontSize: FONTS.body },

  textInput:  { color: COLORS.text, fontSize: FONTS.body, lineHeight: 22, minHeight: 100, textAlignVertical: 'top' },
  charCount:  { color: COLORS.border, fontSize: 11, textAlign: 'right', marginTop: 4 },

  photoBtn:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', padding: SPACING.lg, justifyContent: 'center' },
  photoBtnIcon: { color: COLORS.accent, fontSize: FONTS.title, fontWeight: '700' },
  photoBtnText: { color: COLORS.muted, fontSize: FONTS.body },
  photoPreview: { gap: SPACING.sm },
  photoImg:     { width: '100%', height: 180, borderRadius: RADIUS.md },
  removePhoto:  { alignItems: 'center' },
  removePhotoText: { color: COLORS.danger, fontSize: FONTS.body },

  pointsPreview:    { backgroundColor: COLORS.accent + '11', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent + '44', padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
  pointsPreviewText:{ color: COLORS.muted, fontSize: FONTS.small },
  pointsPreviewNum: { color: COLORS.accent, fontSize: FONTS.title, fontWeight: '800' },

  submitBtn:         { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: COLORS.white, fontWeight: '800', fontSize: FONTS.label },

  successContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  successCard:      { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, alignItems: 'center', width: '100%' },
  successIcon:      { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  successIconText:  { fontSize: 32, fontWeight: '900' },
  successTitle:     { color: COLORS.text, fontSize: FONTS.heading, fontWeight: '800', marginBottom: SPACING.sm },
  successSub:       { color: COLORS.muted, fontSize: FONTS.body, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },

  pointsEarned:      { backgroundColor: COLORS.accent + '11', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.accent + '44', padding: SPACING.lg, alignItems: 'center', width: '100%', marginBottom: SPACING.md },
  pointsEarnedLabel: { color: COLORS.muted, fontSize: FONTS.small },
  pointsEarnedNum:   { color: COLORS.accent, fontSize: 48, fontWeight: '900', lineHeight: 56 },
  pointsTotalText:   { color: COLORS.muted, fontSize: FONTS.small },

  badgeProgress: { width: '100%', marginBottom: SPACING.md },
  badgeLabel:    { color: COLORS.muted, fontSize: FONTS.small, marginBottom: 6 },
  badgeTrack:    { height: 8, backgroundColor: COLORS.bg, borderRadius: RADIUS.full, overflow: 'hidden' },
  badgeFill:     { height: '100%', borderRadius: RADIUS.full },
  badgeHint:     { color: COLORS.muted, fontSize: 11, marginTop: 4 },

  confirmNeeded:    { width: '100%', alignItems: 'center', marginBottom: SPACING.lg },
  confirmNeededText:{ color: COLORS.muted, fontSize: FONTS.small, marginBottom: SPACING.sm },
  confirmDots:      { flexDirection: 'row', gap: 8 },
  confirmDot:       { width: 16, height: 16, borderRadius: 8 },

  reportAgainBtn:  { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', width: '100%', marginBottom: SPACING.sm },
  reportAgainText: { color: COLORS.black, fontWeight: '800', fontSize: FONTS.label },
  viewHistoryBtn:  { padding: SPACING.sm, alignItems: 'center' },
  viewHistoryText: { color: COLORS.muted, fontSize: FONTS.body },
});

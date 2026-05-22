import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Linking, Animated, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { saveEmergencyContacts, getEmergencyContacts, getOfflineStatus } from '../services/offlineService';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const NDRF_NUMBER   = '011-24363260';
const SDMA_NUMBER   = '1070';
const POLICE_NUMBER = '100';

export default function SOSScreen() {
  const [contacts,     setContacts]     = useState([]);
  const [editingIdx,   setEditingIdx]   = useState(null);
  const [nameInput,    setNameInput]    = useState('');
  const [phoneInput,   setPhoneInput]   = useState('');
  const [userCoords,   setUserCoords]   = useState(null);
  const [altitude,     setAltitude]     = useState(null);
  const [sosActive,    setSosActive]    = useState(false);
  const [countdown,    setCountdown]    = useState(5);
  const [offlineInfo,  setOfflineInfo]  = useState(null);
  const [activeTab,    setActiveTab]    = useState('sos'); // sos | contacts | offline
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countRef  = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [contacts, offline, loc] = await Promise.all([
      getEmergencyContacts(),
      getOfflineStatus(),
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null),
    ]);
    setContacts(contacts);
    setOfflineInfo(offline);
    if (loc) {
      setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setAltitude(Math.round(loc.coords.altitude || 0));
    }
  };

  // Pulse animation when SOS is counting down
  useEffect(() => {
    if (sosActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
        ])
      ).start();
      Vibration.vibrate([300, 200, 300]);
      countRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(countRef.current);
            setSosActive(false);
            setCountdown(5);
            sendSOS();
            return 5;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      clearInterval(countRef.current);
      setCountdown(5);
    }
    return () => clearInterval(countRef.current);
  }, [sosActive]);

  const sendSOS = () => {
    const locText = userCoords
      ? 'Lat: ' + userCoords.lat.toFixed(5) + ', Lng: ' + userCoords.lng.toFixed(5)
      : 'Location unavailable';
    const mapsLink = userCoords
      ? 'https://maps.google.com/?q=' + userCoords.lat + ',' + userCoords.lng
      : '';
    const msg =
      'HILLSAFE SOS ALERT!\n' +
      'I need help!\n' +
      'Location: ' + locText + '\n' +
      (altitude ? 'Altitude: ' + altitude + 'm\n' : '') +
      'Time: ' + new Date().toLocaleString() + '\n' +
      (mapsLink ? 'Map: ' + mapsLink : '');

    if (contacts.length === 0) {
      // No contacts — open SMS with NDRF
      Linking.openURL('sms:' + NDRF_NUMBER + '?body=' + encodeURIComponent(msg));
    } else {
      // SMS first contact
      Linking.openURL('sms:' + contacts[0].phone + '?body=' + encodeURIComponent(msg));
    }
  };

  const cancelSOS = () => {
    setSosActive(false);
    Vibration.cancel();
    Alert.alert('SOS Cancelled', 'Your SOS has been cancelled.');
  };

  // ── Contacts Management ───────────────────────────────────────────────────
  const startEdit = (idx) => {
    if (idx === -1) {
      setNameInput(''); setPhoneInput('');
    } else {
      setNameInput(contacts[idx].name);
      setPhoneInput(contacts[idx].phone);
    }
    setEditingIdx(idx);
  };

  const saveContact = async () => {
    if (!nameInput.trim() || !phoneInput.trim()) {
      Alert.alert('Missing Info', 'Enter both name and phone number.');
      return;
    }
    const updated = [...contacts];
    if (editingIdx === -1) {
      if (contacts.length >= 3) { Alert.alert('Limit', 'Maximum 3 emergency contacts.'); return; }
      updated.push({ name: nameInput.trim(), phone: phoneInput.trim() });
    } else {
      updated[editingIdx] = { name: nameInput.trim(), phone: phoneInput.trim() };
    }
    setContacts(updated);
    await saveEmergencyContacts(updated);
    setEditingIdx(null);
  };

  const deleteContact = async (idx) => {
    Alert.alert('Delete', 'Remove ' + contacts[idx].name + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = contacts.filter((_, i) => i !== idx);
        setContacts(updated);
        await saveEmergencyContacts(updated);
      }},
    ]);
  };

  const callNumber = (num) => Linking.openURL('tel:' + num);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Sub-tab bar */}
      <View style={styles.tabBar}>
        {[
          { id: 'sos',      label: 'SOS' },
          { id: 'contacts', label: 'Contacts' },
          { id: 'offline',  label: 'Offline Mode' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── SOS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'sos' && (
          <>
            {/* Big SOS button */}
            <View style={styles.sosCenter}>
              <Animated.View style={[styles.sosPulse, sosActive && { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  style={[styles.sosBtn, sosActive && styles.sosBtnActive]}
                  onPress={() => sosActive ? cancelSOS() : setSosActive(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sosBtnText}>{sosActive ? 'CANCEL' : 'SOS'}</Text>
                  {sosActive && <Text style={styles.sosCountdown}>Sending in {countdown}s</Text>}
                </TouchableOpacity>
              </Animated.View>

              {sosActive ? (
                <Text style={styles.sosHint}>Tap to cancel · Vibrating to alert you</Text>
              ) : (
                <Text style={styles.sosHint}>Hold SOS to broadcast your location to emergency contacts</Text>
              )}
            </View>

            {/* Location card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Current Location</Text>
              {userCoords ? (
                <>
                  <Text style={styles.coordText}>
                    {userCoords.lat.toFixed(5)} N, {userCoords.lng.toFixed(5)} E
                  </Text>
                  {altitude !== null && (
                    <Text style={styles.altText}>Altitude: {altitude}m</Text>
                  )}
                  <TouchableOpacity
                    style={styles.shareLocBtn}
                    onPress={() => Linking.openURL('https://maps.google.com/?q=' + userCoords.lat + ',' + userCoords.lng)}
                  >
                    <Text style={styles.shareLocBtnText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.noGpsText}>Acquiring GPS location...</Text>
              )}
            </View>

            {/* Quick call buttons */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Call — Emergency Numbers</Text>
              {[
                { label: 'National Disaster Response Force', number: NDRF_NUMBER, color: COLORS.danger  },
                { label: 'State Disaster Management',        number: SDMA_NUMBER,  color: COLORS.caution },
                { label: 'Police',                           number: POLICE_NUMBER, color: COLORS.accent  },
              ].map(e => (
                <TouchableOpacity key={e.number} style={[styles.callRow, { borderLeftColor: e.color }]} onPress={() => callNumber(e.number)}>
                  <View>
                    <Text style={styles.callLabel}>{e.label}</Text>
                    <Text style={[styles.callNumber, { color: e.color }]}>{e.number}</Text>
                  </View>
                  <View style={[styles.callBtn, { backgroundColor: e.color }]}>
                    <Text style={styles.callBtnText}>CALL</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* SMS contacts */}
            {contacts.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>SMS Emergency Contacts</Text>
                {contacts.map((c, i) => (
                  <TouchableOpacity key={i} style={styles.contactCallRow} onPress={() => {
                    const msg = 'I need help! My location: https://maps.google.com/?q=' + (userCoords ? userCoords.lat + ',' + userCoords.lng : '0,0');
                    Linking.openURL('sms:' + c.phone + '?body=' + encodeURIComponent(msg));
                  }}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <Text style={styles.contactPhone}>{c.phone}</Text>
                    </View>
                    <View style={[styles.callBtn, { backgroundColor: COLORS.safe }]}>
                      <Text style={styles.callBtnText}>SMS</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── CONTACTS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'contacts' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Emergency Contacts</Text>
                <Text style={styles.cardCount}>{contacts.length}/3</Text>
              </View>
              <Text style={styles.cardSub}>
                These contacts receive your GPS location when you trigger SOS. Add up to 3 trusted people.
              </Text>

              {contacts.map((c, i) => (
                <View key={i} style={styles.contactCard}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactPhone}>{c.phone}</Text>
                  </View>
                  <TouchableOpacity style={styles.editIcon} onPress={() => startEdit(i)}>
                    <Text style={styles.editIconText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteIcon} onPress={() => deleteContact(i)}>
                    <Text style={styles.deleteIconText}>Del</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {editingIdx !== null && (
                <View style={styles.editForm}>
                  <Text style={styles.editFormTitle}>{editingIdx === -1 ? 'Add Contact' : 'Edit Contact'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Contact name"
                    placeholderTextColor={COLORS.muted}
                  />
                  <TextInput
                    style={styles.formInput}
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    placeholder="Phone number (e.g. +919876543210)"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="phone-pad"
                  />
                  <View style={styles.formBtns}>
                    <TouchableOpacity style={styles.formCancelBtn} onPress={() => setEditingIdx(null)}>
                      <Text style={styles.formCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formSaveBtn} onPress={saveContact}>
                      <Text style={styles.formSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {contacts.length < 3 && editingIdx === null && (
                <TouchableOpacity style={styles.addContactBtn} onPress={() => startEdit(-1)}>
                  <Text style={styles.addContactText}>+ Add Emergency Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── OFFLINE MODE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'offline' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Offline Mode Status</Text>
              {offlineInfo && (
                <>
                  <View style={styles.offlineRow}>
                    <View style={[styles.offlineDot, { backgroundColor: offlineInfo.pinsCached > 0 ? COLORS.safe : COLORS.muted }]} />
                    <Text style={styles.offlineLabel}>Community Pins</Text>
                    <Text style={[styles.offlineValue, { color: offlineInfo.pinsCached > 0 ? COLORS.safe : COLORS.muted }]}>
                      {offlineInfo.pinsCached > 0 ? offlineInfo.pinsCached + ' cached' : 'Not cached'}
                    </Text>
                  </View>
                  <View style={styles.offlineRow}>
                    <View style={[styles.offlineDot, { backgroundColor: offlineInfo.weatherCached ? COLORS.safe : COLORS.muted }]} />
                    <Text style={styles.offlineLabel}>Weather Data</Text>
                    <Text style={[styles.offlineValue, { color: offlineInfo.weatherCached ? COLORS.safe : COLORS.muted }]}>
                      {offlineInfo.weatherCached ? 'Cached' : 'Not cached'}
                    </Text>
                  </View>
                  <View style={styles.offlineRow}>
                    <View style={[styles.offlineDot, { backgroundColor: COLORS.accent }]} />
                    <Text style={styles.offlineLabel}>Last Sync</Text>
                    <Text style={[styles.offlineValue, { color: COLORS.accent }]}>{offlineInfo.lastSync}</Text>
                  </View>
                  {offlineInfo.pendingReports > 0 && (
                    <View style={styles.offlineRow}>
                      <View style={[styles.offlineDot, { backgroundColor: COLORS.caution }]} />
                      <Text style={styles.offlineLabel}>Pending Reports</Text>
                      <Text style={[styles.offlineValue, { color: COLORS.caution }]}>
                        {offlineInfo.pendingReports} waiting to sync
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>What Works Offline</Text>
              {[
                { feature: 'GPS Altitude + Slope',       works: true  },
                { feature: 'Risk Score Calculation',     works: true  },
                { feature: 'SOS to Emergency Contacts',  works: true  },
                { feature: 'View Cached Danger Pins',    works: true  },
                { feature: 'Submit Reports',             works: false, note: 'Queued, syncs when online' },
                { feature: 'Live Weather',               works: false, note: 'Shows last cached data' },
                { feature: 'Community Map Sync',         works: false, note: 'Resumes when online' },
              ].map(f => (
                <View key={f.feature} style={styles.featureRow}>
                  <View style={[styles.featureDot, { backgroundColor: f.works ? COLORS.safe : COLORS.caution }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureLabel}>{f.feature}</Text>
                    {f.note && <Text style={styles.featureNote}>{f.note}</Text>}
                  </View>
                  <Text style={[styles.featureStatus, { color: f.works ? COLORS.safe : COLORS.caution }]}>
                    {f.works ? 'WORKS' : 'LIMITED'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tips for Remote Areas</Text>
              {[
                'Open the app while on Wi-Fi to cache latest pins and weather before heading into hills',
                'Save emergency contacts before leaving mobile coverage area',
                'Enable GPS always-on in Android settings for best accuracy offline',
                'SOS works via SMS even without internet — just needs basic cellular signal',
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipNum}>{i + 1}</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: SPACING.lg },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:       { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.danger },
  tabText:       { color: COLORS.muted,  fontSize: FONTS.small, fontWeight: '600' },
  tabTextActive: { color: COLORS.danger, fontSize: FONTS.small, fontWeight: '700' },

  sosCenter: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.md },
  sosPulse:  { marginBottom: SPACING.lg },
  sosBtn: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: COLORS.danger,
    borderWidth: 6, borderColor: COLORS.danger + '66',
    alignItems: 'center', justifyContent: 'center',
    elevation: 12,
    shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16,
  },
  sosBtnActive: { backgroundColor: COLORS.surface, borderColor: COLORS.danger },
  sosBtnText:   { color: COLORS.white, fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  sosCountdown: { color: COLORS.danger, fontSize: FONTS.small, fontWeight: '700', marginTop: 4 },
  sosHint:      { color: COLORS.muted, fontSize: FONTS.small, textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  card:           { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  cardTitle:      { color: COLORS.text,  fontSize: FONTS.label, fontWeight: '700', marginBottom: SPACING.sm },
  cardSub:        { color: COLORS.muted, fontSize: FONTS.small, lineHeight: 18, marginBottom: SPACING.md },
  cardHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardCount:      { color: COLORS.muted, fontSize: FONTS.small },

  coordText:    { color: COLORS.accent,  fontSize: FONTS.label, fontWeight: '700', fontFamily: 'monospace', marginBottom: 4 },
  altText:      { color: COLORS.muted,   fontSize: FONTS.small, marginBottom: SPACING.md },
  noGpsText:    { color: COLORS.muted,   fontSize: FONTS.body },
  shareLocBtn:  { backgroundColor: COLORS.accent + '22', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent, padding: SPACING.sm, alignItems: 'center' },
  shareLocBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.small },

  callRow:    { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingLeft: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.md },
  callLabel:  { color: COLORS.muted, fontSize: FONTS.small, marginBottom: 2 },
  callNumber: { fontSize: FONTS.label, fontWeight: '700' },
  callBtn:    { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  callBtnText:{ color: COLORS.white, fontWeight: '800', fontSize: FONTS.small },

  contactCallRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACING.sm, gap: SPACING.sm },
  contactCard:    { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACING.sm, gap: SPACING.sm },
  contactAvatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent + '33', borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },
  contactName:  { color: COLORS.text,  fontSize: FONTS.body,  fontWeight: '600' },
  contactPhone: { color: COLORS.muted, fontSize: FONTS.small },
  editIcon:   { borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  editIconText:{ color: COLORS.accent, fontSize: FONTS.small, fontWeight: '600' },
  deleteIcon: { borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  deleteIconText: { color: COLORS.danger, fontSize: FONTS.small, fontWeight: '600' },

  editForm:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent + '44', padding: SPACING.lg, marginTop: SPACING.sm },
  editFormTitle: { color: COLORS.accent, fontSize: FONTS.label, fontWeight: '700', marginBottom: SPACING.md },
  formInput:     { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, color: COLORS.text, fontSize: FONTS.body, marginBottom: SPACING.sm },
  formBtns:      { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  formCancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center' },
  formCancelText:{ color: COLORS.muted, fontWeight: '600' },
  formSaveBtn:   { flex: 1, backgroundColor: COLORS.accent, borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center' },
  formSaveText:  { color: COLORS.black, fontWeight: '800' },

  addContactBtn:  { borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, borderStyle: 'dashed', padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  addContactText: { color: COLORS.accent, fontWeight: '700', fontSize: FONTS.body },

  offlineRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  offlineDot:   { width: 8, height: 8, borderRadius: 4 },
  offlineLabel: { color: COLORS.text,  fontSize: FONTS.body,  flex: 1 },
  offlineValue: { fontSize: FONTS.small, fontWeight: '700' },

  featureRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  featureDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  featureLabel: { color: COLORS.text,  fontSize: FONTS.body  },
  featureNote:  { color: COLORS.muted, fontSize: FONTS.small, marginTop: 2 },
  featureStatus:{ fontSize: 11, fontWeight: '700', minWidth: 55, textAlign: 'right' },

  tipRow:  { flexDirection: 'row', gap: SPACING.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'flex-start' },
  tipNum:  { color: COLORS.accent, fontWeight: '800', fontSize: FONTS.small, width: 20 },
  tipText: { color: COLORS.muted,  fontSize: FONTS.small, lineHeight: 18, flex: 1 },
});

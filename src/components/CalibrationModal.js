import { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function CalibrationModal({
  visible, onClose, currentAltitude, calibOffset,
  onCalibrate, onReset,
}) {
  const [input, setInput] = useState('');
  const [done, setDone]   = useState(false);

  const handleCalibrate = () => {
    const val = parseFloat(input);
    if (isNaN(val)) return;
    onCalibrate(val);
    setDone(true);
    setTimeout(() => { setDone(false); setInput(''); onClose(); }, 1500);
  };

  const handleReset = () => {
    onReset();
    setInput('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Calibrate Altitude</Text>
          <Text style={styles.sub}>
            Enter the known altitude of your current location to improve accuracy.
          </Text>
          <View style={styles.currentRow}>
            <View style={styles.currentCard}>
              <Text style={styles.currentLabel}>Current Reading</Text>
              <Text style={styles.currentVal}>{currentAltitude}m</Text>
            </View>
            {calibOffset !== 0 && (
              <View style={styles.currentCard}>
                <Text style={styles.currentLabel}>Offset Applied</Text>
                <Text style={[styles.currentVal, { color: COLORS.caution }]}>
                  {calibOffset > 0 ? '+' : ''}{Math.round(calibOffset)}m
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.inputLabel}>Known altitude at this location (metres):</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            placeholder="e.g. 540"
            placeholderTextColor={COLORS.muted}
            maxLength={6}
          />
          {done ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>Calibrated! Offset applied.</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={handleCalibrate}>
              <Text style={styles.btnText}>Apply Calibration</Text>
            </TouchableOpacity>
          )}
          {calibOffset !== 0 && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={[styles.btnText, { color: COLORS.danger }]}>Reset to Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Where to find exact altitude:</Text>
            <Text style={styles.tipItem}>- Hill station signboards and entry gates</Text>
            <Text style={styles.tipItem}>- Google Maps, tap your location</Text>
            <Text style={styles.tipItem}>- Survey of India topo maps</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderTopWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, paddingBottom: SPACING.xxl },
  handle:      { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
  title:       { color: COLORS.text, fontSize: FONTS.title, fontWeight: '700', marginBottom: SPACING.sm },
  sub:         { color: COLORS.muted, fontSize: FONTS.body, lineHeight: 20, marginBottom: SPACING.lg },
  currentRow:  { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  currentCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  currentLabel:{ color: COLORS.muted, fontSize: FONTS.small, marginBottom: 4 },
  currentVal:  { color: COLORS.accent, fontSize: FONTS.heading, fontWeight: '800' },
  inputLabel:  { color: COLORS.text, fontSize: FONTS.body, marginBottom: SPACING.sm },
  input:       { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.title, fontWeight: '700', marginBottom: SPACING.md },
  btn:         { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm },
  btnText:     { color: COLORS.black, fontWeight: '800', fontSize: FONTS.label },
  resetBtn:    { backgroundColor: COLORS.danger + '22', borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm },
  cancelBtn:   { alignItems: 'center', padding: SPACING.sm },
  cancelText:  { color: COLORS.muted, fontSize: FONTS.body },
  successBox:  { backgroundColor: COLORS.safe + '22', borderWidth: 1, borderColor: COLORS.safe, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm },
  successText: { color: COLORS.safe, fontWeight: '700', fontSize: FONTS.label },
  tips:        { marginTop: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  tipsTitle:   { color: COLORS.accent, fontSize: FONTS.small, fontWeight: '700', marginBottom: SPACING.sm },
  tipItem:     { color: COLORS.muted, fontSize: FONTS.small, marginBottom: 4 },
});

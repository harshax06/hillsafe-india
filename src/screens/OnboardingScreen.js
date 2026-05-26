// ─── OnboardingScreen ─────────────────────────────────────────────────────────
// 3-slide intro shown only on first app launch
// Saved to AsyncStorage so it never shows again after first time

import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon:    'ALT',
    title:   'Real-Time Altitude Monitor',
    desc:    'HillSafe uses your phone GPS and barometer to measure altitude and slope — no hardware needed. Get live risk scores for your terrain.',
    color:   '#00d4ff',
    bg:      '#00d4ff11',
  },
  {
    icon:    'MAP',
    title:   'Community Danger Map',
    desc:    'See landslides, floods and road blocks reported by your community. Confirm reports to help verify them for others in the area.',
    color:   '#00ff88',
    bg:      '#00ff8811',
  },
  {
    icon:    'SOS',
    title:   'Emergency Ready',
    desc:    'One-tap SOS broadcasts your GPS location to emergency contacts. Real-time weather alerts warn you before conditions get dangerous.',
    color:   '#ff4455',
    bg:      '#ff445511',
  },
];

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent]   = useState(0);
  const scrollRef               = useRef(null);

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrent(next);
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('hs_onboarded', 'true');
    onDone();
  };

  const slide = SLIDES[current];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: s.bg, borderColor: s.color }]}>
              <Text style={[styles.icon, { color: s.color }]}>{s.icon}</Text>
            </View>
            <Text style={[styles.title, { color: s.color }]}>{s.title}</Text>
            <Text style={styles.desc}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === current && { backgroundColor: slide.color, width: 20 }]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        {current < SLIDES.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleDone} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={[styles.nextBtn, { backgroundColor: slide.color }]}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={handleDone} style={[styles.doneBtn, { backgroundColor: slide.color }]}>
            <Text style={styles.nextText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  slide:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconWrap:  { width: 120, height: 120, borderRadius: 60, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  icon:      { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  title:     { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 20, lineHeight: 32 },
  desc:      { color: '#6b8ab0', fontSize: 16, textAlign: 'center', lineHeight: 26 },
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 20 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e3a5f', transition: 'width .3s' },
  btnRow:    { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingBottom: 48, gap: 12 },
  skipBtn:   { flex: 1, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1e3a5f', borderRadius: 14 },
  skipText:  { color: '#6b8ab0', fontSize: 16, fontWeight: '600' },
  nextBtn:   { flex: 2, padding: 16, alignItems: 'center', borderRadius: 14 },
  doneBtn:   { flex: 1, padding: 16, alignItems: 'center', borderRadius: 14 },
  nextText:  { color: '#000', fontSize: 16, fontWeight: '800' },
});

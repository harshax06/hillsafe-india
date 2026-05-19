import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import MapView, { Marker, Circle, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchAllPins, votePin, PIN_TYPES, MOCK_PINS } from '../services/supabase';
import PinDetailSheet from '../components/PinDetailSheet';
import MapFilterBar from '../components/MapFilterBar';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const DEFAULT_REGION = {
  latitude: 18.7405, longitude: 83.4076,
  latitudeDelta: 0.08, longitudeDelta: 0.08,
};

export default function MapScreen() {
  const mapRef = useRef(null);
  const [region, setRegion]             = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState(null);
  const [pins, setPins]                 = useState(MOCK_PINS);
  const [filteredPins, setFilteredPins] = useState(MOCK_PINS);
  const [selectedPin, setSelectedPin]   = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [dbConnected, setDbConnected]   = useState(false);
  const [refreshing, setRefreshing]     = useState(false);

  const pinCounts = pins.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    if (p.status === 'verified') acc.verified = (acc.verified || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const userLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(userLoc);
        setRegion({ ...userLoc, latitudeDelta: 0.08, longitudeDelta: 0.08 });
        setTimeout(() => mapRef.current?.animateToRegion({ ...userLoc, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 1000), 500);
      }
      setLoading(false);
    })();
    loadPins();
  }, []);

  const loadPins = async () => {
    setRefreshing(true);
    const { data, error } = await fetchAllPins();
    if (!error && data.length > 0) { setPins(data); setDbConnected(true); }
    setRefreshing(false);
  };

  useEffect(() => {
    if (activeFilter === 'all') setFilteredPins(pins);
    else if (activeFilter === 'verified') setFilteredPins(pins.filter(p => p.status === 'verified'));
    else setFilteredPins(pins.filter(p => p.type === activeFilter));
  }, [activeFilter, pins]);

  const handleVote = useCallback(async (pinId) => {
    if (!dbConnected) {
      setPins(prev => prev.map(p => {
        if (p.id !== pinId) return p;
        const newVotes = (p.votes || 0) + 1;
        return { ...p, votes: newVotes, status: newVotes >= 3 ? 'verified' : 'pending' };
      }));
      Alert.alert('Thanks!', 'Confirmation recorded!');
      return;
    }
    const { data, error } = await votePin(pinId);
    if (!error && data) {
      setPins(prev => prev.map(p => p.id === pinId ? data : p));
      Alert.alert('Thanks!', data.status === 'verified' ? 'Pin is now VERIFIED!' : 'Confirmation recorded!');
    }
  }, [dbConnected]);

  const handleNavigate = useCallback((pin) => {
    Linking.openURL('https://maps.google.com/?q=' + pin.latitude + ',' + pin.longitude);
  }, []);

  const centerOnUser = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          tileSize={256}
          shouldReplaceMapContent={true}
        />
        {userLocation && (
          <Circle
            center={userLocation}
            radius={150}
            fillColor={COLORS.accent + '33'}
            strokeColor={COLORS.accent}
            strokeWidth={2}
          />
        )}
        {filteredPins.map(pin => {
          const pinType = PIN_TYPES[pin.type] || PIN_TYPES.landslide;
          const color = pin.status === 'verified' ? pinType.color : pinType.color + '99';
          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              onPress={() => setSelectedPin(pin)}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: color }]}>
                  <Text style={styles.markerText}>{pinType.icon}</Text>
                </View>
                <View style={[styles.markerTail, { borderTopColor: color }]} />
                {pin.status === 'verified' && <View style={styles.verifiedDot} />}
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.filterContainer}>
        <MapFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} pinCounts={pinCounts} />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statChip}>
          <Text style={styles.statNum}>{filteredPins.length}</Text>
          <Text style={styles.statLbl}> Pins</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={[styles.statNum, { color: COLORS.safe }]}>
            {filteredPins.filter(p => p.status === 'verified').length}
          </Text>
          <Text style={styles.statLbl}> Verified</Text>
        </View>
        <View style={[styles.dbBadge, { borderColor: dbConnected ? COLORS.safe : COLORS.caution }]}>
          <View style={[styles.dbDot, { backgroundColor: dbConnected ? COLORS.safe : COLORS.caution }]} />
          <Text style={[styles.dbText, { color: dbConnected ? COLORS.safe : COLORS.caution }]}>
            {dbConnected ? 'Live DB' : 'Mock Data'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={centerOnUser}>
          <Text style={styles.controlBtnText}>Me</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={loadPins} disabled={refreshing}>
          <Text style={styles.controlBtnText}>{refreshing ? '...' : 'Sync'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        {Object.entries(PIN_TYPES).slice(0, 4).map(([key, val]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: val.color }]} />
            <Text style={styles.legendText}>{val.label}</Text>
          </View>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <PinDetailSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onVote={handleVote}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  map:             { flex: 1 },
  filterContainer: { position: 'absolute', bottom: 100, left: 0, right: 0, backgroundColor: COLORS.bg + 'ee', borderTopWidth: 1, borderColor: COLORS.border },
  statsBar:        { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  statChip:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface + 'ee', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  statNum:         { color: COLORS.text, fontSize: FONTS.small, fontWeight: '700' },
  statLbl:         { color: COLORS.muted, fontSize: 11 },
  dbBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface + 'ee', borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  dbDot:           { width: 6, height: 6, borderRadius: 3 },
  dbText:          { fontSize: 11, fontWeight: '600' },
  controls:        { position: 'absolute', right: 12, top: 60, gap: 8 },
  controlBtn:      { width: 44, height: 44, backgroundColor: COLORS.surface + 'ee', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  controlBtnText:  { color: COLORS.text, fontSize: FONTS.small, fontWeight: '700' },
  legend:          { position: 'absolute', bottom: 160, right: 12, backgroundColor: COLORS.surface + 'ee', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm, gap: 4 },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:       { width: 8, height: 8, borderRadius: 4 },
  legendText:      { color: COLORS.text, fontSize: 10 },
  markerWrap:      { alignItems: 'center' },
  markerBubble:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white, elevation: 5 },
  markerText:      { color: COLORS.white, fontWeight: '900', fontSize: 14 },
  markerTail:      { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  verifiedDot:     { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.safe, borderWidth: 2, borderColor: COLORS.white },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bg + 'cc', alignItems: 'center', justifyContent: 'center' },
  loadingText:     { color: COLORS.text, marginTop: SPACING.md, fontSize: FONTS.body },
});

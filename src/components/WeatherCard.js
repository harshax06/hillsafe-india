// ─── WeatherCard ─────────────────────────────────────────────────────────────
// Shows current weather + rain forecast bars + risk contribution

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getWeatherIcon, getRainSeverity } from '../services/weather';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

function timeLabel(fetchedAt) {
  if (!fetchedAt) return '';
  const diff = Math.floor((Date.now() - fetchedAt) / 60000);
  if (diff < 1)  return 'Just now';
  if (diff < 60) return diff + ' min ago';
  return Math.floor(diff / 60) + 'h ago';
}

export default function WeatherCard({ weather, onRefresh, loading, isMock }) {
  if (!weather) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Weather Forecast</Text>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>Loading weather data...</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>Fetch Weather</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const rainSev = getRainSeverity(weather.maxRainNext24h);
  const maxBar  = Math.max(...(weather.next24h || []).map(f => f.rain), 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weather</Text>
        <View style={styles.headerRight}>
          {isMock && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>DEMO</Text>
            </View>
          )}
          <Text style={styles.fetchTime}>{timeLabel(weather.fetchedAt)}</Text>
          <TouchableOpacity onPress={onRefresh} disabled={loading} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>{loading ? '...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location + main weather */}
      <View style={styles.mainRow}>
        <View>
          <Text style={styles.location}>{weather.location}</Text>
          <Text style={styles.description}>{weather.description}</Text>
        </View>
        <View style={styles.tempBlock}>
          <View style={[styles.weatherIconBadge, { backgroundColor: rainSev.color + '22', borderColor: rainSev.color }]}>
            <Text style={[styles.weatherIconText, { color: rainSev.color }]}>
              {getWeatherIcon(weather.main)}
            </Text>
          </View>
          <Text style={styles.temp}>{weather.temp}C</Text>
        </View>
      </View>

      {/* Quick stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Humidity',   value: weather.humidity + '%'           },
          { label: 'Wind',       value: weather.windSpeed + ' km/h'      },
          { label: 'Visibility', value: weather.visibility + ' km'       },
          { label: 'Pressure',   value: weather.pressure + ' hPa'        },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Rain status */}
      <View style={[styles.rainStatus, { backgroundColor: rainSev.color + '11', borderColor: rainSev.color + '44' }]}>
        <View style={[styles.rainDot, { backgroundColor: rainSev.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rainLabel, { color: rainSev.color }]}>{rainSev.label}</Text>
          <Text style={styles.rainDesc}>
            Max {Math.round(weather.maxRainNext24h)}mm expected · Total {weather.totalRainNext24h}mm in 24h
          </Text>
        </View>
      </View>

      {/* 24h Forecast bars */}
      <Text style={styles.forecastTitle}>24-Hour Rain Forecast (mm)</Text>
      <View style={styles.forecastBars}>
        {(weather.next24h || []).slice(0, 8).map((f, i) => {
          const barH  = Math.max((f.rain / maxBar) * 70, 4);
          const sev   = getRainSeverity(f.rain);
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barMm}>{f.rain > 0 ? Math.round(f.rain) : ''}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: barH, backgroundColor: sev.color }]} />
              </View>
              <Text style={styles.barTime}>{f.time}</Text>
              <Text style={styles.barTemp}>{f.temp}C</Text>
            </View>
          );
        })}
      </View>

      {/* Sunrise/Sunset */}
      <View style={styles.sunRow}>
        <Text style={styles.sunItem}>Sunrise  {weather.sunrise}</Text>
        <Text style={styles.sunItem}>Sunset  {weather.sunset}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#162033',
    borderRadius: 16, borderWidth: 1,
    borderColor: '#1e3a5f', padding: 16,
  },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:        { color: '#6b8ab0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mockBadge:    { backgroundColor: '#ffd70022', borderWidth: 1, borderColor: '#ffd700', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  mockBadgeText:{ color: '#ffd700', fontSize: 9, fontWeight: '700' },
  fetchTime:    { color: '#6b8ab0', fontSize: 10 },
  refreshBtn:   { backgroundColor: '#162033', borderWidth: 1, borderColor: '#1e3a5f', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  refreshBtnText:{ color: '#00d4ff', fontSize: 11 },

  mainRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  location:     { color: '#e2eaf4', fontSize: 18, fontWeight: '700' },
  description:  { color: '#6b8ab0', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  tempBlock:    { alignItems: 'center', gap: 4 },
  weatherIconBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  weatherIconText:  { fontSize: 11, fontWeight: '900' },
  temp:         { color: '#e2eaf4', fontSize: 28, fontWeight: '800' },

  statsRow:   { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#1e3a5f', marginBottom: 12 },
  statItem:   { flex: 1, alignItems: 'center', padding: 8 },
  statVal:    { color: '#e2eaf4', fontSize: 13, fontWeight: '700' },
  statLabel:  { color: '#6b8ab0', fontSize: 10, marginTop: 2 },

  rainStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  rainDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rainLabel:  { fontSize: 14, fontWeight: '700' },
  rainDesc:   { color: '#6b8ab0', fontSize: 11, marginTop: 2 },

  forecastTitle: { color: '#6b8ab0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  forecastBars:  { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110, marginBottom: 10 },
  barCol:        { alignItems: 'center', gap: 2, flex: 1 },
  barMm:         { color: '#6b8ab0', fontSize: 9 },
  barTrack:      { width: '80%', height: 70, backgroundColor: '#0a0f1a', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: '#1e3a5f' },
  barFill:       { width: '100%', borderRadius: 4 },
  barTime:       { color: '#6b8ab0', fontSize: 9 },
  barTemp:       { color: '#00d4ff', fontSize: 9 },

  sunRow:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1e3a5f', paddingTop: 8, marginTop: 4 },
  sunItem:  { color: '#6b8ab0', fontSize: 11 },

  noData:       { alignItems: 'center', padding: 16 },
  noDataText:   { color: '#6b8ab0', fontSize: 14, marginBottom: 12 },
});

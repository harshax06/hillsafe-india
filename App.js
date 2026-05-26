// ─── App.js with Onboarding ───────────────────────────────────────────────────
// Shows onboarding slides on first launch only
// Replace your existing App.js with this

import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen    from './src/screens/HomeScreen';
import MapScreen     from './src/screens/MapScreen';
import AlertScreen   from './src/screens/AlertScreen';
import ReportScreen  from './src/screens/ReportScreen';
import RouteScreen   from './src/screens/RouteScreen';
import SOSScreen     from './src/screens/SOSScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: '#0a0f1a', surface: '#111827', border: '#1e3a5f',
  accent: '#00d4ff', muted: '#6b8ab0', text: '#e2eaf4',
};

function TabIcon({ label, color, focused }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: color + '22' }]}>
      <Text style={[styles.iconText, { color }]}>{label}</Text>
    </View>
  );
}

const SCREENS = [
  { name: 'HillSafe',  component: HomeScreen,    icon: 'ALT', label: 'HillSafe',  title: 'HillSafe — Altitude Monitor' },
  { name: 'Community', component: MapScreen,     icon: 'MAP', label: 'Community', title: 'Community Map'               },
  { name: 'Alerts',    component: AlertScreen,   icon: 'WRN', label: 'Alerts',    title: 'Smart Alerts'                },
  { name: 'Report',    component: ReportScreen,  icon: 'RPT', label: 'Report',    title: 'Report a Hazard'             },
  { name: 'Route',     component: RouteScreen,   icon: 'RTE', label: 'Route',     title: 'Safe Route Finder'           },
  { name: 'SOS',       component: SOSScreen,     icon: 'SOS', label: 'SOS',       title: 'Emergency SOS'               },
  { name: 'Profile',   component: ProfileScreen, icon: 'ME',  label: 'Profile',   title: 'My Profile'                  },
];

export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [onboarded,  setOnboarded]  = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hs_onboarded').then(val => {
      setOnboarded(val === 'true');
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.accent, fontSize: 28, fontWeight: '900' }}>HillSafe</Text>
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const screen = SCREENS.find(s => s.name === route.name);
          return {
            headerStyle: { backgroundColor: COLORS.bg, borderBottomColor: COLORS.border, borderBottomWidth: 1, elevation: 0, shadowOpacity: 0 },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: '700', fontSize: 15 },
            headerTitle: screen?.title || route.name,
            tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1, paddingBottom: 6, paddingTop: 6, height: 60, elevation: 0 },
            tabBarActiveTintColor:   COLORS.accent,
            tabBarInactiveTintColor: COLORS.muted,
            tabBarIcon: ({ color, focused }) => <TabIcon label={screen?.icon || ''} color={color} focused={focused} />,
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
          };
        }}
      >
        {SCREENS.map(screen => (
          <Tab.Screen key={screen.name} name={screen.name} component={screen.component} options={{ tabBarLabel: screen.label }} />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 36, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});

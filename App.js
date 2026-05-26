// ─── App.js with Onboarding & Ionicons ───────────────────────────────────────
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen       from './src/screens/HomeScreen';
import MapScreen        from './src/screens/MapScreen';
import AlertScreen      from './src/screens/AlertScreen';
import ReportScreen     from './src/screens/ReportScreen';
import RouteScreen      from './src/screens/RouteScreen';
import SOSScreen        from './src/screens/SOSScreen';
import ProfileScreen    from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: '#0a0f1a', surface: '#111827', border: '#1e3a5f',
  accent: '#00d4ff', muted: '#6b8ab0', text: '#e2eaf4',
};

const SCREENS = [
  {
    name: 'HillSafe',  component: HomeScreen,    label: 'HillSafe',
    title: 'HillSafe – Altitude Monitor',
    iconFilled: 'speedometer',        iconOutline: 'speedometer-outline',
  },
  {
    name: 'Community', component: MapScreen,     label: 'Community',
    title: 'Community Map',
    iconFilled: 'map',                iconOutline: 'map-outline',
  },
  {
    name: 'Alerts',    component: AlertScreen,   label: 'Alerts',
    title: 'Smart Alerts',
    iconFilled: 'warning',            iconOutline: 'warning-outline',
  },
  {
    name: 'Report',    component: ReportScreen,  label: 'Report',
    title: 'Report a Hazard',
    iconFilled: 'camera',             iconOutline: 'camera-outline',
  },
  {
    name: 'Route',     component: RouteScreen,   label: 'Route',
    title: 'Safe Route Finder',
    iconFilled: 'navigate',           iconOutline: 'navigate-outline',
  },
  {
    name: 'SOS',       component: SOSScreen,     label: 'SOS',
    title: 'Emergency SOS',
    iconFilled: 'alert-circle',       iconOutline: 'alert-circle-outline',
  },
  {
    name: 'Profile',   component: ProfileScreen, label: 'Profile',
    title: 'My Profile',
    iconFilled: 'person',             iconOutline: 'person-outline',
  },
];

export default function App() {
  const [loading,   setLoading]   = useState(true);
  const [onboarded, setOnboarded] = useState(false);

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
            headerStyle: {
              backgroundColor: COLORS.bg,
              borderBottomColor: COLORS.border,
              borderBottomWidth: 1,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: '700', fontSize: 15 },
            headerTitle: screen?.title || route.name,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
              paddingBottom: 6,
              paddingTop: 6,
              height: 62,
              elevation: 0,
            },
            tabBarActiveTintColor:   COLORS.accent,
            tabBarInactiveTintColor: COLORS.muted,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && { backgroundColor: color + '22' }]}>
                <Ionicons
                  name={focused ? screen?.iconFilled : screen?.iconOutline}
                  size={22}
                  color={color}
                />
              </View>
            ),
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
          };
        }}
      >
        {SCREENS.map(screen => (
          <Tab.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={{ tabBarLabel: screen.label }}
          />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
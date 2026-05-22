import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

import HomeScreen   from './src/screens/HomeScreen';
import MapScreen    from './src/screens/MapScreen';
import AlertScreen  from './src/screens/AlertScreen';
import ReportScreen from './src/screens/ReportScreen';
import RouteScreen  from './src/screens/RouteScreen';
import SOSScreen    from './src/screens/SOSScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { COLORS, FONTS, SPACING } from './src/constants/theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, color }) {
  const icons = {
    Home:    'ALT',
    Map:     'MAP',
    Alerts:  'WRN',
    Report:  'RPT',
    Route:   'RTE',
    SOS:     'SOS',
    Profile: 'ME',
  };
  return (
    <View style={[styles.iconWrap, { borderColor: color + '66' }]}>
      <Text style={[styles.iconText, { color }]}>{icons[label] || label.slice(0,3).toUpperCase()}</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }) => <TabIcon label={route.name} color={color} />,
          tabBarActiveTintColor:   COLORS.accent,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor:  COLORS.border,
            borderTopWidth:  1,
            paddingBottom:   6,
            paddingTop:      4,
            height:          60,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          headerStyle:      { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
          headerTitleStyle: { color: COLORS.text, fontSize: FONTS.label, fontWeight: '700' },
          headerTintColor:  COLORS.accent,
        })}
      >
        <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'HillSafe',         headerTitle: '🏔️  HillSafe — Altitude Monitor' }} />
        <Tab.Screen name="Map"     component={MapScreen}     options={{ title: 'Community',        headerTitle: '📍  Community Danger Map' }} />
        <Tab.Screen name="Alerts"  component={AlertScreen}   options={{ title: 'Alerts',           headerTitle: '🚨  Smart Alerts' }} />
        <Tab.Screen name="Report"  component={ReportScreen}  options={{ title: 'Report',           headerTitle: '📋  Report a Hazard' }} />
        <Tab.Screen name="Route"   component={RouteScreen}   options={{ title: 'Route',            headerTitle: '🛤️  Safe Route Finder' }} />
        <Tab.Screen name="SOS"     component={SOSScreen}     options={{ title: 'SOS',              headerTitle: '🆘  Emergency SOS' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile',          headerTitle: '👤  My Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 32, height: 20, borderRadius: 4,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
});

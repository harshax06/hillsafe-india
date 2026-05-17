import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import AlertScreen from './src/screens/AlertScreen';
import ReportScreen from './src/screens/ReportScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: COLORS.bg, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            paddingBottom: 6,
            paddingTop: 6,
            height: 60,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Home:    focused ? 'home'              : 'home-outline',
              Map:     focused ? 'map'               : 'map-outline',
              Alerts:  focused ? 'notifications'     : 'notifications-outline',
              Report:  focused ? 'add-circle'        : 'add-circle-outline',
              Profile: focused ? 'person'            : 'person-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: '🏔️ HillSafe' }} />
        <Tab.Screen name="Map"     component={MapScreen}     options={{ title: 'Community Map' }} />
        <Tab.Screen name="Alerts"  component={AlertScreen}   options={{ title: 'Alerts' }} />
        <Tab.Screen name="Report"  component={ReportScreen}  options={{ title: 'Report Hazard' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

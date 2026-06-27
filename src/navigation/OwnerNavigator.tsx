import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OwnerStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import TabIcon from '../components/TabIcon';
import TabLabel from '../components/TabLabel';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import MyListingsScreen from '../screens/owner/MyListingsScreen';
import CreateEquipmentScreen from '../screens/owner/CreateEquipmentScreen';
import EditEquipmentScreen from '../screens/owner/EditEquipmentScreen';
import IncomingBookingsScreen from '../screens/owner/IncomingBookingsScreen';
import BookingDetailScreen from '../screens/shared/BookingDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator<OwnerStackParamList>();
const Stack = createNativeStackNavigator<OwnerStackParamList>();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen
        name="OwnerDashboardMain"
        component={OwnerDashboardScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function ListingsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="OwnerEquipmentList" component={MyListingsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateEquipment"
        component={CreateEquipmentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditEquipment"
        component={EditEquipmentScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen
        name="OwnerBookingsList"
        component={IncomingBookingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="OwnerProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="OwnerSettings" component={SettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function OwnerNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="OwnerDashboard"
        component={DashboardStack}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="stats-chart" focused={focused} pill />,
          tabBarLabel: ({ focused }) => <TabLabel label="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="OwnerEquipment"
        component={ListingsStack}
        options={{
          title: 'Equipment',
          tabBarIcon: ({ focused }) => <TabIcon name="construct" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Equipment" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="OwnerBookings"
        component={BookingsStack}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Bookings" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="OwnerNotifications"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Alerts" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="OwnerProfile"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

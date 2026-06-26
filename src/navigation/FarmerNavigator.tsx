import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FarmerStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import TabIcon from '../components/TabIcon';
import TabLabel from '../components/TabLabel';
import FarmerHomeScreen from '../screens/farmer/FarmerHomeScreen';
import EquipmentListScreen from '../screens/farmer/EquipmentListScreen';
import EquipmentDetailScreen from '../screens/farmer/EquipmentDetailScreen';
import MyBookingsScreen from '../screens/farmer/MyBookingsScreen';
import BookingDetailScreen from '../screens/shared/BookingDetailScreen';
import CreateBatchScreen from '../screens/farmer/CreateBatchScreen';
import MyBatchesScreen from '../screens/farmer/MyBatchesScreen';
import BatchDetailScreen from '../screens/farmer/BatchDetailScreen';
import FarmerProfileScreen from '../screens/farmer/FarmerProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator<FarmerStackParamList>();
const Stack = createNativeStackNavigator<FarmerStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerHomeMain" component={FarmerHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="FarmerNotifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}

function EquipmentStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerEquipmentList" component={EquipmentListScreen} options={{ title: 'Equipment' }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Details' }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerBookingsList" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking' }} />
    </Stack.Navigator>
  );
}

function TraceabilityStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerBatchesList" component={MyBatchesScreen} options={{ title: 'My Batches' }} />
      <Stack.Screen name="CreateBatch" component={CreateBatchScreen} options={{ title: 'New Batch' }} />
      <Stack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ title: 'Batch Details' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen
        name="FarmerProfileMain"
        component={FarmerProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function FarmerNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator screenOptions={tabBarOptions} initialRouteName="FarmerHome">
      <Tab.Screen
        name="FarmerHome"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} pill />,
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerEquipment"
        component={EquipmentStack}
        options={{
          title: 'Equipment',
          tabBarIcon: ({ focused }) => <TabIcon name="construct" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Equipment" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerBookings"
        component={BookingsStack}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Bookings" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerBatches"
        component={TraceabilityStack}
        options={{
          title: 'Harvest',
          tabBarIcon: ({ focused }) => <TabIcon name="leaf" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Harvest" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerProfile"
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

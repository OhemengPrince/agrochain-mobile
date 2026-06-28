import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FarmerStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import FloatingTabIcon from '../components/FloatingTabIcon';
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
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import MarketplaceMyListingsScreen from '../screens/marketplace/MyListingsScreen';

const Tab = createBottomTabNavigator<FarmerStackParamList>();
const Stack = createNativeStackNavigator<FarmerStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerHomeMain" component={FarmerHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FarmerNotifications" component={NotificationsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function EquipmentStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerEquipmentList" component={EquipmentListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerBookingsList" component={MyBookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="MarketplaceListingDetail"
        component={ListingDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="MyMarketplaceListings"
        component={MarketplaceMyListingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function TraceabilityStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="FarmerBatchesList" component={MyBatchesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateBatch" component={CreateBatchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ headerShown: false }} />
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
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="home" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerEquipment"
        component={EquipmentStack}
        options={{
          title: 'Equipment',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="construct" label="Equipment" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerBookings"
        component={BookingsStack}
        options={{
          title: 'Bookings',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="FarmerMarket"
        component={MarketStack}
        options={{
          title: 'Market',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="storefront" label="Market" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerBatches"
        component={TraceabilityStack}
        options={{
          title: 'Harvest',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="leaf" label="Harvest" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FarmerProfile"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="person" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

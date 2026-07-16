import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OwnerStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import CustomTabBar, { tabBarIcon, getTabBarStyleForRoute } from './CustomTabBar';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import MyListingsScreen from '../screens/owner/MyListingsScreen';
import CreateEquipmentScreen from '../screens/owner/CreateEquipmentScreen';
import EditEquipmentScreen from '../screens/owner/EditEquipmentScreen';
import IncomingBookingsScreen from '../screens/owner/IncomingBookingsScreen';
import BookingDetailScreen from '../screens/shared/BookingDetailScreen';
import OwnerProfileScreen from '../screens/owner/OwnerProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NewsScreen from '../screens/shared/NewsScreen';
import NewsArticleScreen from '../screens/shared/NewsArticleScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import MarketplaceMyListingsScreen from '../screens/marketplace/MyListingsScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ChatRoomsScreen from '../screens/shared/ChatRoomsScreen';
import MapScreen from '../screens/shared/MapScreen';
import GlobalSearchScreen from '../screens/shared/GlobalSearchScreen';
import PublicProfileScreen from '../screens/shared/PublicProfileScreen';
import FollowListScreen from '../screens/shared/FollowListScreen';
import EquipmentDetailScreen from '../screens/farmer/EquipmentDetailScreen';

const Tab = createBottomTabNavigator<OwnerStackParamList>();
const Stack = createNativeStackNavigator<OwnerStackParamList>();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="OwnerDashboardMain" component={OwnerDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatRooms" component={ChatRoomsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplaceListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ListingsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="OwnerEquipmentList" component={MyListingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateEquipment" component={CreateEquipmentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditEquipment" component={EditEquipmentScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="OwnerBookingsList" component={IncomingBookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplaceListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyMarketplaceListings" component={MarketplaceMyListingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="OwnerProfileMain" component={OwnerProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function NewsStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="NewsMain" component={NewsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewsArticle" component={NewsArticleScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function OwnerNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator screenOptions={tabBarOptions} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen
        name="OwnerDashboard"
        component={DashboardStack}
        options={({ route }) => ({
          title: 'Dashboard',
          tabBarIcon: tabBarIcon('grid'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="OwnerEquipment"
        component={ListingsStack}
        options={({ route }) => ({
          title: 'Equipment',
          tabBarIcon: tabBarIcon('construct'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="OwnerMarket"
        component={MarketStack}
        options={({ route }) => ({
          title: 'Market',
          tabBarIcon: tabBarIcon('storefront'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="OwnerBookings"
        component={BookingsStack}
        options={({ route }) => ({
          title: 'Bookings',
          tabBarIcon: tabBarIcon('calendar'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="OwnerNews"
        component={NewsStack}
        options={({ route }) => ({
          title: 'News',
          tabBarIcon: tabBarIcon('newspaper'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="OwnerNotifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts', headerShown: false, tabBarButton: () => null }}
      />
      {/* Profile hidden from tab bar — accessed via header button */}
      <Tab.Screen
        name="OwnerProfile"
        component={ProfileStack}
        options={({ route }) => ({
          tabBarButton: () => null,
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
    </Tab.Navigator>
  );
}

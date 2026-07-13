import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GeneralStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import CustomTabBar, { tabBarIcon, getTabBarStyleForRoute } from './CustomTabBar';
import GeneralHomeScreen from '../screens/general/GeneralHomeScreen';
import GeneralProfileScreen from '../screens/general/GeneralProfileScreen';
import NewsScreen from '../screens/shared/NewsScreen';
import NewsArticleScreen from '../screens/shared/NewsArticleScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import MarketplaceMyListingsScreen from '../screens/marketplace/MyListingsScreen';
import EquipmentListScreen from '../screens/farmer/EquipmentListScreen';
import EquipmentDetailScreen from '../screens/farmer/EquipmentDetailScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ChatRoomsScreen from '../screens/shared/ChatRoomsScreen';
import MapScreen from '../screens/shared/MapScreen';

const Tab = createBottomTabNavigator<GeneralStackParamList>();
const Stack = createNativeStackNavigator<GeneralStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="GeneralHomeMain" component={GeneralHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatRooms" component={ChatRoomsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplaceListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyMarketplaceListings" component={MarketplaceMyListingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ListStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="GeneralEquipmentList" component={EquipmentListScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="GeneralProfileMain" component={GeneralProfileScreen} options={{ headerShown: false }} />
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

export default function GeneralUserNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator
      screenOptions={tabBarOptions}
      initialRouteName="GeneralHome"
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="GeneralHome"
        component={HomeStack}
        options={({ route }) => ({
          title: 'Home',
          tabBarIcon: tabBarIcon('home'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="GeneralMarket"
        component={MarketStack}
        options={({ route }) => ({
          title: 'Market',
          tabBarIcon: tabBarIcon('storefront'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="GeneralList"
        component={ListStack}
        options={({ route }) => ({
          title: 'List Item',
          tabBarIcon: tabBarIcon('add-circle'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="GeneralBrowse"
        component={BrowseStack}
        options={({ route }) => ({
          title: 'Browse',
          tabBarIcon: tabBarIcon('search'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="GeneralNews"
        component={NewsStack}
        options={{
          title: 'News',
          tabBarIcon: tabBarIcon('newspaper'),
        }}
      />
      {/* Profile hidden from tab bar — accessed via header button */}
      <Tab.Screen
        name="GeneralProfile"
        component={ProfileStack}
        options={({ route }) => ({
          tabBarButton: () => null,
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
    </Tab.Navigator>
  );
}

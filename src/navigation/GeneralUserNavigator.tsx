import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GeneralStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import FloatingTabIcon from '../components/FloatingTabIcon';
import GeneralHomeScreen from '../screens/general/GeneralHomeScreen';
import GeneralProfileScreen from '../screens/general/GeneralProfileScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import MarketplaceMyListingsScreen from '../screens/marketplace/MyListingsScreen';
import EquipmentListScreen from '../screens/farmer/EquipmentListScreen';
import EquipmentDetailScreen from '../screens/farmer/EquipmentDetailScreen';

const Tab = createBottomTabNavigator<GeneralStackParamList>();
const Stack = createNativeStackNavigator<GeneralStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="GeneralHomeMain" component={GeneralHomeScreen} options={{ headerShown: false }} />
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
      <Stack.Screen
        name="MyMarketplaceListings"
        component={MarketplaceMyListingsScreen}
        options={{ headerShown: false }}
      />
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
      <Stack.Screen
        name="GeneralEquipmentList"
        component={EquipmentListScreen as any}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EquipmentDetail"
        component={EquipmentDetailScreen as any}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="GeneralProfileMain" component={GeneralProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function GeneralUserNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator screenOptions={tabBarOptions} initialRouteName="GeneralHome">
      <Tab.Screen
        name="GeneralHome"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="home" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GeneralMarket"
        component={MarketStack}
        options={{
          title: 'Market',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="storefront" label="Market" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GeneralList"
        component={ListStack}
        options={{
          title: 'List',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="add-circle" label="List" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GeneralBrowse"
        component={BrowseStack}
        options={{
          title: 'Browse',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="construct" label="Browse" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GeneralProfile"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <FloatingTabIcon name="person" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

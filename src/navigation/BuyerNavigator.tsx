import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BuyerStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import CustomTabBar, { tabBarIcon, getTabBarStyleForRoute } from './CustomTabBar';
import BuyerHomeScreen from '../screens/buyer/BuyerHomeScreen';
import CatalogueScreen from '../screens/buyer/CatalogueScreen';
import ProduceDetailScreen from '../screens/buyer/ProduceDetailScreen';
import QrScannerScreen from '../screens/buyer/QrScannerScreen';
import BuyerProfileScreen from '../screens/buyer/BuyerProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
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
import EquipmentListScreen from '../screens/farmer/EquipmentListScreen';
import WithdrawalScreen from '../screens/shared/WithdrawalScreen';
import TransactionHistoryScreen from '../screens/shared/TransactionHistoryScreen';
import BookingPaymentScreen from '../screens/shared/BookingPaymentScreen';
import MarketplacePaymentScreen from '../screens/shared/MarketplacePaymentScreen';
import SubscriptionScreen from '../screens/shared/SubscriptionScreen';

const Tab = createBottomTabNavigator<BuyerStackParamList>();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerHomeMain" component={BuyerHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProduceDetail" component={ProduceDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuyerQrScanner" component={QrScannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatRooms" component={ChatRoomsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuyerEquipmentList" component={EquipmentListScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="BookingPayment" component={BookingPaymentScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplaceListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplacePayment" component={MarketplacePaymentScreen as any} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function CatalogueStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerCatalogueList" component={CatalogueScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProduceDetail" component={ProduceDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplacePayment" component={MarketplacePaymentScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerQrScanner" component={QrScannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProduceDetail" component={ProduceDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplacePayment" component={MarketplacePaymentScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplaceListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MarketplacePayment" component={MarketplacePaymentScreen as any} options={{ headerShown: false }} />
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
      <Stack.Screen name="BuyerProfileMain" component={BuyerProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ headerShown: false }} />
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

export default function BuyerNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator screenOptions={tabBarOptions} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen
        name="BuyerHome"
        component={HomeStack}
        options={({ route }) => ({
          title: 'Home',
          tabBarIcon: tabBarIcon('home'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="BuyerMarket"
        component={MarketStack}
        options={({ route }) => ({
          title: 'Market',
          tabBarIcon: tabBarIcon('storefront'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="BuyerScanner"
        component={ScannerStack}
        options={{
          title: 'Scan QR',
          tabBarIcon: tabBarIcon('qr-code'),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="BuyerCatalogue"
        component={CatalogueStack}
        options={({ route }) => ({
          title: 'Catalogue',
          tabBarIcon: tabBarIcon('grid'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="BuyerNews"
        component={NewsStack}
        options={({ route }) => ({
          title: 'News',
          tabBarIcon: tabBarIcon('newspaper'),
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
      <Tab.Screen
        name="BuyerNotifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts', headerShown: false, tabBarButton: () => null }}
      />
      {/* Profile hidden from tab bar — accessed via header button */}
      <Tab.Screen
        name="BuyerProfile"
        component={ProfileStack}
        options={({ route }) => ({
          tabBarButton: () => null,
          tabBarStyle: getTabBarStyleForRoute(route),
        })}
      />
    </Tab.Navigator>
  );
}

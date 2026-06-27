import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BuyerStackParamList } from '../types';
import { stackHeaderOptions, getTabBarOptions } from './navigatorTheme';
import { useTheme } from '../hooks/useTheme';
import TabIcon from '../components/TabIcon';
import TabLabel from '../components/TabLabel';
import BuyerHomeScreen from '../screens/buyer/BuyerHomeScreen';
import CatalogueScreen from '../screens/buyer/CatalogueScreen';
import ProduceDetailScreen from '../screens/buyer/ProduceDetailScreen';
import QrScannerScreen from '../screens/buyer/QrScannerScreen';
import BuyerProfileScreen from '../screens/buyer/BuyerProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator<BuyerStackParamList>();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerHomeMain" component={BuyerHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProduceDetail" component={ProduceDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuyerQrScanner" component={QrScannerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function CatalogueStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerCatalogueList" component={CatalogueScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProduceDetail" component={ProduceDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerQrScanner" component={QrScannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProduceDetail" component={ProduceDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="BuyerProfileMain" component={BuyerProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function BuyerNavigator() {
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="BuyerHome"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} pill />,
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BuyerCatalogue"
        component={CatalogueStack}
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Catalogue" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BuyerScanner"
        component={ScannerStack}
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon name="qr-code" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Scan" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BuyerNotifications"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Alerts" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BuyerProfile"
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

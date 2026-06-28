import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { colors } from '../constants/colors';
import { ThemeColors } from '../context/ThemeContext';

export const stackHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.primaryGreen },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
};

export const TAB_BAR_FLOATING_OFFSET = 24;
export const TAB_BAR_HEIGHT = 64;

// themeColors is accepted to keep existing call sites stable, but the
// floating pill bar uses fixed colors per the design spec rather than
// theme-driven ones.
export function getTabBarOptions(_themeColors: ThemeColors): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: '#1A6B2E',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: tabBarStyles.tabBar,
    tabBarItemStyle: tabBarStyles.tabItem,
    tabBarBackground: () => React.createElement(View, { style: tabBarStyles.tabBarBackground }),
  };
}

const tabBarStyles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? TAB_BAR_FLOATING_OFFSET : TAB_BAR_FLOATING_OFFSET - 8,
    height: TAB_BAR_HEIGHT,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 0,
  },
  tabBarBackground: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 24,
  },
});

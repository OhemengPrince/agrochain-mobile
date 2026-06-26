import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { colors } from '../constants/colors';
import { topShadow } from '../constants/shadows';
import { ThemeColors } from '../context/ThemeContext';

export const stackHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.primaryGreen },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
};

export function getTabBarOptions(themeColors: ThemeColors): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: themeColors.primaryGreen,
    tabBarInactiveTintColor: themeColors.secondaryText,
    tabBarStyle: {
      height: 65,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: themeColors.tabBarBackground,
      borderTopWidth: 0,
      ...topShadow,
    },
  };
}

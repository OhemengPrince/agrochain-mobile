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

// Visual styling now lives entirely in PremiumTabBar (passed via the
// Tab.Navigator `tabBar` prop), since a custom tab bar bypasses all of
// the tabBarStyle/tabBarIcon-style options. themeColors is accepted to
// keep existing call sites stable.
export function getTabBarOptions(_themeColors: ThemeColors): BottomTabNavigationOptions {
  return {
    headerShown: false,
  };
}

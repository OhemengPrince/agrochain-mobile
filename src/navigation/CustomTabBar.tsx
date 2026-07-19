import React, { useEffect, useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../hooks/useTheme';

const ACTIVE_COLOR = '#1A6B2E';

export function tabBarIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={size} color={color} />
  );
}

export function getTabBarStyleForRoute(route: RouteProp<any, any>) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route);
  if (focusedRouteName?.endsWith('Detail') || focusedRouteName === 'Chat' || focusedRouteName === 'NewsArticle' || focusedRouteName === 'Map' || focusedRouteName === 'BookingPayment' || focusedRouteName === 'MarketplacePayment' || focusedRouteName === 'Withdrawal' || focusedRouteName === 'TransactionHistory') {
    return { display: 'none' as const };
  }
  return undefined;
}

function TabBarButton({
  focused,
  label,
  renderIcon,
  onPress,
  inactiveColor,
}: {
  focused: boolean;
  label: string;
  renderIcon: () => React.ReactNode;
  onPress: () => void;
  inactiveColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  useEffect(() => {
    if (!focused) return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={[styles.item, { transform: [{ scale }, { translateX: shakeX }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.95)}
        onPressOut={() => animateTo(1)}
        style={styles.itemInner}
      >
        <View style={styles.dot}>{focused && <View style={styles.dotActive} />}</View>
        {renderIcon()}
        <Text
          style={[styles.label, { color: focused ? ACTIVE_COLOR : inactiveColor, fontWeight: focused ? '700' : '400' }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDarkMode } = useTheme();

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;
  if ((focusedOptions.tabBarStyle as { display?: string } | undefined)?.display === 'none') {
    return null;
  }

  const inactiveColor = isDarkMode ? '#6B7280' : '#9CA3AF';
  const barBg = isDarkMode ? 'rgba(30,30,30,0.97)' : 'rgba(255,255,255,0.95)';
  const barBorder = isDarkMode ? colors.border : 'rgba(255,255,255,0.8)';

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: barBg, borderColor: barBorder }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (options.tabBarButton) return null;

          const focused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const color = focused ? ACTIVE_COLOR : inactiveColor;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TabBarButton
              key={route.key}
              focused={focused}
              label={label}
              inactiveColor={inactiveColor}
              renderIcon={() => options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 24 }) : null}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 28 : 16,
  },
  bar: {
    height: 68,
    borderRadius: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
  },
  item: { flex: 1 },
  itemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dot: { height: 5, marginBottom: 3 },
  dotActive: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACTIVE_COLOR,
  },
  label: { fontSize: 10, marginTop: 3, letterSpacing: 0.2 },
});

import React, { useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ACTIVE_COLOR = '#1A6B2E';
const INACTIVE_COLOR = '#9CA3AF';

export function tabBarIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={size} color={color} />
  );
}

// Detail-style screens (route names ending in "Detail") fill the screen with
// bottom-anchored content (price/action bars) that the floating tab bar would
// otherwise cover, so the tab bar hides itself while one of them is focused.
export function getTabBarStyleForRoute(route: RouteProp<any, any>) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route);
  if (focusedRouteName?.endsWith('Detail')) {
    return { display: 'none' as const };
  }
  return undefined;
}

function TabBarButton({
  focused,
  label,
  renderIcon,
  onPress,
}: {
  focused: boolean;
  label: string;
  renderIcon: () => React.ReactNode;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  return (
    <Animated.View style={[styles.item, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.95)}
        onPressOut={() => animateTo(1)}
        style={styles.itemInner}
      >
        <View style={styles.dot}>{focused && <View style={styles.dotActive} />}</View>
        {renderIcon()}
        <Text style={[styles.label, { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR, fontWeight: focused ? '700' : '400' }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;
  if ((focusedOptions.tabBarStyle as { display?: string } | undefined)?.display === 'none') {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (options.tabBarButton) {
            return null;
          }

          const focused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const renderIcon = () =>
            options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 24 }) : null;

          return (
            <TabBarButton key={route.key} focused={focused} label={label} renderIcon={renderIcon} onPress={onPress} />
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  item: {
    flex: 1,
  },
  itemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dot: {
    height: 5,
    marginBottom: 3,
  },
  dotActive: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACTIVE_COLOR,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});

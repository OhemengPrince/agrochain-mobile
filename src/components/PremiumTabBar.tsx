import React, { useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ACTIVE_COLOR = '#1A6B2E';
const INACTIVE_COLOR = '#B0BEC5';
const ACTIVE_PILL_COLOR = '#E8F5E9';

export function tabBarIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={size} color={color} />
  );
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
        style={[styles.itemInner, focused && styles.itemInnerActive]}
      >
        <View style={styles.iconWrap}>{renderIcon()}</View>
        <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={['rgba(26,107,46,0.08)', 'rgba(26,107,46,0)']}
        style={styles.glow}
        pointerEvents="none"
      />
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (options.tabBarButton) {
            return null;
          }

          const focused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
          const size = focused ? 24 : 22;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const renderIcon = () => (options.tabBarIcon ? options.tabBarIcon({ focused, color, size }) : null);

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
    bottom: Platform.OS === 'ios' ? 24 : 16,
  },
  glow: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: -20,
    bottom: -12,
    borderRadius: 46,
  },
  bar: {
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  item: {
    flex: 1,
  },
  itemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    marginVertical: 6,
    marginHorizontal: 4,
    paddingVertical: 4,
  },
  itemInnerActive: {
    backgroundColor: ACTIVE_PILL_COLOR,
  },
  iconWrap: {
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
  labelInactive: {
    color: INACTIVE_COLOR,
    fontWeight: '600',
  },
});

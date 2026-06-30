import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

interface Props {
  size?: number; // core dot diameter (default 9)
}

/**
 * Animated "active / online" radio-wave indicator.
 * Two rings expand outward from a solid green core, staggered for a
 * smooth "broadcasting" feel.
 */
export default function ActiveIndicator({ size = 9 }: Props) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, {
          toValue: 1, duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(200),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(550),
        Animated.timing(ring2, {
          toValue: 1, duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(200),
      ])
    );
    loop1.start();
    loop2.start();
    return () => { loop1.stop(); loop2.stop(); };
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer ripple 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#16a34a',
          opacity: ring1.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.6, 0.2, 0] }),
          transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }}
      />
      {/* Outer ripple 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#16a34a',
          opacity: ring2.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.6, 0.2, 0] }),
          transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }}
      />
      {/* Solid core */}
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#22c55e',
          borderWidth: 1.5,
          borderColor: '#FFFFFF',
          shadowColor: '#16a34a',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 3,
          elevation: 3,
        }}
      />
    </View>
  );
}

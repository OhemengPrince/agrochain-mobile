import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface Props {
  size?: number; // core dot diameter (default 10)
}

/**
 * Animated "active / online" indicator.
 * Renders a solid green dot with two expanding ripple rings.
 * Ripples overflow the View bounds (React Native allows this by default).
 */
export default function ActiveIndicator({ size = 10 }: Props) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(ring2, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );
    loop1.start();
    loop2.start();
    return () => { loop1.stop(); loop2.stop(); };
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ripple 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#22c55e',
          opacity: ring1.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
        }}
      />
      {/* Ripple 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#22c55e',
          opacity: ring2.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
        }}
      />
      {/* Core dot */}
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#22c55e',
          borderWidth: 1.5,
          borderColor: '#FFFFFF',
        }}
      />
    </View>
  );
}

import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import GlassBlur from './GlassBlur';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string | number;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
  bounce?: boolean;
}

export default function GlassStatPill({ icon, label, active, activeColor = '#DC2626', onPress, bounce }: Props) {
  const { colors, isDarkMode } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (bounce) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 30, bounciness: 14 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      ]).start();
    }
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.wrap} hitSlop={6}>
      <GlassBlur
        intensity={35}
        tint={isDarkMode ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
        androidFallbackColor={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={icon} size={15} color={active ? activeColor : colors.secondaryText} />
      </Animated.View>
      <Text style={[styles.label, { color: active ? activeColor : colors.secondaryText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.18)',
    overflow: 'hidden',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});

import React from 'react';
import { View, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

// iOS gets a real frosted BlurView ("liquid glass"); Android falls back to a
// semi-transparent tinted View since BlurView renders inconsistently there.
export default function GlassBlur({
  intensity = 50,
  tint = 'light',
  style,
  androidFallbackColor,
}: {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  androidFallbackColor: string;
}) {
  if (Platform.OS === 'ios') {
    return <BlurView intensity={intensity} tint={tint} style={style} />;
  }
  return <View style={[style, { backgroundColor: androidFallbackColor }]} />;
}

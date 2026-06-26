import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../constants/colors';
import { buttonShadow } from '../constants/shadows';

interface AppButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

function triggerHaptics() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  const handlePress = (event: GestureResponderEvent) => {
    triggerHaptics();
    onPress(event);
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'outline' ? colors.primaryGreen : colors.white} />
  ) : (
    <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
  );

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={isDisabled}>
          <LinearGradient
            colors={['#2E8B4A', '#1A6B2E']}
            style={[styles.base, styles.primary, isDisabled && styles.disabled]}
          >
            {content}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          variant === 'outline' && styles.outline,
          variant === 'danger' && styles.danger,
          isDisabled && styles.disabled,
        ]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    ...buttonShadow,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primaryGreen,
  },
  danger: {
    backgroundColor: '#DC2626',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  outlineText: {
    color: colors.primaryGreen,
  },
});

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
import { buttonShadow } from '../constants/shadows';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: 0.95, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
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
      <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
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
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      backgroundColor: colors.card,
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
}

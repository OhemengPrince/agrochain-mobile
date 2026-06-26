import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatRole } from '../../utils/formatters';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number, duration: number) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  return {
    scale,
    opacity,
    onPressIn: () => animateTo(0.97, 0.95, 100),
    onPressOut: () => animateTo(1, 1, 150),
    onFocus: () => animateTo(1.02, 1, 100),
    onBlur: () => animateTo(1, 1, 150),
  };
}

function SettingsRow({
  label,
  onPress,
  styles,
}: {
  label: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={styles.row}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <Text style={styles.rowText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);
    setLoading(true);
    try {
      await logout();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to log out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ErrorMessage message={error} />

      <View style={styles.profileCard}>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.detail}>{user?.email}</Text>
        <Text style={styles.detail}>{user?.phoneNumber}</Text>
        <Text style={styles.roleBadge}>{user ? formatRole(user.role) : ''}</Text>
      </View>

      <SettingsRow label="Edit Profile" styles={styles} />
      <SettingsRow label="Change Password" styles={styles} />
      <SettingsRow label="About AgroChain" styles={styles} />

      <AppButton
        title="Log Out"
        variant="outline"
        onPress={handleLogout}
        loading={loading}
        style={styles.logoutButton}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    profileCard: {
      backgroundColor: colors.lightGreen,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    detail: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    roleBadge: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    row: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowText: {
      fontSize: 15,
      color: colors.text,
    },
    logoutButton: {
      marginTop: 32,
    },
  });
}

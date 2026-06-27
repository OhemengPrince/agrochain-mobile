import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatRole } from '../../utils/formatters';
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
  };
}

function SettingsRow({
  icon,
  label,
  onPress,
  styles,
  colors,
  right,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  right?: React.ReactNode;
  isLast?: boolean;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.row, isLast && styles.rowLast]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onPress}
      >
        <View style={styles.rowIconWrap}>
          <Ionicons name={icon} size={16} color={colors.primaryGreen} />
        </View>
        <Text style={styles.rowText}>{label}</Text>
        {right ?? <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />}
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const styles = createStyles(colors);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, `${feature} is coming soon.`);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setLoading(true);
          try {
            await logout();
          } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to log out.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const initial = user?.fullName?.charAt(0).toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ErrorMessage message={error} />

        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user ? formatRole(user.role) : ''}</Text>
            </View>
          </View>
          <Pressable style={styles.editButton} onPress={() => showComingSoon('Edit profile')}>
            <Ionicons name="pencil" size={16} color={colors.primaryGreen} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="person-outline"
            label="Edit Profile"
            onPress={() => showComingSoon('Edit profile')}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => showComingSoon('Change password')}
            styles={styles}
            colors={colors}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="moon-outline"
            label="Dark Mode"
            styles={styles}
            colors={colors}
            right={
              <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: colors.primaryGreen }} />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            styles={styles}
            colors={colors}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: colors.primaryGreen }}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="globe-outline"
            label="Language"
            onPress={() => showComingSoon('Language')}
            styles={styles}
            colors={colors}
            right={
              <View style={styles.rowRightGroup}>
                <Text style={styles.rowValue}>English</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </View>
            }
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="star-outline"
            label="Rate the App"
            onPress={() => showComingSoon('Rate the app')}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="call-outline"
            label="Contact Support"
            onPress={() => showComingSoon('Contact support')}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => showComingSoon('Privacy policy')}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="reader-outline"
            label="Terms of Service"
            onPress={() => showComingSoon('Terms of service')}
            styles={styles}
            colors={colors}
            isLast
          />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>{loading ? 'Logging out...' : 'Log Out'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 56,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginTop: -8,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    avatarCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 14,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    profileEmail: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    roleBadge: {
      backgroundColor: colors.lightGreen,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    rowLast: {},
    rowIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    rowRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowValue: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 60,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: '#DC2626',
      marginTop: 8,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#DC2626',
    },
  });
}

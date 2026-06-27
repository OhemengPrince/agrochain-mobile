import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

export interface DropdownExtraItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface ProfileDropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  onPersonalInfo: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (value: boolean) => void;
  onChangePassword: () => void;
  onRateApp: () => void;
  onContactSupport: () => void;
  extraItems?: DropdownExtraItem[];
}

function Row({
  icon,
  label,
  onPress,
  right,
  isLast,
  styles,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  isLast?: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <>
      <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
        <View style={styles.rowIconCircle}>
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowRight}>{right ?? <Ionicons name="chevron-forward" size={18} color="#6B7280" />}</View>
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function ProfileDropdownMenu({
  visible,
  onClose,
  onPersonalInfo,
  notificationsEnabled,
  onToggleNotifications,
  onChangePassword,
  onRateApp,
  onContactSupport,
  extraItems = [],
}: ProfileDropdownMenuProps) {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const styles = createStyles(colors);
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else if (rendered) {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setRendered(false);
      });
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
          <View style={styles.divider} />

          <Row icon="person-outline" label="Personal Information" onPress={onPersonalInfo} styles={styles} colors={colors} />
          <Row
            icon="moon-outline"
            label="Dark Mode"
            styles={styles}
            colors={colors}
            right={<Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: colors.primaryGreen }} />}
          />
          <Row
            icon="notifications-outline"
            label="Notifications"
            styles={styles}
            colors={colors}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={onToggleNotifications}
                trackColor={{ true: colors.primaryGreen }}
              />
            }
          />
          <Row icon="lock-closed-outline" label="Change Password" onPress={onChangePassword} styles={styles} colors={colors} />

          {extraItems.map((item) => (
            <Row key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} styles={styles} colors={colors} />
          ))}

          <Row icon="star-outline" label="Rate the App" onPress={onRateApp} styles={styles} colors={colors} />
          <Row icon="headset-outline" label="Contact Support" onPress={onContactSupport} styles={styles} colors={colors} isLast />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
    },
    card: {
      position: 'absolute',
      top: 55,
      right: 16,
      width: 240,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingBottom: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 48,
      paddingHorizontal: 16,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      paddingHorizontal: 16,
    },
    rowIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: '#1C1C1C',
      marginLeft: 12,
    },
    rowRight: {
      marginLeft: 8,
    },
    divider: {
      height: 1,
      backgroundColor: '#F5F5F5',
      marginHorizontal: 16,
    },
  });
}

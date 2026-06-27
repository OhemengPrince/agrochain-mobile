import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

export interface PersonalInfoExtraRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface PersonalInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  email: string;
  phone: string;
  location: string;
  memberSince: string;
  extraRows?: PersonalInfoExtraRow[];
}

function InfoRow({
  icon,
  label,
  value,
  isLast,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <>
      <View style={styles.infoRow}>
        <View style={styles.infoIconCircle}>
          <Ionicons name={icon} size={20} color="#1A6B2E" />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function PersonalInfoSheet({
  visible,
  onClose,
  onEdit,
  email,
  phone,
  location,
  memberSince,
  extraRows = [],
}: PersonalInfoSheetProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, mass: 0.9 }).start();
    } else if (rendered) {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setRendered(false);
      });
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Personal Information</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </Pressable>
        </View>

        <InfoRow icon="mail-outline" label="Email" value={email} styles={styles} />
        <InfoRow icon="call-outline" label="Phone" value={phone} styles={styles} />
        <InfoRow icon="location-outline" label="Location" value={location} styles={styles} />
        <InfoRow
          icon="calendar-outline"
          label="Member Since"
          value={memberSince}
          isLast={extraRows.length === 0}
          styles={styles}
        />
        {extraRows.map((row, index) => (
          <InfoRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            value={row.value}
            isLast={index === extraRows.length - 1}
            styles={styles}
          />
        ))}

        <Pressable
          onPress={() => {
            onClose();
            onEdit();
          }}
        >
          <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
    },
    infoIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#F0F7F2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTextWrap: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
    },
    editButton: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    editButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

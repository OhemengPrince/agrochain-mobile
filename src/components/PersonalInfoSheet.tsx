import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import FullScreenSheet from './FullScreenSheet';

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

  return (
    <FullScreenSheet visible={visible} onClose={onClose} title="Personal Information">
      <View style={styles.card}>
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
      </View>

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
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.divider,
      marginBottom: 20,
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
    },
    editButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

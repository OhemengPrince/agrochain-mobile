import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatRole, formatDate } from '../../utils/formatters';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!user) return null;

  return (
    <View style={styles.container}>
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{user.fullName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name}>{user.fullName}</Text>
      <Text style={styles.roleBadge}>{formatRole(user.role)}</Text>

      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user.phoneNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>
            {user.district ?? '-'}, {user.region ?? '-'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>{formatDate(user.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
      alignItems: 'center',
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
    },
    avatarPlaceholder: {
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    roleBadge: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accentAmber,
      marginTop: 4,
    },
    infoCard: {
      width: '100%',
      marginTop: 24,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    label: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    value: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
  });
}

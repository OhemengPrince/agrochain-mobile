import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { formatRole } from '../../utils/formatters';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
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

      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowText}>Edit Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowText}>Change Password</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowText}>About AgroChain</Text>
      </TouchableOpacity>

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

const styles = StyleSheet.create({
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
    color: colors.darkText,
  },
  detail: {
    fontSize: 13,
    color: colors.gray,
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
    color: colors.darkText,
  },
  logoutButton: {
    marginTop: 32,
  },
});

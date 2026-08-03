import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { changePassword } from '../api/userApi';
import { getApiErrorMessage } from '../utils/apiError';
import FullScreenSheet from './FullScreenSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!current || !next || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      reset();
      onClose();
      Alert.alert('Password Changed', 'Your password has been updated successfully.');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to change password. Please check your current password and try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FullScreenSheet
      visible={visible}
      onClose={handleClose}
      title="Change Password"
      icon="lock-closed-outline"
      description="Choose a new password to keep your account secure. You'll need to enter your current password first to confirm it's really you, then a new one with at least 6 characters."
    >
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.label}>Current Password</Text>
      <Text style={styles.helper}>The password you use today to log in.</Text>
      <TextInput
        style={styles.input}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry={!showPasswords}
        placeholder="Enter current password"
        placeholderTextColor={colors.secondaryText}
      />

      <Text style={styles.label}>New Password</Text>
      <Text style={styles.helper}>Pick something only you would know — at least 6 characters.</Text>
      <TextInput
        style={styles.input}
        value={next}
        onChangeText={setNext}
        secureTextEntry={!showPasswords}
        placeholder="At least 6 characters"
        placeholderTextColor={colors.secondaryText}
      />

      <Text style={styles.label}>Confirm New Password</Text>
      <Text style={styles.helper}>Type the same new password again, so we know it's correct.</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!showPasswords}
        placeholder="Re-enter new password"
        placeholderTextColor={colors.secondaryText}
      />

      <Pressable style={styles.showRow} onPress={() => setShowPasswords((v) => !v)}>
        <Ionicons name={showPasswords ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.secondaryText} />
        <Text style={styles.showRowText}>{showPasswords ? 'Hide' : 'Show'} passwords</Text>
      </Pressable>

      <Pressable onPress={handleSubmit} disabled={saving}>
        <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={[styles.submitButton, saving && { opacity: 0.7 }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Update Password</Text>}
        </LinearGradient>
      </Pressable>
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginBottom: 14 },
    errorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontWeight: '600' },
    label: { fontSize: 12, fontWeight: '700', color: colors.secondaryText, marginTop: 12 },
    helper: { fontSize: 11, color: colors.secondaryText, opacity: 0.8, marginTop: 2, marginBottom: 6 },
    input: {
      height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontSize: 14, color: colors.text,
    },
    showRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
    showRowText: { fontSize: 12, color: colors.secondaryText, fontWeight: '600' },
    submitButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
    submitButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  });
}

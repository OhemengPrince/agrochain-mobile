import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { changePassword } from '../api/userApi';
import { getApiErrorMessage } from '../utils/apiError';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Change Password</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.secondaryText} />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!showPasswords}
            placeholder="Enter current password"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={next}
            onChangeText={setNext}
            secureTextEntry={!showPasswords}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>Confirm New Password</Text>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 36,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginBottom: 14 },
    errorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontWeight: '600' },
    label: { fontSize: 12, fontWeight: '700', color: colors.secondaryText, marginBottom: 6, marginTop: 12 },
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

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { verifyResetOtp, resetPassword } from '../../api/authApi';
import { colors } from '../../constants/colors';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    if (!otp || !newPassword) {
      setError('Please enter the OTP and your new password.');
      return;
    }
    setLoading(true);
    try {
      await verifyResetOtp({ email, otp });
      await resetPassword({ email, otp, newPassword });
      navigation.navigate('Login');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {email} and your new password.</Text>

      <ErrorMessage message={error} />

      <Text style={styles.label}>OTP</Text>
      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />

      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
        secureTextEntry
      />

      <AppButton title="Reset Password" onPress={handleReset} loading={loading} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.darkText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
  },
  button: {
    marginTop: 24,
  },
});

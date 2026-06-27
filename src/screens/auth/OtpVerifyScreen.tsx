import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { verifyOtp } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { USE_MOCK_DATA } from '../../config';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export default function OtpVerifyScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setError(null);

    if (USE_MOCK_DATA) {
      // Any 6-digit code is accepted while the real backend isn't wired up yet.
      if (!/^\d{6}$/.test(otp)) {
        setError('Enter the 6-digit code to continue.');
        return;
      }
      setLoading(true);
      try {
        await verifyOtp({ email, otp });
        navigation.navigate('Login');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (otp.length < 4) {
      setError('Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyOtp({ email, otp });
      await login(response.token, response.user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>

      <ErrorMessage message={error} />

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="123456"
        placeholderTextColor={colors.secondaryText}
        keyboardType="number-pad"
        maxLength={6}
      />

      <AppButton title="Verify" onPress={handleVerify} loading={loading} style={styles.button} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      height: 50,
      paddingHorizontal: 12,
      fontSize: 18,
      textAlign: 'center',
      letterSpacing: 4,
      color: colors.text,
    },
    button: {
      marginTop: 24,
    },
  });
}

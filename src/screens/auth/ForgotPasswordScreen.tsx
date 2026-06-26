import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { forgotPassword } from '../../api/authApi';
import { colors } from '../../constants/colors';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email });
      navigation.navigate('ResetPassword', { email });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a code to reset your password.
      </Text>

      <ErrorMessage message={error} />

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <AppButton title="Send Reset Code" onPress={handleSubmit} loading={loading} style={styles.button} />
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

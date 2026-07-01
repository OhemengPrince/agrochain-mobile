import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import {
  verifyResetOtp, resetPassword,
  verifyResetOtpSms, resetPasswordBySms,
} from '../../api/authApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

function maskIdentifier(identifier: string, method: 'email' | 'sms') {
  if (method === 'email') {
    const [local, domain] = identifier.split('@');
    if (!domain) return identifier;
    const visible = local.slice(0, 2);
    const stars = '*'.repeat(Math.max(local.length - 2, 2));
    return `${visible}${stars}@${domain}`;
  }
  // phone
  const digits = identifier.replace(/\D/g, '');
  return `${'*'.repeat(Math.max(digits.length - 4, 3))}${digits.slice(-4)}`;
}

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const { identifier, method } = route.params;
  const { colors, isDarkMode } = useTheme();
  const s = createStyles(colors, isDarkMode);

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);
  const masked = maskIdentifier(identifier, method);

  const handleReset = async () => {
    setError(null);
    if (otp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (method === 'email') {
        await verifyResetOtp({ email: identifier, otp });
        await resetPassword({ email: identifier, otp, newPassword });
      } else {
        await verifyResetOtpSms({ phone: identifier, otp });
        await resetPasswordBySms({ phone: identifier, otp, newPassword });
      }
      navigation.navigate('Login');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not reset password. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.headerGrad}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={s.shieldWrap}>
            <View style={s.shieldCircle}>
              <Ionicons name="shield-checkmark" size={34} color={colors.primaryGreen} />
            </View>
          </View>

          <Text style={s.headerTitle}>Enter Reset Code</Text>
          <Text style={s.headerSubtitle}>
            A 6-digit code was sent to{' '}
            <Text style={s.headerIdentifier}>{masked}</Text>
            {' '}via {method === 'email' ? 'email' : 'SMS'}.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── OTP digit boxes ── */}
        <Text style={s.sectionLabel}>Verification Code</Text>
        <View style={s.otpArea}>
          {/* Hidden real input */}
          <TextInput
            ref={otpInputRef}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={s.otpHiddenInput}
            autoFocus
          />
          {/* Visual boxes */}
          <View style={s.otpRow}>
            {Array.from({ length: 6 }).map((_, i) => {
              const isFocused = otp.length === i;
              const hasValue = i < otp.length;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.otpBox,
                    hasValue && s.otpBoxFilled,
                    isFocused && s.otpBoxFocused,
                  ]}
                  onPress={() => otpInputRef.current?.focus()}
                  activeOpacity={1}
                >
                  {hasValue ? (
                    <Text style={s.otpDigit}>{otp[i]}</Text>
                  ) : isFocused ? (
                    <View style={s.otpCursor} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Resend link */}
        <TouchableOpacity style={s.resendRow} activeOpacity={0.7}>
          <Text style={s.resendGray}>Didn't receive the code? </Text>
          <Text style={s.resendGreen}>Resend</Text>
        </TouchableOpacity>

        {/* ── New password ── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>New Password</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.secondaryText} style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.secondaryText}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleReset}
          />
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)} activeOpacity={0.7}>
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>
        <Text style={s.passwordHint}>
          Use at least 6 characters with a mix of letters and numbers.
        </Text>

        <ErrorMessage message={error} />

        {/* ── Reset button ── */}
        <TouchableOpacity
          style={[s.resetBtn, loading && s.resetBtnDisabled]}
          onPress={handleReset}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.primaryGreen, colors.primaryGreenLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.resetBtnGrad}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.resetBtnText}>Reset Password</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.backLink} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
          <Ionicons name="arrow-back-circle-outline" size={16} color={colors.primaryGreen} style={{ marginRight: 4 }} />
          <Text style={s.backLinkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // Header
    headerGrad: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 20,
    },
    shieldWrap: {
      alignItems: 'center',
      marginBottom: 20,
    },
    shieldCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.80)',
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
      paddingHorizontal: 10,
    },
    headerIdentifier: {
      fontWeight: '800',
      color: '#fff',
    },

    // Body
    body: { flex: 1 },
    bodyContent: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 40,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 14,
    },

    // OTP
    otpArea: { position: 'relative' },
    otpHiddenInput: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    otpBox: {
      flex: 1,
      height: 58,
      borderRadius: 14,
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpBoxFilled: {
      borderColor: colors.primaryGreen,
      backgroundColor: isDarkMode ? 'rgba(46,139,69,0.12)' : 'rgba(46,139,69,0.06)',
    },
    otpBoxFocused: {
      borderColor: colors.primaryGreen,
      borderWidth: 2,
    },
    otpDigit: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    otpCursor: {
      width: 2,
      height: 24,
      backgroundColor: colors.primaryGreen,
      borderRadius: 1,
    },

    resendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 14,
    },
    resendGray: { fontSize: 13, color: colors.secondaryText },
    resendGreen: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },

    // Input
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      height: 56,
      paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    passwordHint: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 8,
      marginLeft: 2,
    },

    // Reset button
    resetBtn: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 28,
    },
    resetBtnDisabled: { opacity: 0.7 },
    resetBtnGrad: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.2,
    },

    // Back link
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingVertical: 8,
    },
    backLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
  });
}

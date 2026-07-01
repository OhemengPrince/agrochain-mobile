import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { verifyOtp } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { USE_MOCK_DATA } from '../../config';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

const RESEND_SECONDS = 60;

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  const stars = '*'.repeat(Math.max(local.length - 2, 2));
  return `${visible}${stars}@${domain}`;
}

export default function OtpVerifyScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { login } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const s = createStyles(colors, isDarkMode);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const otpInputRef = useRef<TextInput>(null);
  // Shake animation for wrong code
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const masked = maskEmail(email);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    setError(null);

    if (USE_MOCK_DATA) {
      if (!/^\d{6}$/.test(otp)) {
        setError('Enter the 6-digit code sent to your email.');
        triggerShake();
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

    if (otp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const response = await verifyOtp({ email, otp });
      await login(response.token, response.user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired code. Please try again.');
      triggerShake();
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    setOtp('');
    // Simulate resend — wire to real API when available
    await new Promise((r) => setTimeout(r, 800));
    setCountdown(RESEND_SECONDS);
    setResending(false);
    otpInputRef.current?.focus();
  };

  const formatCountdown = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={s.root}>
      {/* ── Green gradient header ── */}
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.headerGrad}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Email icon in white circle */}
          <View style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="mail" size={36} color={colors.primaryGreen} />
            </View>
            {/* Animated ring */}
            <View style={s.iconRing} />
          </View>

          <Text style={s.headerTitle}>Check Your Email</Text>
          <Text style={s.headerSubtitle}>
            We sent a 6-digit verification code to
          </Text>
          <Text style={s.headerEmail}>{masked}</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Body ── */}
      <View style={s.body}>
        {/* Step indicator */}
        <View style={s.stepsRow}>
          <View style={[s.step, s.stepDone]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={s.stepLine} />
          <View style={[s.step, s.stepActive]}>
            <Text style={s.stepNum}>2</Text>
          </View>
          <View style={[s.stepLine, s.stepLineDim]} />
          <View style={[s.step, s.stepDim]}>
            <Text style={[s.stepNum, s.stepNumDim]}>3</Text>
          </View>
        </View>
        <View style={s.stepsLabelRow}>
          <Text style={s.stepLabelDone}>Register</Text>
          <Text style={s.stepLabelActive}>Verify</Text>
          <Text style={s.stepLabelDim}>Done</Text>
        </View>

        <Text style={s.codeLabel}>Enter Verification Code</Text>

        {/* OTP digit boxes */}
        <Animated.View style={[s.otpArea, { transform: [{ translateX: shakeAnim }] }]}>
          <TextInput
            ref={otpInputRef}
            value={otp}
            onChangeText={(v) => {
              setError(null);
              setOtp(v.replace(/[^0-9]/g, '').slice(0, 6));
            }}
            keyboardType="number-pad"
            maxLength={6}
            style={s.otpHiddenInput}
            autoFocus
          />
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
        </Animated.View>

        <ErrorMessage message={error} />

        {/* ── Verify button ── */}
        <TouchableOpacity
          style={[s.verifyBtn, (loading || otp.length < 6) && s.verifyBtnDim]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={loading || otp.length < 6}
        >
          <LinearGradient
            colors={[colors.primaryGreen, colors.primaryGreenLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.verifyBtnGrad}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.verifyBtnText}>Verify Account</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Resend row ── */}
        <View style={s.resendRow}>
          {countdown > 0 ? (
            <>
              <Ionicons name="time-outline" size={15} color={colors.secondaryText} style={{ marginRight: 5 }} />
              <Text style={s.resendGray}>Resend code in </Text>
              <Text style={s.resendTimer}>{formatCountdown(countdown)}</Text>
            </>
          ) : (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7} style={s.resendBtn} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={colors.primaryGreen} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={15} color={colors.primaryGreen} style={{ marginRight: 5 }} />
                  <Text style={s.resendGreen}>Resend Code</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Wrong email? ── */}
        <View style={s.wrongEmailRow}>
          <Text style={s.wrongEmailGray}>Wrong email? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.wrongEmailGreen}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // ── Header ──
    headerGrad: {
      paddingHorizontal: 20,
      paddingBottom: 36,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      position: 'relative',
    },
    iconCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.20,
      shadowRadius: 14,
      elevation: 10,
    },
    iconRing: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.30)',
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
      color: 'rgba(255,255,255,0.75)',
      textAlign: 'center',
      marginTop: 8,
    },
    headerEmail: {
      fontSize: 15,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      marginTop: 4,
      letterSpacing: 0.3,
    },

    // ── Body ──
    body: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
    },

    // Step indicator
    stepsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      gap: 0,
    },
    step: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDone: { backgroundColor: colors.primaryGreen },
    stepActive: {
      backgroundColor: colors.primaryGreen,
      borderWidth: 2,
      borderColor: 'rgba(46,139,69,0.30)',
    },
    stepDim: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
    stepNumDim: { color: colors.secondaryText },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.primaryGreen,
      maxWidth: 48,
    },
    stepLineDim: {
      backgroundColor: colors.border,
    },
    stepsLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      marginBottom: 32,
    },
    stepLabelDone: { fontSize: 11, fontWeight: '600', color: colors.primaryGreen, flex: 1, textAlign: 'left' },
    stepLabelActive: { fontSize: 11, fontWeight: '700', color: colors.primaryGreen, flex: 1, textAlign: 'center' },
    stepLabelDim: { fontSize: 11, color: colors.secondaryText, flex: 1, textAlign: 'right' },

    codeLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 14,
    },

    // ── OTP boxes ──
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
      gap: 10,
      marginBottom: 8,
    },
    otpBox: {
      flex: 1,
      height: 62,
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
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    otpCursor: {
      width: 2,
      height: 26,
      backgroundColor: colors.primaryGreen,
      borderRadius: 1,
    },

    // ── Verify button ──
    verifyBtn: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 24,
    },
    verifyBtnDim: { opacity: 0.55 },
    verifyBtnGrad: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifyBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.2,
    },

    // ── Resend ──
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    resendGray: { fontSize: 13, color: colors.secondaryText },
    resendTimer: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primaryGreen,
      fontVariant: ['tabular-nums'],
    },
    resendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: isDarkMode ? 'rgba(46,139,69,0.12)' : 'rgba(46,139,69,0.08)',
    },
    resendGreen: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },

    // ── Wrong email ──
    wrongEmailRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 16,
    },
    wrongEmailGray: { fontSize: 13, color: colors.secondaryText },
    wrongEmailGreen: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  });
}

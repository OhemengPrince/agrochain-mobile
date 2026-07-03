import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { forgotPassword, forgotPasswordSms } from '../../api/authApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type Method = 'email' | 'sms';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const s = createStyles(colors, isDarkMode);

  const [method, setMethod] = useState<Method>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);

    if (method === 'email') {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        await forgotPassword({ email: email.trim() });
        navigation.navigate('ResetPassword', { identifier: email.trim(), method: 'email' });
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Could not send reset code. Try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!phone.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 9) {
        setError('Please enter a valid phone number.');
        return;
      }
      setLoading(true);
      try {
        await forgotPasswordSms({ phone: phone.trim() });
        navigation.navigate('ResetPassword', { identifier: phone.trim(), method: 'sms' });
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Could not send SMS code. Try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={s.root}>
      {/* ── Green gradient header ── */}
      <LinearGradient
        colors={[colors.primaryGreen, colors.primaryGreenLight]}
        style={s.headerGrad}
      >
        <SafeAreaView edges={['top']}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Lock icon */}
          <View style={s.lockWrap}>
            <View style={s.lockCircle}>
              <Ionicons name="lock-closed" size={34} color={colors.primaryGreen} />
            </View>
          </View>

          <Text style={s.headerTitle}>Forgot Password?</Text>
          <Text style={s.headerSubtitle}>
            No worries — choose how you'd like to receive your reset code.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Body ── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Method selector cards ── */}
        <Text style={s.sectionLabel}>Select a recovery method</Text>

        <View style={s.methodRow}>
          <MethodCard
            selected={method === 'email'}
            icon="mail"
            title="Email"
            subtitle="Send a code to your registered email address"
            onPress={() => { setMethod('email'); setError(null); }}
            s={s}
            colors={colors}
          />
          <MethodCard
            selected={method === 'sms'}
            icon="phone-portrait"
            title="SMS"
            subtitle="Send a one-time code to your phone number"
            onPress={() => { setMethod('sms'); setError(null); }}
            s={s}
            colors={colors}
          />
        </View>

        {/* ── Dynamic input ── */}
        <View style={s.inputSection}>
          {method === 'email' ? (
            <>
              <Text style={s.inputLabel}>Email Address</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.secondaryText} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.secondaryText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
              </View>
              <Text style={s.inputHint}>
                We'll send a 6-digit code to this email.
              </Text>
            </>
          ) : (
            <>
              <Text style={s.inputLabel}>Phone Number</Text>
              <View style={s.inputWrap}>
                <Ionicons name="call-outline" size={18} color={colors.secondaryText} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+233 XX XXX XXXX"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="phone-pad"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
              </View>
              <Text style={s.inputHint}>
                We'll send a 6-digit SMS code to this number.
              </Text>
            </>
          )}
        </View>

        <ErrorMessage message={error} />

        {/* ── Send button ── */}
        <TouchableOpacity
          style={[s.sendBtn, loading && s.sendBtnDisabled]}
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.primaryGreen, colors.primaryGreenLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.sendBtnGrad}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={method === 'email' ? 'send' : 'chatbubble-ellipses-outline'}
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={s.sendBtnText}>
                  {method === 'email' ? 'Send Email Code' : 'Send SMS Code'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Back link ── */}
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back-circle-outline" size={16} color={colors.primaryGreen} style={{ marginRight: 4 }} />
          <Text style={s.backLinkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Method card ──────────────────────────────────────────────────────────────

function MethodCard({
  selected, icon, title, subtitle, onPress, s, colors,
}: {
  selected: boolean;
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  s: any;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      style={[s.methodCard, selected && s.methodCardActive]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(46,139,69,0.12)' }}
    >
      {/* Active green border highlight on top */}
      {selected && <View style={s.methodCardTopBar} />}

      <View style={[s.methodIconCircle, selected && s.methodIconCircleActive]}>
        <Ionicons
          name={icon}
          size={22}
          color={selected ? '#fff' : colors.secondaryText}
        />
      </View>

      <Text style={[s.methodTitle, selected && s.methodTitleActive]}>{title}</Text>
      <Text style={[s.methodSubtitle, selected && s.methodSubtitleActive]}>{subtitle}</Text>

      {selected && (
        <View style={s.methodCheck}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primaryGreen} />
        </View>
      )}
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // Header — kept compact so all body content (including "Back to Sign In") fits on screen
    headerGrad: {
      paddingHorizontal: 20,
      paddingBottom: 18,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      marginBottom: 10,
    },
    lockWrap: {
      alignItems: 'center',
      marginBottom: 10,
    },
    lockCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
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
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.80)',
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
      paddingHorizontal: 16,
    },

    // Body
    body: { flex: 1 },
    bodyContent: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 32,
    },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
    },

    // Method cards
    methodRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    methodCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 130,
    },
    methodCardActive: {
      borderColor: colors.primaryGreen,
      backgroundColor: isDarkMode ? 'rgba(46,139,69,0.12)' : 'rgba(46,139,69,0.06)',
    },
    methodCardTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: colors.primaryGreen,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    methodIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      marginTop: 8,
    },
    methodIconCircleActive: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    methodTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
      letterSpacing: 0.1,
    },
    methodTitleActive: {
      color: colors.primaryGreen,
    },
    methodSubtitle: {
      fontSize: 12,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 17,
    },
    methodSubtitleActive: {
      color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4B7A55',
    },
    methodCheck: {
      position: 'absolute',
      top: 10,
      right: 10,
    },

    // Input
    inputSection: {
      marginBottom: 6,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
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
    inputHint: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 8,
      marginLeft: 2,
    },

    // Send button
    sendBtn: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 18,
    },
    sendBtnDisabled: { opacity: 0.7 },
    sendBtnGrad: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnText: {
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
      marginTop: 16,
      paddingVertical: 8,
    },
    backLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
  });
}

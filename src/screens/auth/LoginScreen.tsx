import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList, User } from '../../types';
import { login as loginApi, loginAsRole } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PLACEHOLDER_COLOR = '#9CA3AF';

const DEMO_ACCOUNTS: { label: string; role: User['role']; email: string }[] = [
  { label: 'Farmer', role: 'FARMER', email: 'farmer@agrochain.com' },
  { label: 'Owner', role: 'EQUIPMENT_OWNER', email: 'owner@agrochain.com' },
  { label: 'Buyer', role: 'BUYER', email: 'buyer@agrochain.com' },
  { label: 'General', role: 'GENERAL', email: 'general@agrochain.com' },
];

function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number, duration: number) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  return {
    scale,
    opacity,
    onPressIn: () => animateTo(0.97, 0.95, 100),
    onPressOut: () => animateTo(1, 1, 150),
    onFocus: () => animateTo(1.02, 1, 100),
    onBlur: () => animateTo(1, 1, 150),
  };
}

function SignInButton({
  loading,
  onPress,
  styles,
}: {
  loading: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.signInButton, loading && styles.signInButtonDisabled]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.signInButtonText}>Sign In</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function DemoChip({
  label,
  disabled,
  onPress,
  styles,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={styles.demoChip}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
      >
        <Text style={styles.demoChipText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await loginApi({ email, password });
      await login(response.token, response.user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: User['role']) => {
    setError(null);
    setLoading(true);
    try {
      const response = await loginAsRole(role);
      await login(response.token, response.user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not log in with the demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌾</Text>
          </View>
          <Text style={styles.logoText}>AgroChain</Text>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSubtitle}>
            Access your farm equipment, produce tracking and buyer connections.
          </Text>
        </View>

        <ErrorMessage message={error} />

        <View style={styles.inputsWrap}>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={PLACEHOLDER_COLOR} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={PLACEHOLDER_COLOR} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={PLACEHOLDER_COLOR}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={PLACEHOLDER_COLOR}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
          <Text style={styles.forgotLinkText}>Forgot password?</Text>
        </TouchableOpacity>

        <SignInButton loading={loading} onPress={handleLogin} styles={styles} />

        <View style={styles.bottomLinkRow}>
          <Text style={styles.bottomLinkGray}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
            <Text style={styles.bottomLinkGreen}> Create Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.card,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    topSection: {
      alignItems: 'center',
      paddingTop: 60,
    },
    logoCircle: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    logoEmoji: {
      fontSize: 20,
    },
    logoText: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primaryGreen,
      letterSpacing: 2,
    },
    welcomeSection: {
      alignItems: 'center',
      paddingTop: 40,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: colors.secondaryText,
      textAlign: 'center',
      maxWidth: 280,
      marginTop: 8,
    },
    inputsWrap: {
      marginTop: 36,
      gap: 12,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: 14,
      height: 56,
      paddingHorizontal: 16,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    forgotLink: {
      alignSelf: 'flex-end',
      marginTop: 8,
    },
    forgotLinkText: {
      color: colors.primaryGreen,
      fontSize: 13,
      fontWeight: '700',
    },
    signInButton: {
      marginTop: 24,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInButtonDisabled: {
      opacity: 0.7,
    },
    signInButtonText: {
      color: colors.white,
      fontSize: 17,
      fontWeight: '700',
    },
    bottomLinkRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    bottomLinkGray: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    bottomLinkGreen: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: 28,
    },
    demoSection: {
      marginTop: 20,
      alignItems: 'center',
    },
    demoLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 10,
    },
    demoRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    demoChip: {
      backgroundColor: colors.lightGreen,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    demoChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
  });
}

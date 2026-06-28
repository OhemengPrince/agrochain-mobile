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
import { AuthStackParamList, User, UserRole } from '../../types';
import { login as loginApi, loginAsRole, register } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PLACEHOLDER_COLOR = '#9CA3AF';

const DEMO_ACCOUNTS: { label: string; email: string }[] = [
  { label: 'Farmer', email: 'farmer@agrochain.com' },
  { label: 'Owner', email: 'owner@agrochain.com' },
  { label: 'Buyer', email: 'buyer@agrochain.com' },
  { label: 'General', email: 'general@agrochain.com' },
];

const ROLE_CARDS: { role: User['role']; emoji: string; label: string; color: string }[] = [
  { role: 'FARMER', emoji: '🧑‍🌾', label: 'Login as Farmer', color: '#1A6B2E' },
  { role: 'EQUIPMENT_OWNER', emoji: '🚜', label: 'Login as Equipment Owner', color: '#1565C0' },
  { role: 'BUYER', emoji: '🛒', label: 'Login as Buyer', color: '#FF8F00' },
  { role: 'GENERAL', emoji: '🧑', label: 'Login as General User', color: '#6A1B9A' },
];

const REGISTER_ROLE_OPTIONS: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'FARMER', label: 'Farmer', icon: 'leaf-outline' },
  { value: 'EQUIPMENT_OWNER', label: 'Equipment Owner', icon: 'construct-outline' },
  { value: 'BUYER', label: 'Buyer', icon: 'cart-outline' },
  { value: 'GENERAL', label: 'General User', icon: 'people-outline' },
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

function SubmitButton({
  loading,
  label,
  loadingLabel,
  onPress,
  styles,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
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
          <Text style={styles.signInButtonText}>{label}</Text>
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

function RoleCard({
  emoji,
  label,
  color,
  disabled,
  onPress,
  styles,
}: {
  emoji: string;
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.roleCard, { backgroundColor: color }]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
      >
        <Text style={styles.roleCardEmoji}>{emoji}</Text>
        <Text style={styles.roleCardLabel}>{label}</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

function RegisterRoleCard({
  option,
  selected,
  onPress,
  styles,
  colors,
}: {
  option: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap };
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[styles.registerRoleCardWrap, { transform: [{ scale }], opacity }]}>
      <Pressable
        style={[styles.registerRoleCard, selected && styles.registerRoleCardSelected]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Ionicons name={option.icon} size={24} color={selected ? colors.white : colors.secondaryText} />
        <Text style={[styles.registerRoleLabel, selected && styles.registerRoleLabelSelected]}>
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [isLogin, setIsLogin] = useState(route.params?.startMode !== 'register');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [role, setRole] = useState<UserRole>('FARMER');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (toLogin: boolean) => {
    setError(null);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setIsLogin(toLogin);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

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

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword('demo1234');
    setLoading(true);
    try {
      const response = await loginApi({ email: demoEmail, password: 'demo1234' });
      await login(response.token, response.user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not log in with the demo account.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleLogin = async (loginRole: User['role']) => {
    setError(null);
    setLoading(true);
    try {
      const response = await loginAsRole(loginRole);
      await login(response.token, response.user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setError(null);
    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }
    setLoading(true);
    try {
      await register({ fullName, email, phoneNumber, password, role, region, district });
      navigation.navigate('OtpVerify', { email });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const registerInputWrapStyle = (field: string) => [
    styles.registerInputWrap,
    focusedField === field && styles.registerInputWrapFocused,
  ];

  const confirmHasValue = confirmPassword.length > 0;
  const passwordsMatch = confirmHasValue && password === confirmPassword;

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
          <Text style={styles.welcomeTitle}>{isLogin ? 'Welcome back' : 'Create Account'}</Text>
          <Text style={styles.welcomeSubtitle}>
            {isLogin
              ? 'Sign in to access your dashboard and farm tools.'
              : 'Join the AgroChain community in a few quick steps.'}
          </Text>
        </View>

        <ErrorMessage message={error} />

        <Animated.View style={{ opacity: fadeAnim }}>
          {isLogin ? (
            <>
              <View style={styles.signInSection}>
                <Text style={styles.signInTitle}>Sign in to continue</Text>
                <Text style={styles.signInSubtitle}>
                  Access your farm equipment, produce tracking and buyer connections.
                </Text>
              </View>

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

              <SubmitButton
                loading={loading}
                label="Sign In"
                loadingLabel="Signing in..."
                onPress={handleLogin}
                styles={styles}
              />
            </>
          ) : (
            <>
              <View style={styles.registerSectionLabelWrap}>
                <Text style={styles.registerSectionLabelText}>Personal Information</Text>
                <View style={styles.registerSectionLabelLine} />
              </View>

              <View style={registerInputWrapStyle('fullName')}>
                <Ionicons name="person-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Kwame Mensah"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={registerInputWrapStyle('email')}>
                <Ionicons name="mail-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={registerInputWrapStyle('phone')}>
                <Ionicons name="call-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
                <View style={styles.phonePrefixBox}>
                  <Text style={styles.phonePrefixText}>+233</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="241234567"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={registerInputWrapStyle('password')}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              <View style={registerInputWrapStyle('confirmPassword')}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.primaryGreen}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                />
                {confirmHasValue && (
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={passwordsMatch ? colors.primaryGreen : colors.errorRed}
                  />
                )}
              </View>

              <View style={styles.registerSectionLabelWrap}>
                <Text style={styles.registerSectionLabelText}>Location</Text>
                <View style={styles.registerSectionLabelLine} />
              </View>

              <View style={styles.registerRow}>
                <View style={[registerInputWrapStyle('region'), styles.registerHalf]}>
                  <Ionicons name="map-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={region}
                    onChangeText={setRegion}
                    placeholder="Ashanti"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    onFocus={() => setFocusedField('region')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <View style={[registerInputWrapStyle('district'), styles.registerHalf]}>
                  <Ionicons name="map-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Kumasi"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    onFocus={() => setFocusedField('district')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.registerSectionLabelWrap}>
                <Text style={styles.registerSectionLabelText}>I am a</Text>
                <View style={styles.registerSectionLabelLine} />
              </View>

              <View style={styles.registerRoleRow}>
                {REGISTER_ROLE_OPTIONS.map((option) => (
                  <RegisterRoleCard
                    key={option.value}
                    option={option}
                    selected={role === option.value}
                    onPress={() => setRole(option.value)}
                    styles={styles}
                    colors={colors}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreedToTerms((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <SubmitButton
                loading={loading}
                label="Create Account"
                loadingLabel="Creating Account..."
                onPress={handleCreateAccount}
                styles={styles}
              />
            </>
          )}
        </Animated.View>

        <View style={styles.bottomLinkRow}>
          {isLogin ? (
            <>
              <Text style={styles.bottomLinkGray}>Don&apos;t have an account?</Text>
              <TouchableOpacity onPress={() => switchMode(false)}>
                <Text style={styles.bottomLinkGreen}> Create Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.bottomLinkGray}>Already have an account?</Text>
              <TouchableOpacity onPress={() => switchMode(true)}>
                <Text style={styles.bottomLinkGreen}> Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isLogin && (
          <>
            <View style={styles.demoSection}>
              <Text style={styles.demoLabel}>Quick access:</Text>
              <View style={styles.demoRow}>
                {DEMO_ACCOUNTS.map((account) => (
                  <DemoChip
                    key={account.email}
                    label={account.label}
                    disabled={loading}
                    onPress={() => handleDemoLogin(account.email)}
                    styles={styles}
                  />
                ))}
              </View>
            </View>

            <View style={styles.roleSwitcherSection}>
              <Text style={styles.roleSwitcherLabel}>Quick demo access — tap a role to jump straight in:</Text>
              <View style={styles.roleCardsStack}>
                {ROLE_CARDS.map((card) => (
                  <RoleCard
                    key={card.role}
                    emoji={card.emoji}
                    label={card.label}
                    color={card.color}
                    disabled={loading}
                    onPress={() => handleRoleLogin(card.role)}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          </>
        )}
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
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: colors.secondaryText,
      textAlign: 'center',
      maxWidth: 280,
      marginTop: 8,
    },
    signInSection: {
      marginTop: 28,
      alignItems: 'flex-start',
    },
    signInTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    signInSubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 4,
    },
    inputsWrap: {
      marginTop: 24,
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
    demoSection: {
      marginTop: 32,
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
    roleSwitcherSection: {
      marginTop: 28,
    },
    roleSwitcherLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: 12,
    },
    roleCardsStack: {
      gap: 12,
    },
    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 64,
      borderRadius: 16,
      paddingHorizontal: 18,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    roleCardEmoji: {
      fontSize: 24,
    },
    roleCardLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    // Register form styles
    registerSectionLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      marginTop: 8,
    },
    registerSectionLabelText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primaryGreen,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    registerSectionLabelLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.primaryGreen,
      opacity: 0.3,
      marginLeft: 12,
    },
    registerInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      height: 56,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    registerInputWrapFocused: {
      borderColor: colors.primaryGreen,
    },
    phonePrefixBox: {
      backgroundColor: colors.white,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 4,
    },
    phonePrefixText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    phoneInput: {
      marginLeft: 8,
    },
    registerRow: {
      flexDirection: 'row',
      gap: 12,
    },
    registerHalf: {
      flex: 1,
      height: 48,
    },
    registerRoleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    registerRoleCardWrap: {
      width: '48%',
      height: 76,
      marginBottom: 12,
    },
    registerRoleCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    registerRoleCardSelected: {
      backgroundColor: colors.primaryGreen,
      borderWidth: 0,
    },
    registerRoleLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 6,
    },
    registerRoleLabelSelected: {
      color: colors.white,
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 10,
      marginBottom: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    termsText: {
      flex: 1,
      fontSize: 12,
      color: colors.secondaryText,
      lineHeight: 18,
    },
    termsLink: {
      color: colors.primaryGreen,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
  });
}

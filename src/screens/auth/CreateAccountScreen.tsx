import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList, UserRole } from '../../types';
import { register } from '../../api/authApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';

const Logo = require('../../../assets/images/agrochain_logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateAccount'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLACEHOLDER_COLOR = '#9CA3AF';

const ROLE_OPTIONS: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
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

function RoleCard({
  option,
  selected,
  scaleAnim,
  onPress,
  styles,
  colors,
}: {
  option: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap };
  selected: boolean;
  scaleAnim: Animated.Value;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  const animateOpacityTo = (toOpacity: number, duration: number) => {
    Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.roleCardWrap, { transform: [{ scale: scaleAnim }], opacity }]}>
      <Pressable
        style={[styles.roleCard, selected && styles.roleCardSelected]}
        onPress={onPress}
        onPressIn={() => animateOpacityTo(0.95, 100)}
        onPressOut={() => animateOpacityTo(1, 150)}
      >
        <Ionicons name={option.icon} size={26} color={selected ? colors.white : colors.secondaryText} />
        <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{option.label}</Text>
        {selected && <View style={styles.roleGoldBar} />}
      </Pressable>
    </Animated.View>
  );
}

function CreateAccountButton({
  loading,
  onPress,
  styles,
  colors,
}: {
  loading: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View
      style={[styles.registerButtonWrap, loading && styles.registerButtonDisabled, { transform: [{ scale }], opacity }]}
    >
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={loading}>
        <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={styles.registerButton}>
          <Text style={styles.registerButtonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
          {!loading && <Ionicons name="checkmark-circle" size={20} color={colors.white} />}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function CreateAccountScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [role, setRole] = useState<UserRole>('FARMER');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleScaleAnims = useRef(ROLE_OPTIONS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    ROLE_OPTIONS.forEach((option, index) => {
      Animated.spring(roleScaleAnims[index], {
        toValue: option.value === role ? 1.05 : 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    });
  }, [role, roleScaleAnims]);

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

  const inputWrapStyle = (field: string) => [
    styles.inputWrap,
    focusedField === field && styles.inputWrapFocused,
  ];

  const confirmHasValue = confirmPassword.length > 0;
  const passwordsMatch = confirmHasValue && password === confirmPassword;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={styles.hero}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={colors.primaryGreen} />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <Image source={Logo} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.heroTitle}>Create Account</Text>
          <Text style={styles.heroSubtitle}>Join the AgroChain community</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ErrorMessage message={error} />

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>Personal Information</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        <View style={inputWrapStyle('fullName')}>
          {focusedField === 'fullName' && <View style={styles.accentBar} />}
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

        <View style={inputWrapStyle('email')}>
          {focusedField === 'email' && <View style={styles.accentBar} />}
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

        <View style={inputWrapStyle('phone')}>
          {focusedField === 'phone' && <View style={styles.accentBar} />}
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

        <View style={inputWrapStyle('password')}>
          {focusedField === 'password' && <View style={styles.accentBar} />}
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
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <View style={inputWrapStyle('confirmPassword')}>
          {focusedField === 'confirmPassword' && <View style={styles.accentBar} />}
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
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

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>Location</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        <View style={styles.row}>
          <View style={[inputWrapStyle('region'), styles.half, styles.inputWrapShort]}>
            {focusedField === 'region' && <View style={styles.accentBar} />}
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
          <View style={[inputWrapStyle('district'), styles.half, styles.inputWrapShort]}>
            {focusedField === 'district' && <View style={styles.accentBar} />}
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

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>I am a</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((option, index) => {
            const selected = role === option.value;
            return (
              <RoleCard
                key={option.value}
                option={option}
                selected={selected}
                scaleAnim={roleScaleAnims[index]}
                onPress={() => setRole(option.value)}
                styles={styles}
                colors={colors}
              />
            );
          })}
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

        <CreateAccountButton loading={loading} onPress={handleCreateAccount} styles={styles} colors={colors} />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Login</Text>
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
      backgroundColor: colors.background,
    },
    hero: {
      height: SCREEN_HEIGHT * 0.28,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 40,
    },
    backButton: {
      position: 'absolute',
      top: 56,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    heroContent: {
      alignItems: 'center',
    },
    logoImage: {
      width: 200,
      height: 80,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.white,
      marginTop: 8,
    },
    heroSubtitle: {
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.white,
      opacity: 0.8,
      marginTop: 4,
    },
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 40,
    },
    sectionLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 0,
      marginBottom: 14,
      marginTop: 8,
    },
    sectionLabelText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primaryGreen,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    sectionLabelLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.primaryGreen,
      opacity: 0.3,
      marginLeft: 12,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      height: 56,
      paddingHorizontal: 14,
      marginBottom: 14,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 1,
    },
    inputWrapFocused: {
      borderColor: colors.primaryGreen,
    },
    inputWrapShort: {
      height: 48,
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: '20%',
      width: 3,
      height: '60%',
      borderRadius: 2,
      backgroundColor: colors.primaryGreen,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
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
    eyeButton: {
      padding: 6,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    half: {
      flex: 1,
    },
    roleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    roleCardWrap: {
      width: '48%',
      height: 84,
      marginBottom: 12,
    },
    roleCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    roleCardSelected: {
      backgroundColor: colors.primaryGreen,
      borderWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    roleLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 8,
    },
    roleLabelSelected: {
      color: colors.white,
    },
    roleGoldBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: '#FFD700',
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
    registerButtonWrap: {
      marginTop: 20,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 6,
    },
    registerButtonDisabled: {
      opacity: 0.7,
    },
    registerButton: {
      height: 58,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    registerButtonText: {
      color: colors.white,
      fontSize: 17,
      fontWeight: '700',
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    loginText: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    loginLink: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
      textDecorationLine: 'underline',
    },
  });
}

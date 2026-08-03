import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Pressable,
  Image,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList, UserRole } from '../../types';
import { register } from '../../api/authApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';
import GlassBlur from '../../components/GlassBlur';
import RolePicker from '../../components/RolePicker';

const Logo = require('../../../assets/images/agrochain_logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateAccount'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLACEHOLDER_COLOR = '#9CA3AF';

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central',
  'Eastern', 'Greater Accra', 'North East', 'Northern',
  'Oti', 'Savannah', 'Upper East', 'Upper West',
  'Volta', 'Western', 'Western North',
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
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={loading}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
      >
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
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const regionRef = useRef<View>(null);
  const districtRef = useRef<TextInput>(null);

  const clearFieldError = (field: string) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const scrollToField = (ref: React.RefObject<any>) => {
    requestAnimationFrame(() => {
      ref.current?.measure?.((_x: number, _y: number, _w: number, _h: number, _pageX: number, pageY: number) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(pageY - 150, 0), animated: true });
      });
    });
  };

  const captureLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const detectedRegion = address?.region ?? '';
      const detectedDistrict = address?.city ?? address?.district ?? '';

      if (detectedRegion) {
        setRegion(detectedRegion);
        clearFieldError('region');
      }
      if (detectedDistrict) {
        setDistrict(detectedDistrict);
        clearFieldError('district');
      }

      Alert.alert(
        'Location Detected',
        `Region: ${detectedRegion || 'Unknown'}\nDistrict: ${detectedDistrict || 'Unknown'}`
      );
    } catch (e) {
      Alert.alert('Error', 'Could not detect location. Please select manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setError(null);
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

  const validateAndSubmit = () => {
    setError(null);
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!phoneNumber.trim()) newErrors.phone = 'Phone number is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!region) newErrors.region = 'Please select your region';
    if (!district.trim()) newErrors.district = 'District/Town is required';
    if (!agreedToTerms) newErrors.terms = 'Please agree to the Terms of Service and Privacy Policy';

    setErrors(newErrors);

    const order: { key: string; ref: React.RefObject<any> }[] = [
      { key: 'fullName', ref: fullNameRef },
      { key: 'email', ref: emailRef },
      { key: 'phone', ref: phoneRef },
      { key: 'password', ref: passwordRef },
      { key: 'confirmPassword', ref: confirmPasswordRef },
      { key: 'region', ref: regionRef },
      { key: 'district', ref: districtRef },
    ];

    const firstInvalid = order.find((field) => newErrors[field.key]);
    if (firstInvalid) {
      firstInvalid.ref.current?.focus?.();
      scrollToField(firstInvalid.ref);
      return;
    }
    if (newErrors.terms) {
      return;
    }

    handleCreateAccount();
  };

  const inputWrapStyle = (field: string) => [
    styles.inputWrap,
    focusedField === field && styles.inputWrapFocused,
    errors[field] && styles.inputError,
  ];

  const confirmHasValue = confirmPassword.length > 0;
  const passwordsMatch = confirmHasValue && password === confirmPassword;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={styles.hero}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primaryGreen} />
        </Pressable>

        <View style={styles.heroContent}>
          <View style={styles.logoBadge}>
            <GlassBlur
              intensity={40}
              tint="light"
              style={StyleSheet.absoluteFillObject}
              androidFallbackColor="rgba(255,255,255,0.55)"
            />
            <Image source={Logo} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.brandText}>AgroChain</Text>
          <Text style={styles.heroTitle}>Create Account</Text>
          <Text style={styles.heroSubtitle}>Join the AgroChain community</Text>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
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
            ref={fullNameRef}
            style={styles.input}
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              clearFieldError('fullName');
            }}
            placeholder="e.g. Kwame Asante"
            placeholderTextColor={PLACEHOLDER_COLOR}
            onFocus={() => setFocusedField('fullName')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}

        <View style={inputWrapStyle('email')}>
          {focusedField === 'email' && <View style={styles.accentBar} />}
          <Ionicons name="mail-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
          <TextInput
            ref={emailRef}
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearFieldError('email');
            }}
            placeholder="e.g. kwame@gmail.com"
            placeholderTextColor={PLACEHOLDER_COLOR}
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

        <View style={inputWrapStyle('phone')}>
          {focusedField === 'phone' && <View style={styles.accentBar} />}
          <Ionicons name="call-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
          <View style={styles.phonePrefixBox}>
            <Text style={styles.phonePrefixText}>+233</Text>
          </View>
          <TextInput
            ref={phoneRef}
            style={[styles.input, styles.phoneInput]}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              clearFieldError('phone');
            }}
            placeholder="e.g. 0244000001"
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType="phone-pad"
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

        <View style={inputWrapStyle('password')}>
          {focusedField === 'password' && <View style={styles.accentBar} />}
          <Ionicons name="lock-closed-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
          <TextInput
            ref={passwordRef}
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError('password');
            }}
            placeholder="Enter your password"
            placeholderTextColor={PLACEHOLDER_COLOR}
            secureTextEntry={!showPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={({ pressed }) => [styles.eyeButton, pressed && { opacity: 0.6 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color={colors.secondaryText}
            />
          </Pressable>
        </View>
        {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

        <View style={inputWrapStyle('confirmPassword')}>
          {focusedField === 'confirmPassword' && <View style={styles.accentBar} />}
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
          <TextInput
            ref={confirmPasswordRef}
            style={styles.input}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearFieldError('confirmPassword');
            }}
            placeholder="Confirm your password"
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
        {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>Location</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        <Pressable
          onPress={captureLocation}
          disabled={locationLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [styles.locationButton, pressed && { opacity: 0.8 }]}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.primaryGreen} />
          ) : (
            <>
              <Ionicons name="location-outline" size={18} color={colors.primaryGreen} />
              <Text style={styles.locationButtonText}>Use My Location</Text>
            </>
          )}
        </Pressable>

        <View style={styles.row}>
          <View style={styles.half}>
            <Pressable
              ref={regionRef}
              onPress={() => setShowRegionPicker(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                inputWrapStyle('region'),
                styles.inputWrapShort,
                pressed && { opacity: 0.8 },
              ]}
            >
              {focusedField === 'region' && <View style={styles.accentBar} />}
              <Ionicons name="map-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
              <Text style={[styles.input, { color: region ? colors.text : PLACEHOLDER_COLOR }]} numberOfLines={1}>
                {region || 'Select your region'}
              </Text>
              <Ionicons name="chevron-down-outline" size={18} color={colors.secondaryText} />
            </Pressable>
            {errors.region ? <Text style={styles.fieldError}>{errors.region}</Text> : null}
          </View>
          <View style={styles.half}>
            <View style={[inputWrapStyle('district'), styles.inputWrapShort]}>
              {focusedField === 'district' && <View style={styles.accentBar} />}
              <Ionicons name="map-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
              <TextInput
                ref={districtRef}
                style={styles.input}
                value={district}
                onChangeText={(text) => {
                  setDistrict(text);
                  clearFieldError('district');
                }}
                placeholder="e.g. Kumasi"
                placeholderTextColor={PLACEHOLDER_COLOR}
                onFocus={() => setFocusedField('district')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.district ? <Text style={styles.fieldError}>{errors.district}</Text> : null}
          </View>
        </View>

        <Modal visible={showRegionPicker} transparent animationType="slide" onRequestClose={() => setShowRegionPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Region</Text>
              <FlatList
                data={GHANA_REGIONS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setRegion(item);
                      clearFieldError('region');
                      setShowRegionPicker(false);
                    }}
                    style={({ pressed }) => [styles.regionItem, pressed && { opacity: 0.7 }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.regionText}>{item}</Text>
                    {region === item && (
                      <Ionicons name="checkmark" size={20} color={colors.primaryGreen} />
                    )}
                  </Pressable>
                )}
              />
              <Pressable
                onPress={() => setShowRegionPicker(false)}
                style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ color: colors.errorRed, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>I am a</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        <RolePicker value={role} onChange={setRole} colors={colors} />

        <Pressable
          style={({ pressed }) => [styles.termsRow, pressed && { opacity: 0.8 }]}
          onPress={() => {
            setAgreedToTerms((prev) => !prev);
            clearFieldError('terms');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {errors.terms ? <Text style={styles.fieldError}>{errors.terms}</Text> : null}

        <CreateAccountButton loading={loading} onPress={validateAndSubmit} styles={styles} colors={colors} />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.loginLink}>Login</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
      paddingTop: 20,
      paddingBottom: 40,
    },
    backButton: {
      position: 'absolute',
      top: 16,
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
      marginTop: 12,
    },
    logoBadge: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
    logoImage: {
      width: 78,
      height: 78,
    },
    brandText: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFD700',
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
    inputError: {
      borderColor: colors.errorRed,
    },
    fieldError: {
      color: colors.errorRed,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 8,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
      backgroundColor: colors.lightGreen,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 14,
    },
    locationButtonText: {
      color: colors.primaryGreen,
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
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
      height: 56,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    registerButtonText: {
      color: colors.white,
      fontSize: 18,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      maxHeight: SCREEN_HEIGHT * 0.65,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    regionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    regionText: {
      fontSize: 15,
      color: colors.text,
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 8,
    },
  });
}

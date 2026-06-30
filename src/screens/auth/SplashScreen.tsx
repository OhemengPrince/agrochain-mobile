import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList } from '../../types';
import { getHasSeenOnboarding } from '../../utils/storage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { width, height } = Dimensions.get('window');
const SPLASH_DURATION_MS = 3400;

const LOGO_SIZE = 128;
const OUTER_RING = 180;
const INNER_RING = 156;
const GLOW_RING = 200;
const CONTAINER = 216;

interface BgIcon {
  name: IoniconName;
  top: number;
  left: number;
  size: number;
  rotation: number;
}

const BG_ICONS: BgIcon[] = [
  { name: 'leaf-outline',         top: 0.09, left: 0.06, size: 56, rotation: -25 },
  { name: 'flower-outline',       top: 0.15, left: 0.73, size: 48, rotation:  20 },
  { name: 'water-outline',        top: 0.30, left: 0.11, size: 42, rotation:   0 },
  { name: 'sunny-outline',        top: 0.27, left: 0.70, size: 62, rotation:  30 },
  { name: 'basket-outline',       top: 0.61, left: 0.07, size: 46, rotation: -15 },
  { name: 'trending-up-outline',  top: 0.67, left: 0.74, size: 44, rotation:   8 },
  { name: 'cloud-outline',        top: 0.80, left: 0.24, size: 54, rotation:   0 },
  { name: 'nutrition-outline',    top: 0.87, left: 0.70, size: 46, rotation:  18 },
];

export default function SplashScreen({ navigation }: Props) {
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.35)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(36)).current;
  const textFade    = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entry: spring scale + fade
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 48,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 680,
        useNativeDriver: true,
      }),
    ]).start();

    // Text appears shortly after logo
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textFade, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }),
      ]).start();
    }, 460);

    // Continuous ring spin
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Subtle logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Navigate after splash
    let cancelled = false;
    const navTimer = setTimeout(async () => {
      const hasSeenOnboarding = await getHasSeenOnboarding();
      if (cancelled) return;
      navigation.replace(hasSeenOnboarding ? 'Login' : 'Onboarding');
    }, SPLASH_DURATION_MS);

    return () => {
      cancelled = true;
      clearTimeout(textTimer);
      clearTimeout(navTimer);
    };
  }, [navigation]);

  const spinCW  = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  const spinCCW = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg']   });

  const C  = CONTAINER;
  const OR = OUTER_RING;
  const IR = INNER_RING;
  const GR = GLOW_RING;

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

      {/* Crystalline gradient background */}
      <LinearGradient
        colors={['#FFFFFF', '#F0F9F3', '#E4F5EB', '#FAFFFE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
      {/* Shimmer glass overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.0)', 'rgba(255,255,255,0.70)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        pointerEvents="none"
      />

      {/* Floating background agro icons */}
      {BG_ICONS.map((icon, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bgIcon,
            {
              top:  icon.top  * height,
              left: icon.left * width,
              opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.11] }),
              transform: [{ rotate: `${icon.rotation}deg` }],
            },
          ]}
        >
          <Ionicons name={icon.name} size={icon.size} color="#1A6B2E" />
        </Animated.View>
      ))}

      {/* Center content */}
      <View style={styles.center}>

        {/* Soft ambient glow behind rings */}
        <Animated.View
          style={[
            styles.ambientGlow,
            { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
          ]}
        />

        {/* Logo + spinning rings */}
        <Animated.View
          style={[
            styles.logoContainer,
            { width: C, height: C },
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Static halo ring */}
          <View
            style={[
              styles.ring,
              {
                width: GR, height: GR, borderRadius: GR / 2,
                top: (C - GR) / 2, left: (C - GR) / 2,
                borderWidth: 1.5,
                borderColor: 'rgba(26,107,46,0.20)',
              },
            ]}
          />

          {/* Outer arc — spins clockwise (3/4 ring, gap on left) */}
          <Animated.View
            style={[
              styles.ring,
              {
                width: OR, height: OR, borderRadius: OR / 2,
                top: (C - OR) / 2, left: (C - OR) / 2,
                borderWidth: 4,
                borderTopColor:    '#1A6B2E',
                borderRightColor:  '#1A6B2E',
                borderBottomColor: '#1A6B2E',
                borderLeftColor:   'transparent',
                transform: [{ rotate: spinCW }],
              },
            ]}
          />

          {/* Inner arc — spins counter-clockwise (3/4 ring, gap on top) */}
          <Animated.View
            style={[
              styles.ring,
              {
                width: IR, height: IR, borderRadius: IR / 2,
                top: (C - IR) / 2, left: (C - IR) / 2,
                borderWidth: 3,
                borderTopColor:    'transparent',
                borderRightColor:  '#7ED957',
                borderBottomColor: '#7ED957',
                borderLeftColor:   '#7ED957',
                transform: [{ rotate: spinCCW }],
              },
            ]}
          />

          {/* Logo circle */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={['#3AA55C', '#1A6B2E', '#062B14']}
              style={styles.logoCircle}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
            >
              {/* Crystalline shine on the logo disc */}
              <LinearGradient
                colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.00)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 0.55 }}
                pointerEvents="none"
              />
              <Text style={styles.logoLetter}>A</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* App name + tagline */}
        <Animated.View
          style={[
            styles.textWrap,
            {
              opacity: textFade,
              transform: [{ translateY: textSlide }],
            },
          ]}
        >
          <Text style={styles.appName}>AgroChain</Text>
          <Text style={styles.tagline}>From Farm to Market, Tracked.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bgIcon: {
    position: 'absolute',
  },
  ambientGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(26,107,46,0.05)',
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#062B14',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 14,
  },
  logoLetter: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  textWrap: {
    marginTop: 34,
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F4C24',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(26,107,46,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#4A7C59',
    marginTop: 8,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});

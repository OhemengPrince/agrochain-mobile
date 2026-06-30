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
const SPLASH_DURATION_MS = 4000;

// Layout constants
const LOGO_SIZE  = 148;   // static A disc — large & centred
const RING_DIAM  = 216;   // spinning ring diameter  (wider than logo)
const RING_R     = RING_DIAM / 2;
const CONTAINER  = RING_DIAM + 28; // 244 — room for shadow/glow bleed

interface BgIcon {
  name: IoniconName;
  top: number;
  left: number;
  size: number;
  rotation: number;
}

const BG_ICONS: BgIcon[] = [
  { name: 'leaf-outline',        top: 0.09, left: 0.06, size: 56, rotation: -25 },
  { name: 'flower-outline',      top: 0.15, left: 0.73, size: 48, rotation:  20 },
  { name: 'water-outline',       top: 0.30, left: 0.11, size: 42, rotation:   0 },
  { name: 'sunny-outline',       top: 0.27, left: 0.70, size: 62, rotation:  30 },
  { name: 'basket-outline',      top: 0.61, left: 0.07, size: 46, rotation: -15 },
  { name: 'trending-up-outline', top: 0.67, left: 0.74, size: 44, rotation:   8 },
  { name: 'cloud-outline',       top: 0.80, left: 0.24, size: 54, rotation:   0 },
  { name: 'nutrition-outline',   top: 0.87, left: 0.70, size: 46, rotation:  18 },
];

export default function SplashScreen({ navigation }: Props) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.35)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(36)).current;
  const textFade  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entry: spring pop + fade
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 46,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Text slides up shortly after logo appears
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
    }, 480);

    // Continuous clockwise ring spin
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Subtle A pulse so it feels alive
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
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

  const spinCW = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Centring helpers
  const ringOffset = (CONTAINER - RING_DIAM) / 2;  // 14
  const logoOffset = (CONTAINER - LOGO_SIZE) / 2;  // 48

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
      {/* Glass shimmer overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.00)', 'rgba(255,255,255,0.72)']}
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

      {/* Centre content */}
      <View style={styles.center}>

        {/* Ambient glow blob */}
        <Animated.View style={[styles.ambientGlow, { opacity: fadeAnim }]} />

        {/* Logo + spinning ring */}
        <Animated.View
          style={{
            width: CONTAINER,
            height: CONTAINER,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* ── Thin background halo (always visible, static) ── */}
          <View
            style={[
              styles.haloRing,
              {
                width: RING_DIAM + 14,
                height: RING_DIAM + 14,
                borderRadius: (RING_DIAM + 14) / 2,
                top:  ringOffset - 7,
                left: ringOffset - 7,
              },
            ]}
          />

          {/* ── Spinning ring — thick, 3/4 coloured, 1/4 gap ── */}
          <Animated.View
            style={[
              styles.spinRing,
              {
                width: RING_DIAM,
                height: RING_DIAM,
                borderRadius: RING_R,
                top:  ringOffset,
                left: ringOffset,
                transform: [{ rotate: spinCW }],
              },
            ]}
          />

          {/* ── Static A logo — perfectly centred ── */}
          <Animated.View
            style={{
              position: 'absolute',
              top:  logoOffset,
              left: logoOffset,
              transform: [{ scale: pulseAnim }],
            }}
          >
            <LinearGradient
              colors={['#3AA55C', '#1A6B2E', '#062B14']}
              style={styles.logoCircle}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
            >
              {/* Crystalline shine on disc */}
              <LinearGradient
                colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.00)']}
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
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(26,107,46,0.05)',
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 90,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(26,107,46,0.14)',
  },
  spinRing: {
    position: 'absolute',
    borderWidth: 6,
    borderTopColor:    '#1A6B2E',
    borderRightColor:  '#1A6B2E',
    borderBottomColor: '#1A6B2E',
    borderLeftColor:   'transparent',
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
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
    fontSize: 62,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  textWrap: {
    marginTop: 36,
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

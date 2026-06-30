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

// ─── Geometry ───────────────────────────────────────────────────────────────
//  The A disc is large (fills the ring like the reference "H").
//  ORBIT_R is small so the disc appears centred but still traces a circle.
//
//  Safety check:
//    A outer edge at max = ORBIT_R + LOGO_SIZE/2 = 28 + 84 = 112
//    Ring inner edge     = RING_R  - BORDER_W   = 124 - 6  = 118   ← 6 px clearance ✓
const RING_DIAM  = 248;
const RING_R     = RING_DIAM / 2;   // 124
const BORDER_W   = 6;
const LOGO_SIZE  = 168;             // large — closely matches the reference image
const ORBIT_R    = 28;              // small orbit so it looks centred while moving
const CONTAINER  = RING_DIAM + 24; // 272

// ─── Background icons ────────────────────────────────────────────────────────
interface BgIcon { name: IoniconName; top: number; left: number; size: number; rotation: number }
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
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.35)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(36)).current;
  const textFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry: spring pop + fade
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 46, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
    ]).start();

    // Text slides up after logo is visible
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textSlide, {
          toValue: 0, duration: 560,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(textFade, {
          toValue: 1, duration: 560, useNativeDriver: true,
        }),
      ]).start();
    }, 480);

    // Continuous clockwise orbit of the A disc
    Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1, duration: 2400,
        easing: Easing.linear, useNativeDriver: true,
      })
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

  // Arm spins clockwise; disc counter-rotates so "A" stays upright
  const armSpin  = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  const discSpin = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg']   });

  // Layout offsets
  const ringOffset = (CONTAINER - RING_DIAM) / 2;   // 12
  const armAnchor  = CONTAINER / 2;                 // 136
  const pivotLeft  = ORBIT_R - LOGO_SIZE / 2;       // 28 - 84 = -56
  const pivotTop   = -(LOGO_SIZE / 2);              // -84

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

      {/* Crystalline background */}
      <LinearGradient
        colors={['#FFFFFF', '#F0F9F3', '#E4F5EB', '#FAFFFE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
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

      <View style={styles.center}>
        {/* Soft ambient glow */}
        <Animated.View style={[styles.ambientGlow, { opacity: fadeAnim }]} />

        {/* Logo zone — entry animation wrapper */}
        <Animated.View
          style={{
            width: CONTAINER,
            height: CONTAINER,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* ── STATIC RING ── */}
          <View
            style={[
              styles.staticRing,
              {
                width:        RING_DIAM,
                height:       RING_DIAM,
                borderRadius: RING_R,
                borderWidth:  BORDER_W,
                top:          ringOffset,
                left:         ringOffset,
              },
            ]}
          />

          {/* ── ORBIT ARM — zero-size pivot at ring centre ── */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              top:  armAnchor,
              left: armAnchor,
              transform: [{ rotate: armSpin }],
            }}
          >
            {/* A disc — offset by ORBIT_R from pivot, counter-rotated to stay upright */}
            <Animated.View
              style={{
                position: 'absolute',
                width:  LOGO_SIZE,
                height: LOGO_SIZE,
                left: pivotLeft,
                top:  pivotTop,
                transform: [{ rotate: discSpin }],
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
        </Animated.View>

        {/* App name + tagline */}
        <Animated.View
          style={[
            styles.textWrap,
            { opacity: textFade, transform: [{ translateY: textSlide }] },
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
  staticRing: {
    position: 'absolute',
    borderColor: '#1A6B2E',
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#062B14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 14,
  },
  logoLetter: {
    fontSize: 70,
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

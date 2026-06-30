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

// Orbit geometry
const RING_RADIUS   = 95;                         // radius of the static circle track
const LOGO_SIZE     = 80;                         // diameter of the orbiting A disc
const RING_DIAM     = RING_RADIUS * 2;            // 190
const CONTAINER     = RING_DIAM + LOGO_SIZE + 24; // 294 — enough room for A at full orbit

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
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.35)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(36)).current;
  const textFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry: spring scale + fade in
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

    // Text slides up after logo appears
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

    // Continuous A orbit — clockwise, linear
    Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
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

  // Clockwise orbit for the arm
  const spinCW  = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  // Counter-clockwise on the A disc itself so the letter stays upright
  const spinCCW = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg']   });

  // Pivot offsets: place A centre at (RING_RADIUS, 0) relative to arm centre
  const pivotLeft = RING_RADIUS - LOGO_SIZE / 2; // 95 - 40 = 55
  const pivotTop  = -(LOGO_SIZE / 2);            // -40

  // Static ring offset inside CONTAINER
  const ringOffset = (CONTAINER - RING_DIAM) / 2; // (294 - 190) / 2 = 52
  // Arm anchor is at container centre
  const armAnchor  = CONTAINER / 2;               // 147

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
      {/* Shimmer glass layer */}
      <LinearGradient
        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.00)', 'rgba(255,255,255,0.70)']}
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

        {/* Soft ambient glow behind the ring */}
        <Animated.View
          style={[styles.ambientGlow, { opacity: fadeAnim }]}
        />

        {/* Orbit area: static ring + moving A */}
        <Animated.View
          style={[
            {
              width: CONTAINER,
              height: CONTAINER,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* ── Static circular track ── */}
          <View
            style={[
              styles.staticRing,
              {
                width:  RING_DIAM,
                height: RING_DIAM,
                borderRadius: RING_RADIUS,
                top:  ringOffset,
                left: ringOffset,
              },
            ]}
          />

          {/* ── Zero-size arm pivot, anchored at container centre ── */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              top:  armAnchor,
              left: armAnchor,
              transform: [{ rotate: spinCW }],
            }}
          >
            {/* A disc positioned at orbit radius, counter-rotated to stay upright */}
            <Animated.View
              style={{
                position: 'absolute',
                width:  LOGO_SIZE,
                height: LOGO_SIZE,
                left: pivotLeft,
                top:  pivotTop,
                transform: [{ rotate: spinCCW }],
              }}
            >
              <LinearGradient
                colors={['#3AA55C', '#1A6B2E', '#062B14']}
                style={styles.logoCircle}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
              >
                {/* Crystalline shine */}
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
    shadowOpacity: 0.20,
    shadowRadius: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(26,107,46,0.30)',
    // subtle inner glow via shadow
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
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
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 14,
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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

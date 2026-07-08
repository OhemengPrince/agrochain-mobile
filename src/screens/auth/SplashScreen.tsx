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

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { width, height } = Dimensions.get('window');
const SPLASH_DURATION_MS = 4000;

// ─── Geometry ─────────────────────────────────────────────────────────────────
//  Ring inner radius = 122 − 6 = 116
//  Logo radius       = 196 / 2 = 98
//  Equal gap         = 116 − 98 = 18 px on every side ✓
const RING_DIAM = 244;
const RING_R    = RING_DIAM / 2;   // 122
const BORDER_W  = 6;
const LOGO_SIZE = 196;
const CONTAINER = RING_DIAM + 28;  // 272

// ─── Background icons ─────────────────────────────────────────────────────────
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
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const spinA      = useRef(new Animated.Value(0)).current; // A disc spins on own axis
  const spinRing   = useRef(new Animated.Value(0)).current; // ring sweeps around
  const textSlide  = useRef(new Animated.Value(36)).current;
  const textFade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── 1. Logo pops in ───────────────────────────────────────────────────────
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 46, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
    ]).start();

    // ── 2. Text slides up shortly after ───────────────────────────────────────
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

    // ── 3. A disc: slow clockwise rotation ────────────────────────────────────
    Animated.loop(
      Animated.timing(spinA, {
        toValue: 1, duration: 3200,
        easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    // ── 4. Ring: faster counter-clockwise sweep (gap visible due to 3/4 border)
    Animated.loop(
      Animated.timing(spinRing, {
        toValue: 1, duration: 1600,
        easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    let cancelled = false;
    const navTimer = setTimeout(() => {
      if (cancelled) return;
      navigation.replace('Onboarding');
    }, SPLASH_DURATION_MS);

    return () => {
      cancelled = true;
      clearTimeout(textTimer);
      clearTimeout(navTimer);
    };
  }, [navigation]);

  // A rotates clockwise; ring sweeps counter-clockwise for contrast
  const rotateA    = spinA.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  const rotateRing = spinRing.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  const ringOffset = (CONTAINER - RING_DIAM) / 2;   // 14
  const logoOffset = (CONTAINER - LOGO_SIZE) / 2;   // 38

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
        {/* Ambient glow */}
        <Animated.View style={[styles.ambientGlow, { opacity: fadeAnim }]} />

        {/* ── Entry spring wrapper ── */}
        <Animated.View
          style={{
            width: CONTAINER,
            height: CONTAINER,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* ── RING — 3/4 coloured border, sweeps counter-clockwise ── */}
          <Animated.View
            style={[
              styles.ring,
              {
                width:        RING_DIAM,
                height:       RING_DIAM,
                borderRadius: RING_R,
                borderWidth:  BORDER_W,
                top:          ringOffset,
                left:         ringOffset,
                transform:    [{ rotate: rotateRing }],
              },
            ]}
          />

          {/* ── A DISC — centred, rotates clockwise on own axis ── */}
          <Animated.View
            style={{
              position: 'absolute',
              top:  logoOffset,
              left: logoOffset,
              transform: [{ rotate: rotateA }],
            }}
          >
            <LinearGradient
              colors={['#3AA55C', '#1A6B2E', '#062B14']}
              style={styles.logoCircle}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
            >
              {/* Crystalline shine — stays fixed in the gradient so it sweeps as A spins */}
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
  ring: {
    position: 'absolute',
    // 3/4 ring — gap on the left makes the sweep visible
    borderTopColor:    '#1A6B2E',
    borderRightColor:  '#1A6B2E',
    borderBottomColor: '#1A6B2E',
    borderLeftColor:   'transparent',
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 4,
  },
  logoCircle: {
    width:        LOGO_SIZE,
    height:       LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems:   'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#062B14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 14,
  },
  logoLetter: {
    fontSize:   82,
    fontWeight: '900',
    color:      '#FFFFFF',
    letterSpacing: -1,
    textShadowColor:  'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  textWrap: {
    marginTop:  36,
    alignItems: 'center',
  },
  appName: {
    fontSize:   32,
    fontWeight: '800',
    color:      '#0F4C24',
    letterSpacing: -0.5,
    textShadowColor:  'rgba(26,107,46,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize:      14,
    color:         '#4A7C59',
    marginTop:     8,
    fontStyle:     'italic',
    letterSpacing: 0.3,
  },
});

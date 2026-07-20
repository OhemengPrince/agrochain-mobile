import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Image,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AUTO_SWIPE_INTERVAL_MS = 4000;

const Logo = require('../../../assets/images/agrochain_logo.png');

interface Slide {
  image: any;
  titleColor: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    image: require('../../../assets/images/onboarding-hero.jpg'),
    titleColor: '#FFD700',
    title: 'Grow More. Earn More.',
    description:
      'Rent equipment, trace your harvest and connect with buyers — all in one app built for Ghanaian farmers.',
  },
  {
    image: require('../../../assets/images/onboarding2.jpg'),
    titleColor: '#FFFFFF',
    title: 'Rent Any Farm Equipment',
    description: 'Find tractors, harvesters and irrigation systems near you in minutes.',
  },
  {
    image: require('../../../assets/images/onboarding3.jpg'),
    titleColor: '#FFFFFF',
    title: 'Sell Direct to Buyers',
    description: 'Connect with verified agri-buyers across Ghana and get the best price for your produce.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const isTouchingRef = useRef(false);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isTouchingRef.current) return;
      const next = (activeIndexRef.current + 1) % SLIDES.length;
      listRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
      setActiveIndex(next);
    }, AUTO_SWIPE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const activeSlide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onTouchStart={() => {
          isTouchingRef.current = true;
        }}
        onTouchEnd={() => {
          isTouchingRef.current = false;
        }}
        renderItem={({ item }) => (
          <ImageBackground source={item.image} style={styles.slide} resizeMode="cover">
            <LinearGradient
              colors={['transparent', 'rgba(10,50,20,0.92)']}
              locations={[0, 0.85]}
              style={styles.overlay}
            />
            <View style={styles.slideContent}>
              <Text style={[styles.title, { color: item.titleColor }]}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </ImageBackground>
        )}
      />

      <View style={styles.topSection} pointerEvents="none">
        <View style={styles.logoBadge}>
          <Image source={Logo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={[styles.tagline, { color: activeSlide.titleColor }]}>From Field to Market</Text>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={async () => {
              navigation.replace('Login');
            }}
          >
            <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={async () => {
              navigation.replace('Login');
            }}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A3214',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 260,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: '#FFFFFF',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    alignItems: 'center',
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: 90,
    height: 60,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.9,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    opacity: 1,
  },
  actions: {
    width: '100%',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

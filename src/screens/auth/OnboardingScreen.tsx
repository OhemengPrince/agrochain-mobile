import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 32;
const SLIDE_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;

interface Slide {
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    title: 'Grow More. Earn More.',
    description:
      'Rent equipment, trace your harvest and connect with buyers — all in one app built for Ghanaian farmers.',
  },
  {
    title: 'Rent Any Farm Equipment',
    description:
      'Find tractors, harvesters and irrigation pumps near you, ready to book in just a few taps.',
  },
  {
    title: 'Sell Direct to Buyers',
    description:
      'Connect with verified agri-buyers across Ghana and get the best price for every harvest.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../../assets/images/onboarding-hero.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(10,50,20,0.92)']}
          locations={[0, 0.5, 1]}
          style={styles.overlay}
        />

        <View style={styles.topSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🌾</Text>
          </View>
          <Text style={styles.logoText}>AgroChain</Text>
          <Text style={styles.tagline}>From Field to Market</Text>
        </View>

        <View style={styles.bottomCard}>
          <FlatList
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.title}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            style={styles.slideList}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}
          />

          <View style={styles.dotsRow}>
            {SLIDES.map((_, index) => (
              <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Register')}>
              <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A3214',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    marginTop: 40,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 26,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#FFD700',
    opacity: 0.85,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: CARD_PADDING,
    justifyContent: 'space-between',
  },
  slideList: {
    flexGrow: 0,
  },
  slide: {
    width: SLIDE_WIDTH,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: '#FFFFFF',
    opacity: 0.75,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

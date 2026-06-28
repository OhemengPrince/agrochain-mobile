import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GeneralStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import MarketNewsFeed from '../../components/MarketNewsFeed';

type Props = NativeStackScreenProps<GeneralStackParamList, 'GeneralHomeMain'>;

const QUICK_ACCESS: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
}[] = [
  { key: 'marketplace', label: 'Marketplace', icon: 'storefront', gradient: ['#6A1B9A', '#4A148C'] },
  { key: 'list', label: 'List an Item', icon: 'add-circle', gradient: ['#1A6B2E', '#2E8B4A'] },
  { key: 'browse', label: 'Browse Equipment', icon: 'construct', gradient: ['#1565C0', '#0D47A1'] },
  { key: 'myListings', label: 'My Listings', icon: 'list', gradient: ['#FF8F00', '#E65100'] },
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

function QuickAccessButton({
  label,
  icon,
  gradient,
  onPress,
  styles,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Animated.View style={[styles.quickActionWrap, { transform: [{ scale }], opacity }]}>
      <Pressable style={styles.quickActionButton} onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient colors={gradient} style={styles.quickActionIconWrap}>
          <Ionicons name={icon} size={22} color={colors.white} />
        </LinearGradient>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function GeneralHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const locationLabel = user?.district && user?.region ? `${user.district}, ${user.region}` : 'Ghana';

  const goToMarketplace = (searchQuery?: string) => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralMarket', { screen: 'MarketplaceList', params: { query: searchQuery } });
  };

  const goToMyListings = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralMarket', { screen: 'MyMarketplaceListings' });
  };

  const goToList = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralList', { screen: 'CreateListing' });
  };

  const goToBrowse = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralBrowse');
  };

  const handleQuickAccess = (key: string) => {
    if (key === 'marketplace') {
      goToMarketplace();
    } else if (key === 'list') {
      goToList();
    } else if (key === 'browse') {
      goToBrowse();
    } else if (key === 'myListings') {
      goToMyListings();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient colors={['#6A1B9A', '#8E24AA']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.greeting}>Welcome, {firstName} 👋</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText}> {locationLabel}</Text>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => goToMarketplace(query)}
              placeholder="Search the marketplace..."
              placeholderTextColor={colors.secondaryText}
              returnKeyType="search"
            />
          </View>
        </LinearGradient>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActionsRow}>
            {QUICK_ACCESS.map((action) => (
              <QuickAccessButton
                key={action.key}
                label={action.label}
                icon={action.icon}
                gradient={action.gradient}
                onPress={() => handleQuickAccess(action.key)}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <MarketNewsFeed />
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
    header: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 36,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.white,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    locationText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: 12,
      height: 46,
      paddingHorizontal: 14,
      marginTop: 16,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    quickActionsSection: {
      backgroundColor: colors.card,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: 16,
      ...cardShadow,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    quickActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    quickActionWrap: {
      width: '23%',
    },
    quickActionButton: {
      height: 85,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    quickActionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      marginTop: 6,
      textAlign: 'center',
    },
  });
}

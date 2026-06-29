import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MarketplaceStackParamList,
  MarketplaceListing,
  MarketplaceCategory,
} from '../../types';
import { getMarketplaceListings } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatCurrency, formatDate, getCropEmoji } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MarketplaceList'>;

const CATEGORIES: { label: string; value: MarketplaceCategory | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Produce', value: 'PRODUCE' },
  { label: 'Equipment', value: 'EQUIPMENT' },
  { label: 'Seeds', value: 'SEEDS' },
  { label: 'Tools', value: 'TOOLS' },
  { label: 'Other', value: 'OTHER' },
];

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  PRODUCE: 'PRODUCE',
  EQUIPMENT: 'EQUIPMENT',
  SEEDS: 'SEEDS',
  TOOLS: 'TOOLS',
  OTHER: 'OTHER',
};

const CATEGORY_ICONS: Record<Exclude<MarketplaceCategory, 'PRODUCE'>, keyof typeof Ionicons.glyphMap> = {
  EQUIPMENT: 'construct-outline',
  SEEDS: 'leaf-outline',
  TOOLS: 'hammer-outline',
  OTHER: 'cube-outline',
};

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
  };
}

function ListingPlaceholder({
  listing,
  colors,
  styles,
}: {
  listing: MarketplaceListing;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  if (listing.category === 'PRODUCE') {
    return (
      <View style={[styles.placeholderCircle, { backgroundColor: colors.lightGreen }]}>
        <Text style={styles.placeholderEmoji}>{getCropEmoji(listing.name)}</Text>
      </View>
    );
  }
  const icon = CATEGORY_ICONS[listing.category];
  return (
    <View style={[styles.placeholderCircle, { backgroundColor: colors.lightGreen }]}>
      <Ionicons name={icon} size={32} color={colors.primaryGreen} />
    </View>
  );
}

function priceSuffix(listing: MarketplaceListing): string {
  if (listing.priceType === 'PER_DAY') return '/day';
  if (listing.priceType === 'NEGOTIABLE') return ' · Negotiable';
  return '';
}

function ListingCard({
  item,
  onPress,
  onContact,
  colors,
  styles,
}: {
  item: MarketplaceListing;
  onPress: () => void;
  onContact: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}>
      <Pressable style={styles.card} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.imageWrap}>
          <ListingPlaceholder listing={item} colors={colors} styles={styles} />

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[item.category]}</Text>
          </View>

          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>
              {formatCurrency(item.price)}
              {priceSuffix(item)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

          <View style={styles.sellerRow}>
            <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.locationText} numberOfLines={1}>{item.district}, {item.region}</Text>
          </View>

          <Text style={styles.dateText}>Posted {formatDate(item.createdAt)}</Text>

          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={onPress} style={styles.viewDetailsRow}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primaryGreen} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={onContact}>
              <Text style={styles.contactButtonText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function HeaderAddButton({ onPress }: { onPress: () => void }) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [headerButtonStyles.button, pressed && headerButtonStyles.buttonPressed]}
      >
        <Ionicons name="add" size={24} color="#1A6B2E" />
      </Pressable>
    </Animated.View>
  );
}

const headerButtonStyles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

function ListItemBanner({ onPress, styles }: { onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={styles.bannerCard}>
          <Ionicons name="add-circle" size={32} color="#FFFFFF" />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>List Your Item</Text>
            <Text style={styles.bannerSubtitle}>Sell or rent anything agric-related</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function MarketplaceScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    setError(null);
    try {
      const data = await getMarketplaceListings();
      setListings(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load marketplace listings.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadListings();
      setLoading(false);
    })();
  }, [loadListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const handleFilterPress = () => {
    Alert.alert('Filters', 'Advanced filtering is coming soon. Use the category chips for now.');
  };

  const handleContact = (listing: MarketplaceListing) => {
    Alert.alert('Coming soon', 'In-app messaging is not available yet.');
  };

  if (loading) {
    return <LoadingOverlay message="Loading marketplace..." />;
  }

  const filtered = listings.filter((listing) => {
    if (category && listing.category !== category) return false;
    if (query && !listing.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>AgroChain Marketplace</Text>
          <HeaderAddButton onPress={() => navigation.navigate('CreateListing')} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search listings..."
              placeholderTextColor={colors.secondaryText}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.bannerWrap}>
        <ListItemBanner onPress={() => navigation.navigate('CreateListing')} styles={styles} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsList}
        style={styles.chipsRow}
      >
        {CATEGORIES.map((item) => {
          const active = item.value === category;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategory(item.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ErrorMessage message={error} />

      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            onPress={() => navigation.navigate('MarketplaceListingDetail', { listingId: item.id })}
            onContact={() => handleContact(item)}
            colors={colors}
            styles={styles}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.emptyTitle}>No listings found</Text>
            <Text style={styles.emptyText}>Try a different search or category.</Text>
          </View>
        }
      />
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
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingBottom: 16,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.white,
      flexShrink: 1,
      marginRight: 12,
    },
    bannerWrap: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    bannerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    bannerTextWrap: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    bannerSubtitle: {
      fontSize: 12,
      color: '#FFFFFF',
      opacity: 0.8,
      marginTop: 2,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: 16,
      height: 48,
      paddingHorizontal: 14,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipsRow: {
      flexGrow: 0,
    },
    chipsList: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 26,
      alignItems: 'flex-start',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: 18,
      height: 40,
      borderRadius: 25,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      marginRight: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    chipActive: {
      backgroundColor: '#1A6B2E',
      borderColor: '#1A6B2E',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6B7280',
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    list: {
      paddingTop: 16,
      paddingBottom: 120,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    imageWrap: {
      position: 'relative',
      height: 160,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    placeholderCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderEmoji: {
      fontSize: 36,
    },
    categoryBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: colors.accentAmber,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    priceBadge: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    priceBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    body: {
      padding: 14,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    sellerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    sellerName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
      flexShrink: 1,
    },
    dot: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    locationText: {
      fontSize: 13,
      color: colors.secondaryText,
      flexShrink: 1,
    },
    dateText: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
    },
    viewDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewDetailsText: {
      fontSize: 13,
      color: colors.primaryGreen,
      textDecorationLine: 'underline',
    },
    contactButton: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    contactButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.white,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 80,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    emptyText: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
      textAlign: 'center',
    },
  });
}

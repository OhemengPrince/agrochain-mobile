import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  RefreshControl,
  Image,
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
import SearchWithSuggestions from '../../components/SearchWithSuggestions';
import TopRatedCarousel from '../../components/TopRatedCarousel';
import CommentsSheet from '../../components/CommentsSheet';
import GlassStatPill from '../../components/GlassStatPill';
import { getLikedListingIds, setListingLiked } from '../../utils/storage';
import { getComments } from '../../api/itemCommentApi';
import MarketplaceFiltersSheet, { MarketplaceFilters, DEFAULT_FILTERS, isFiltersActive } from '../../components/MarketplaceFiltersSheet';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MarketplaceList'>;

type ListRow =
  | { kind: 'promo' }
  | { kind: 'chips' }
  | { kind: 'empty' }
  | { kind: 'listing'; item: MarketplaceListing };

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
  if (listing.photoUrls?.[0]) {
    return (
      <Image source={{ uri: listing.photoUrls[0] }} style={styles.listingPhoto} resizeMode="cover" />
    );
  }
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
  liked,
  onToggleLike,
  commentsCount,
  onPressComment,
  colors,
  styles,
}: {
  item: MarketplaceListing;
  onPress: () => void;
  onContact: () => void;
  liked: boolean;
  onToggleLike: () => void;
  commentsCount: number;
  onPressComment: () => void;
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
            <View style={styles.engagementGroup}>
              <View style={styles.engagementStat}>
                <Ionicons name="eye-outline" size={15} color={colors.secondaryText} />
                <Text style={styles.engagementStatText}>{item.viewsCount}</Text>
              </View>
              <GlassStatPill
                icon={liked ? 'heart' : 'heart-outline'}
                label={liked ? 1 : 0}
                active={liked}
                bounce
                onPress={onToggleLike}
              />
              <GlassStatPill
                icon="chatbubble-outline"
                label={commentsCount}
                onPress={onPressComment}
              />
            </View>
            <TouchableOpacity style={styles.contactButton} onPress={onContact}>
              <Text style={styles.contactButtonText}>Message</Text>
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
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});
  const [activeCommentsListing, setActiveCommentsListing] = useState<MarketplaceListing | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_FILTERS);

  const loadListings = useCallback(async () => {
    setError(null);
    try {
      const data = await getMarketplaceListings();
      setListings(data);

      const [liked, commentCounts] = await Promise.all([
        getLikedListingIds(),
        Promise.all(data.map((l) => getComments('LISTING', l.id).catch(() => []))),
      ]);
      setLikedIds(new Set(liked));
      const counts: Record<string, number> = {};
      data.forEach((l, i) => { counts[l.id] = commentCounts[i].length; });
      setCommentsCounts(counts);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load marketplace listings.');
    }
  }, []);

  const handleToggleLike = useCallback((listingId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      const nowLiked = !next.has(listingId);
      if (nowLiked) next.add(listingId); else next.delete(listingId);
      setListingLiked(listingId, nowLiked).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadListings(); } finally { setLoading(false); }
    })();
  }, [loadListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await loadListings(); } finally { setRefreshing(false); }
  };

  const handleFilterPress = () => {
    setFiltersVisible(true);
  };

  const handleContact = (listing: MarketplaceListing) => {
    navigation.navigate('Chat', { name: listing.sellerName, role: 'Seller', otherUserId: listing.sellerId });
  };

  const regions = useMemo(() => {
    return Array.from(new Set(listings.map((l) => l.region).filter(Boolean))).sort();
  }, [listings]);

  const filtered = useMemo(() => {
    const min = filters.minPrice ? Number(filters.minPrice) : undefined;
    const max = filters.maxPrice ? Number(filters.maxPrice) : undefined;

    const base = listings.filter((listing) => {
      if (category && listing.category !== category) return false;
      if (filters.region && listing.region !== filters.region) return false;
      if (min != null && listing.price < min) return false;
      if (max != null && listing.price > max) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          listing.name.toLowerCase().includes(q) ||
          listing.sellerName.toLowerCase().includes(q) ||
          listing.region.toLowerCase().includes(q) ||
          listing.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const sorted = [...base];
    if (filters.sortBy === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sorted;
  }, [listings, category, query, filters]);

  const rows = useMemo((): ListRow[] => {
    const base: ListRow[] = [{ kind: 'promo' }, { kind: 'chips' }];
    if (filtered.length === 0) return [...base, { kind: 'empty' }];
    return [...base, ...filtered.map((item) => ({ kind: 'listing' as const, item }))];
  }, [filtered]);

  if (loading) {
    return <LoadingOverlay message="Loading marketplace..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.searchIconBtn} onPress={() => navigation.navigate('GlobalSearch' as any)}>
            <Ionicons name="search-outline" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>AgroChain Marketplace</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.searchRow}>
          <SearchWithSuggestions
            data={listings}
            keys={['name', 'category', 'region', 'sellerName']}
            value={query}
            onChangeText={setQuery}
            placeholder="Search listings..."
            colors={colors}
            containerStyle={styles.searchBarFlex}
            barHeight={48}
          />
          <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
            {isFiltersActive(filters) && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        style={styles.listFlex}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={rows}
        keyExtractor={(row) => row.kind === 'listing' ? row.item.id.toString() : row.kind}
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.list}
        renderItem={({ item: row }) => {
          if (row.kind === 'promo') {
            return (
              <View>
                <View style={styles.bannerWrap}>
                  <ListItemBanner onPress={() => navigation.navigate('CreateListing')} styles={styles} />
                </View>
                <TopRatedCarousel navigation={navigation} />
                <ErrorMessage message={error} />
              </View>
            );
          }
          if (row.kind === 'chips') {
            return (
              <View style={styles.chipsStickyWrap}>
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
              </View>
            );
          }
          if (row.kind === 'empty') {
            return (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color={colors.secondaryText} />
                <Text style={styles.emptyTitle}>No listings found</Text>
                <Text style={styles.emptyText}>Try a different search, category, or filters.</Text>
                {isFiltersActive(filters) && (
                  <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)} style={styles.clearFiltersBtn}>
                    <Text style={styles.clearFiltersText}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }
          return (
            <ListingCard
              item={row.item}
              onPress={() => navigation.navigate('MarketplaceListingDetail', { listingId: row.item.id })}
              onContact={() => handleContact(row.item)}
              liked={likedIds.has(row.item.id)}
              onToggleLike={() => handleToggleLike(row.item.id)}
              commentsCount={commentsCounts[row.item.id] ?? 0}
              onPressComment={() => setActiveCommentsListing(row.item)}
              colors={colors}
              styles={styles}
            />
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      <CommentsSheet
        visible={activeCommentsListing !== null}
        onClose={() => setActiveCommentsListing(null)}
        itemType="LISTING"
        itemId={activeCommentsListing?.id ?? ''}
        itemTitle={activeCommentsListing?.name ?? ''}
        itemSubtitle={activeCommentsListing ? formatCurrency(activeCommentsListing.price) : undefined}
        itemImageUrl={activeCommentsListing?.photoUrls?.[0]}
        itemEmoji={activeCommentsListing?.category === 'PRODUCE' ? getCropEmoji(activeCommentsListing.name) : undefined}
        onCommentsCountChange={(count) => {
          if (activeCommentsListing) {
            setCommentsCounts((prev) => ({ ...prev, [activeCommentsListing.id]: count }));
          }
        }}
      />

      <MarketplaceFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        onChange={setFilters}
        regions={regions}
        colors={colors}
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
    searchIconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
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
    searchBarFlex: {
      flex: 1,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.accentAmber,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
    },
    chipsStickyWrap: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    chipsRow: {
      flexGrow: 0,
    },
    chipsList: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
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
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginRight: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    chipActive: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    listFlex: {
      flex: 1,
    },
    list: {
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
    listingPhoto: {
      width: '100%',
      height: '100%',
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
    engagementGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flexShrink: 1,
    },
    engagementStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    engagementStatText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
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
    clearFiltersBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primaryGreen,
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

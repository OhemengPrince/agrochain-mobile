import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import { formatCurrency, getCropEmoji } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import MarketNewsFeed from '../../components/MarketNewsFeed';
import WeatherWidget from '../../components/WeatherWidget';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerHomeMain'>;

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

const CROP_FILTERS: { label: string; emoji: string; value: string | null }[] = [
  { label: 'All', emoji: '', value: null },
  { label: 'Maize', emoji: '🌽', value: 'Maize' },
  { label: 'Cassava', emoji: '🍠', value: 'Cassava' },
  { label: 'Cocoa', emoji: '🍫', value: 'Cocoa' },
  { label: 'Pineapple', emoji: '🍍', value: 'Pineapple' },
  { label: 'Tomato', emoji: '🍅', value: 'Tomato' },
];

function FilterChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function FeaturedBatchCard({
  batch,
  onPress,
  styles,
  colors,
}: {
  batch: ProduceBatch;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const isReady = batch.status === 'READY_FOR_SALE';

  return (
    <Animated.View style={[styles.featuredCardWrap, { transform: [{ scale }], opacity }]}>
      <Pressable style={styles.featuredCard} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.featuredEmojiWrap}>
          <Text style={styles.featuredEmoji}>{getCropEmoji(batch.cropName)}</Text>
        </View>
        {isReady && (
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>READY</Text>
          </View>
        )}
        <Text style={styles.featuredCropName} numberOfLines={1}>{batch.cropName}</Text>
        <Text style={styles.featuredFarmer} numberOfLines={1}>{batch.farmerName}</Text>
        <Text style={styles.featuredMeta} numberOfLines={1}>
          {batch.quantityKg} kg • {batch.district}
        </Text>
        {batch.pricePerKg !== undefined && (
          <Text style={styles.featuredPrice}>{formatCurrency(batch.pricePerKg)}/kg</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function BuyerHomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const loadBatches = useCallback(async () => {
    setError(null);
    try {
      const data = await getProduceCatalogue({ size: 20 });
      setBatches(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load produce.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBatches();
      setLoading(false);
    })();
  }, [loadBatches]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBatches();
    setRefreshing(false);
  };

  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())];
      return next.slice(0, 5);
    });
  };

  const handleSearchSubmit = () => {
    if (query.trim()) {
      addRecentSearch(query);
    }
    navigation.navigate('BuyerCatalogue');
  };

  const handleRecentSearchPress = (term: string) => {
    setQuery(term);
    addRecentSearch(term);
    navigation.navigate('BuyerCatalogue');
  };

  const goToScanner = () => {
    const parent = navigation.getParent() as any;
    if (parent) {
      parent.navigate('BuyerScanner', { screen: 'BuyerQrScanner' });
    } else {
      navigation.navigate('BuyerQrScanner');
    }
  };

  const goToListItem = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('BuyerMarket', { screen: 'MarketplaceList' });
  };

  const filteredBatches = useMemo(() => {
    let list = batches;
    if (cropFilter) {
      list = list.filter((b) => b.cropName.toLowerCase() === cropFilter.toLowerCase());
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((b) => b.cropName.toLowerCase().includes(q));
    }
    return list;
  }, [batches, cropFilter, query]);

  const featuredBatches = useMemo(() => {
    const ready = filteredBatches.filter((b) => b.status === 'READY_FOR_SALE');
    return ready.length > 0 ? ready : filteredBatches;
  }, [filteredBatches]);

  if (loading) {
    return <LoadingOverlay message="Loading marketplace..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={[]}
        keyExtractor={() => 'x'}
        renderItem={null}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
              <View style={styles.headerTopRow}>
                <Text style={styles.headerTitle}>Find Quality Produce 🌽</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.headerIconBtn} onPress={() => (navigation.getParent() as any)?.navigate('BuyerNotifications')}>
                    <Ionicons name="notifications" size={20} color={colors.primaryGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerIconBtn} onPress={() => (navigation.getParent() as any)?.navigate('BuyerProfile')}>
                    <Ionicons name="person" size={20} color={colors.primaryGreen} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>Verified Ghanaian Farmers</Text>

              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearchSubmit}
                  placeholder="Search crops, varieties..."
                  placeholderTextColor={colors.secondaryText}
                  returnKeyType="search"
                />
              </View>
            </LinearGradient>

            <WeatherWidget />

            <Pressable onPress={goToScanner} style={styles.scanBannerWrap}>
              <LinearGradient colors={[colors.accentAmber, '#E65100']} style={styles.scanBanner}>
                <View style={styles.scanIconCircle}>
                  <Ionicons name="qr-code" size={40} color={colors.white} />
                </View>
                <View style={styles.scanBannerBody}>
                  <Text style={styles.scanBannerTitle}>Scan Produce QR</Text>
                  <Text style={styles.scanBannerSubtitle}>Verify origin instantly</Text>
                  <View style={styles.scanNowButton}>
                    <Text style={styles.scanNowButtonText}>Scan Now</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.white} />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            <View style={styles.sellBannerWrap}>
              <View style={styles.sellBannerTextWrap}>
                <Text style={styles.sellBannerTitle}>Got something to sell?</Text>
                <Text style={styles.sellBannerSubtitle}>List produce, equipment or supplies in minutes.</Text>
              </View>
              <Pressable onPress={goToListItem} style={styles.sellBannerButton}>
                <Text style={styles.sellBannerButtonText}>List an Item</Text>
              </Pressable>
            </View>

            <View style={styles.filterBar}>
              <FlatList
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={5}
                data={CROP_FILTERS}
                horizontal
                keyExtractor={(item) => item.label}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterList}
                renderItem={({ item }) => {
                  const active = item.value === cropFilter;
                  return (
                    <FilterChip
                      label={item.emoji ? `${item.emoji} ${item.label}` : item.label}
                      active={active}
                      onPress={() => setCropFilter(item.value)}
                      styles={styles}
                    />
                  );
                }}
              />
            </View>

            <ErrorMessage message={error} />

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Available Now</Text>
              <Pressable onPress={() => navigation.navigate('BuyerCatalogue')}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>

            {featuredBatches.length === 0 ? (
              <Text style={styles.emptyText}>No produce listed yet.</Text>
            ) : (
              <FlatList
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={5}
                data={featuredBatches}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                renderItem={({ item }) => (
                  <FeaturedBatchCard
                    batch={item}
                    onPress={() => navigation.navigate('ProduceDetail', { batchId: item.id })}
                    styles={styles}
                    colors={colors}
                  />
                )}
              />
            )}

            {recentSearches.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <FlatList
                  removeClippedSubviews
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={5}
                  data={recentSearches}
                  horizontal
                  keyExtractor={(item, index) => `${item}-${index}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentList}
                  renderItem={({ item }) => (
                    <Pressable style={styles.recentChip} onPress={() => handleRecentSearchPress(item)}>
                      <Ionicons name="time-outline" size={13} color={colors.secondaryText} />
                      <Text style={styles.recentChipText}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}

            <MarketNewsFeed
              maxItems={3}
              onSeeAll={() => (navigation.getParent() as any)?.navigate('BuyerNews')}
            />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
    list: {
      paddingBottom: 120,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.white,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: 12,
      height: 48,
      paddingHorizontal: 14,
      marginTop: 16,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    scanBannerWrap: {
      marginHorizontal: 14,
      marginTop: 16,
    },
    scanBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      padding: 16,
      ...cardShadow,
    },
    scanIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    scanBannerBody: {
      flex: 1,
    },
    scanBannerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.white,
    },
    scanBannerSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
      marginBottom: 8,
    },
    scanNowButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      borderWidth: 1.5,
      borderColor: colors.white,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    scanNowButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.white,
    },
    sellBannerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 14,
      marginTop: 14,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      padding: 14,
      gap: 12,
    },
    sellBannerTextWrap: {
      flex: 1,
    },
    sellBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    sellBannerSubtitle: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    sellBannerButton: {
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    sellBannerButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    filterBar: {
      marginTop: 18,
    },
    filterList: {
      paddingHorizontal: 14,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.lightGreen,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.primaryGreen,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 22,
      marginBottom: 12,
      paddingHorizontal: 14,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      marginTop: 20,
    },
    featuredList: {
      paddingHorizontal: 14,
      gap: 12,
    },
    featuredCardWrap: {
      width: 160,
    },
    featuredCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      ...cardShadow,
    },
    featuredEmojiWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    featuredEmoji: {
      fontSize: 22,
    },
    readyBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: colors.lightGreen,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    readyBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.primaryGreen,
      letterSpacing: 0.3,
    },
    featuredCropName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    featuredFarmer: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    featuredMeta: {
      fontSize: 12,
      color: colors.text,
      marginTop: 6,
    },
    featuredPrice: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primaryGreen,
      marginTop: 6,
    },
    recentSection: {
      marginTop: 22,
    },
    recentList: {
      paddingHorizontal: 14,
    },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recentChipText: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: '600',
    },
  });
}

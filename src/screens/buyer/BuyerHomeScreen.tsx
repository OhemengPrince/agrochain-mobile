import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getNotifications } from '../../api/notificationApi';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch, AppNotification } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import { formatCurrency, formatDate, getCropEmoji } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import MarketNewsFeed from '../../components/MarketNewsFeed';
import MarketPricesSection from '../../components/MarketPricesSection';
import WeatherWidget from '../../components/WeatherWidget';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../hooks/useAuth';

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

const NOTIFICATION_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  BOOKING: 'checkmark-circle',
  PAYMENT: 'cash',
  BATCH: 'leaf',
  SYSTEM: 'information-circle',
  NEW_EQUIPMENT: 'construct-outline',
  NEW_LISTING: 'storefront-outline',
  NEW_PRODUCE: 'leaf-outline',
  PRICE_CHANGE: 'pricetag-outline',
  BOOKING_ACCEPTED: 'checkmark-circle-outline',
  NEW_FOLLOWER: 'person-add-outline',
  NEW_ORDER: 'cart-outline',
  ORDER_SHIPPED: 'cube-outline',
  ORDER_COMPLETED: 'checkmark-done-outline',
  ORDER_CANCELLED: 'close-circle-outline',
  PAYMENT_RELEASED: 'wallet-outline',
};

function notificationColor(type: AppNotification['type'], colors: ThemeColors): string {
  switch (type) {
    case 'BOOKING':
      return colors.primaryGreen;
    case 'PAYMENT':
      return colors.accentAmber;
    case 'BATCH':
      return '#2563EB';
    default:
      return colors.secondaryText;
  }
}

function dedupeNotifications(notifications: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  const result: AppNotification[] = [];
  for (const n of notifications) {
    const key = `${n.type}|${n.title}|${n.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(n);
  }
  return result;
}

export default function BuyerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketKey, setMarketKey] = useState(0);
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchUnreadCount = async () => {
        try {
          const notifs = await getNotifications();
          setUnreadCount(notifs.filter(n => !n.isRead).length);
        } catch (e) {}
      };
      fetchUnreadCount();
    }, [])
  );

  const loadBatches = useCallback(async () => {
    setError(null);
    console.log('[BuyerHome] loading produce catalogue...');
    try {
      const data = await getProduceCatalogue({ size: 20 });
      console.log('[BuyerHome] produce OK:', data.length, 'items');
      setBatches(data);
    } catch (err: any) {
      console.log('[BuyerHome] produce FAILED:', err?.message ?? err);
      setError(err?.response?.data?.message ?? 'Failed to load produce.');
    }
    try {
      const notifs = await getNotifications();
      console.log('[BuyerHome] notifications OK:', notifs.length, 'items');
      setNotifications(notifs);
    } catch (err: any) {
      console.log('[BuyerHome] notifications FAILED:', err?.message ?? err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadBatches();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBatches]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMarketKey((k) => k + 1);
    try {
      await loadBatches();
    } finally {
      setRefreshing(false);
    }
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
    if (!cropFilter) return batches;
    return batches.filter((b) => b.cropName.toLowerCase() === cropFilter.toLowerCase());
  }, [batches, cropFilter]);

  const featuredBatches = useMemo(() => {
    const ready = filteredBatches.filter((b) => b.status === 'READY_FOR_SALE');
    return ready.length > 0 ? ready : filteredBatches;
  }, [filteredBatches]);

  if (loading) {
    return <LoadingOverlay message="Loading marketplace..." />;
  }

  const recentActivity = dedupeNotifications(notifications)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => (navigation.getParent() as any)?.navigate('BuyerProfile')}>
            <View>
              <UserAvatar user={user} size={44} borderWidth={2} borderColor="rgba(255,255,255,0.9)" />
              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.appName}>Agrochain</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconBtn} onPress={() => (navigation.getParent() as any)?.navigate('BuyerNotifications')}>
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications-outline" size={22} color={colors.white} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3B30', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#1A6B2E' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => navigation.navigate('ChatRooms')}>
              <Ionicons name="chatbubble-outline" size={21} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Pressable style={styles.searchBarPill} onPress={() => navigation.navigate('GlobalSearch')}>
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
            <Text style={styles.searchPlaceholderText}>Search...</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
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
                keyExtractor={(item) => String(item.id)}
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

            <MarketPricesSection refreshKey={marketKey} />

            <MarketNewsFeed
              maxItems={3}
              refreshKey={marketKey}
              onSeeAll={() => (navigation.getParent() as any)?.navigate('BuyerNews')}
            />

            {recentActivity.length > 0 && (
              <View style={[styles.section, styles.lastSection]}>
                <Text style={styles.sectionTitle}>My Recent Activity</Text>
                {recentActivity.map((item) => {
                  const color = notificationColor(item.type, colors);
                  return (
                    <View key={String(item.id)} style={styles.activityRow}>
                      <View style={[styles.activityIconWrap, { backgroundColor: `${color}1A` }]}>
                        <Ionicons name={NOTIFICATION_ICON[item.type]} size={18} color={color} />
                      </View>
                      <View style={styles.activityBody}>
                        <Text style={styles.activityText} numberOfLines={2}>{item.title} — {item.message}</Text>
                      </View>
                      <Text style={styles.activityTime}>{formatDate(item.createdAt)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
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
      paddingHorizontal: 16,
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
    appName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 0.3,
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.accentAmber,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
    },
    searchBarPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 46,
      borderRadius: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
    },
    searchPlaceholderText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
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
    section: {
      paddingHorizontal: 16,
      marginTop: 20,
    },
    lastSection: {
      marginBottom: 24,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
    },
    activityIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    activityBody: {
      flex: 1,
    },
    activityText: {
      fontSize: 13,
      color: colors.text,
    },
    activityTime: {
      fontSize: 11,
      color: colors.secondaryText,
      marginLeft: 8,
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
  });
}

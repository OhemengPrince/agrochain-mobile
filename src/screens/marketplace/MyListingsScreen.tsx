import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
  RefreshControl,
  Platform,
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
  MarketplaceListingStatus,
} from '../../types';
import {
  getMyMarketplaceListings,
  updateMarketplaceListingStatus,
  deleteMarketplaceListing,
} from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import { formatCurrency, formatDate, getCropEmoji } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MyMarketplaceListings'>;

type FilterTab = 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'ALL';

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending Orders', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'All', value: 'ALL' },
];

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

function statusMeta(status: MarketplaceListingStatus, colors: ThemeColors) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'ACTIVE', color: colors.primaryGreen, background: colors.lightGreen };
    case 'SOLD':
      return { label: 'SOLD', color: '#6B7280', background: '#F3F4F6' };
    case 'RENTED':
      return { label: 'RENTED', color: '#2563EB', background: '#DBEAFE' };
    case 'PENDING':
      return { label: 'PENDING', color: colors.accentAmber, background: colors.lightAmber };
    default:
      return { label: status, color: colors.secondaryText, background: colors.inputBackground };
  }
}

function ListingIcon({
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
      <Image source={{ uri: listing.photoUrls[0] }} style={styles.iconCircle} resizeMode="cover" />
    );
  }
  if (listing.category === 'PRODUCE') {
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.lightGreen }]}>
        <Text style={styles.iconEmoji}>{getCropEmoji(listing.name)}</Text>
      </View>
    );
  }
  const icon = CATEGORY_ICONS[listing.category];
  return (
    <View style={[styles.iconCircle, { backgroundColor: colors.lightGreen }]}>
      <Ionicons name={icon} size={26} color={colors.primaryGreen} />
    </View>
  );
}

function ListingCard({
  listing,
  colors,
  styles,
  onEdit,
  onMarkSold,
  onDelete,
}: {
  listing: MarketplaceListing;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onEdit: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const meta = statusMeta(listing.status, colors);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onEdit} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.cardTopRow}>
        <ListingIcon listing={listing} colors={colors} styles={styles} />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>{listing.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
              <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.cardPrice}>
            {formatCurrency(listing.price)}
            {listing.priceType === 'PER_DAY' ? '/day' : listing.priceType === 'NEGOTIABLE' ? ' · Negotiable' : ''}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{listing.category}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={14} color={colors.secondaryText} />
          <Text style={styles.statText}>{listing.viewsCount} views</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.secondaryText} />
          <Text style={styles.statText}>{listing.inquiriesCount} inquiries</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="receipt-outline" size={14} color={colors.secondaryText} />
          <Text style={styles.statText}>{listing.ordersCount} orders</Text>
        </View>
      </View>

      <Text style={styles.dateText}>Posted {formatDate(listing.createdAt)}</Text>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <Pressable style={styles.editButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color={colors.primaryGreen} />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
        {listing.status === 'ACTIVE' && (
          <Pressable style={styles.soldButton} onPress={onMarkSold}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#2563EB" />
            <Text style={styles.soldButtonText}>Mark as Sold</Text>
          </Pressable>
        )}
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color={colors.errorRed} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function MarketplaceMyListingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const loadListings = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyMarketplaceListings();
      setListings(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load your listings.');
    }
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

  const handleEdit = useCallback((listingId: string) => {
    navigation.navigate('CreateListing', { listingId });
  }, [navigation]);

  const handleMarkSold = useCallback(
    (listingId: string) => {
      Alert.alert('Mark as Sold', 'Mark this listing as sold? It will no longer be visible to buyers.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sold',
          onPress: async () => {
            try {
              await updateMarketplaceListingStatus(listingId, 'SOLD');
              await loadListings();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update listing.');
            }
          },
        },
      ]);
    },
    [loadListings]
  );

  const handleDelete = useCallback(
    (listingId: string, name: string) => {
      Alert.alert('Delete Listing', `Are you sure you want to delete "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMarketplaceListing(listingId);
              await loadListings();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete listing.');
            }
          },
        },
      ]);
    },
    [loadListings]
  );

  const handleInquiryAction = useCallback((listing: MarketplaceListing, action: 'Accept' | 'Decline') => {
    Alert.alert('Coming soon', `${action}ing inquiries directly is not available yet. This is a preview of upcoming functionality for "${listing.name}".`);
  }, []);

  if (loading) {
    return <LoadingOverlay message="Loading your listings..." />;
  }

  const now = new Date();
  const soldOrRented = listings.filter((l) => l.status === 'SOLD' || l.status === 'RENTED');
  const totalEarned = soldOrRented.reduce((sum, l) => sum + l.price, 0);
  const thisMonthEarned = soldOrRented
    .filter((l) => {
      const created = new Date(l.createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    })
    .reduce((sum, l) => sum + l.price, 0);
  const pendingPayments = 0;

  const activeListings = listings.filter((l) => l.status === 'ACTIVE');
  const totalOrders = listings.reduce((sum, l) => sum + l.ordersCount, 0);

  const filtered = listings.filter((listing) => {
    if (filter === 'ACTIVE') return listing.status === 'ACTIVE';
    if (filter === 'PENDING') return listing.status === 'PENDING';
    if (filter === 'COMPLETED') return listing.status === 'SOLD' || listing.status === 'RENTED';
    return true;
  });

  const listingsWithActivity = listings.filter((l) => l.ordersCount > 0 || l.inquiriesCount > 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Pressable style={styles.browseMarketBtn} onPress={() => navigation.navigate('MarketplaceList')}>
            <Ionicons name="storefront-outline" size={16} color={colors.white} />
            <Text style={styles.browseMarketBtnText}>Browse Market</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <ErrorMessage message={error} />

        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Total Earned</Text>
          <Text style={styles.revenueValue}>{formatCurrency(totalEarned)}</Text>
          <Text style={styles.revenueSubLine}>{formatCurrency(thisMonthEarned)} this month</Text>
          <View style={styles.pendingRow}>
            <Ionicons name="time-outline" size={14} color={colors.accentAmber} />
            <Text style={styles.pendingText}>{formatCurrency(pendingPayments)} pending payments</Text>
          </View>
        </View>

        <View style={styles.statsRowOuter}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{activeListings.length}</Text>
            <Text style={styles.statCardLabel}>Active Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{totalOrders}</Text>
            <Text style={styles.statCardLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{formatCurrency(totalEarned)}</Text>
            <Text style={styles.statCardLabel}>Revenue</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsRow}>
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            return (
              <Pressable
                key={tab.value}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilter(tab.value)}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.emptyTitle}>No listings here</Text>
            <Text style={styles.emptySubtitle}>Try a different filter, or post a new item to the marketplace.</Text>
          </View>
        ) : (
          filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              colors={colors}
              styles={styles}
              onEdit={() => handleEdit(listing.id)}
              onMarkSold={() => handleMarkSold(listing.id)}
              onDelete={() => handleDelete(listing.id, listing.name)}
            />
          ))
        )}

        <Text style={styles.sectionTitle}>Order Notifications</Text>
        {listingsWithActivity.length === 0 ? (
          <View style={styles.noActivityBox}>
            <Ionicons name="notifications-outline" size={20} color={colors.secondaryText} />
            <Text style={styles.noActivityText}>No pending orders or inquiries yet.</Text>
          </View>
        ) : (
          listingsWithActivity.map((listing) => (
            <View key={listing.id} style={styles.activityCard}>
              <Text style={styles.activityText}>
                {listing.name} — {listing.inquiriesCount} pending inquir{listing.inquiriesCount === 1 ? 'y' : 'ies'}
                {listing.ordersCount > 0 ? `, ${listing.ordersCount} order${listing.ordersCount === 1 ? '' : 's'}` : ''}
              </Text>
              <Text style={styles.activitySubText}>Coming soon: respond directly from here.</Text>
              <View style={styles.activityActionsRow}>
                <Pressable
                  style={styles.acceptButton}
                  onPress={() => handleInquiryAction(listing, 'Accept')}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={styles.declineButton}
                  onPress={() => handleInquiryAction(listing, 'Decline')}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
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
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingBottom: 18,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    browseMarketBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    browseMarketBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    content: {
      padding: 16,
      paddingBottom: 120,
    },
    revenueCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      ...cardShadow,
    },
    revenueLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    revenueValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.primaryGreen,
      marginTop: 4,
    },
    revenueSubLine: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    pendingText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentAmber,
    },
    statsRowOuter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      ...cardShadow,
    },
    statCardValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    statCardLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
      textAlign: 'center',
    },
    filterTabsRow: {
      flexGrow: 0,
      marginTop: 18,
      marginBottom: 6,
    },
    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    filterTabActive: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    filterTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    filterTabTextActive: {
      color: '#FFFFFF',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginTop: 14,
      padding: 14,
      ...cardShadow,
    },
    cardTopRow: {
      flexDirection: 'row',
      gap: 12,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    iconEmoji: {
      fontSize: 26,
    },
    cardBody: {
      flex: 1,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    statusBadge: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    cardPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
      marginTop: 4,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginTop: 6,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 12,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    dateText: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 8,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: 12,
      marginBottom: 12,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primaryGreen,
      paddingVertical: 9,
    },
    editButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    soldButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#2563EB',
      paddingVertical: 9,
    },
    soldButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563EB',
    },
    deleteButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.errorRed,
      paddingVertical: 9,
    },
    deleteButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.errorRed,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 14,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginTop: 24,
      marginBottom: 10,
    },
    noActivityBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      ...cardShadow,
    },
    noActivityText: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    activityCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      ...cardShadow,
    },
    activityText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    activitySubText: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
    },
    activityActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    acceptButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.lightGreen,
      paddingVertical: 8,
    },
    acceptButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    declineButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      paddingVertical: 8,
    },
    declineButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
    },
  });
}

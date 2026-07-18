import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getNotifications } from '../../api/notificationApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Equipment, Booking } from '../../types';
import EquipmentImage from '../../components/EquipmentImage';
import { getMyListings } from '../../api/equipmentApi';
import { getIncomingBookings, confirmBooking, cancelBooking } from '../../api/bookingApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import MarketNewsFeed from '../../components/MarketNewsFeed';
import MarketPricesSection from '../../components/MarketPricesSection';
import WeatherWidget from '../../components/WeatherWidget';
import UserAvatar from '../../components/UserAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerDashboardMain'>;

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


function isBookingActive(booking: Booking): boolean {
  if (booking.status !== 'CONFIRMED') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(booking.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(booking.endDate);
  end.setHours(0, 0, 0, 0);
  return start <= today && today <= end;
}

function QuickActionButton({
  label,
  icon,
  colorsRange,
  onPress,
  styles,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorsRange: [string, string];
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[styles.quickActionWrap, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.quickActionPressable}>
        <LinearGradient colors={colorsRange} style={styles.quickActionIcon}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.quickActionLabel} numberOfLines={2}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function RequestCard({
  booking,
  styles,
  colors,
  onAccept,
  onReject,
}: {
  booking: Booking;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[styles.requestCard, { transform: [{ scale }], opacity }]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.requestTopRow}>
          <View style={styles.farmerAvatar}>
            <Text style={styles.farmerAvatarText}>{booking.farmerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestFarmerName} numberOfLines={1}>{booking.farmerName}</Text>
            <Text style={styles.requestEquipmentName} numberOfLines={1}>{booking.equipmentName}</Text>
            <Text style={styles.requestDates}>
              {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
            </Text>
          </View>
          <Text style={styles.requestAmount}>{formatCurrency(booking.totalCost)}</Text>
        </View>
        <View style={styles.requestActionsRow}>
          <Pressable style={styles.rejectButton} onPress={onReject}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MiniEquipmentCard({
  equipment,
  onPress,
  styles,
}: {
  equipment: Equipment;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[styles.miniCardWrap, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.miniCard}>
        <EquipmentImage category={equipment.category} imageUrl={equipment.imageUrl} style={styles.miniCardImage} resizeMode="cover" />
        <View style={styles.miniCardBody}>
          <Text style={styles.miniCardName} numberOfLines={1}>{equipment.name}</Text>
          <Text style={styles.miniCardRate}>{formatCurrency(equipment.dailyRate)}/day</Text>
          <View
            style={[
              styles.miniCardBadge,
              { backgroundColor: equipment.isAvailable ? styles.availableBg.backgroundColor : styles.unavailableBg.backgroundColor },
            ]}
          >
            <Text style={styles.miniCardBadgeText}>{equipment.isAvailable ? 'Available' : 'Unavailable'}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}


export default function OwnerDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const firstName = user?.firstName ?? 'Nana';
  const locationLabel = (user as any)?.location ?? 'Ejisu, Ashanti';
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [listings, setListings] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [marketKey, setMarketKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const loadData = useCallback(async () => {
    setError(null);
    console.log('[OwnerDashboard] loading dashboard data...');
    const [listingsRes, bookingsRes] = await Promise.allSettled([
      getMyListings(),
      getIncomingBookings(),
    ]);

    const errors: string[] = [];

    if (listingsRes.status === 'fulfilled') {
      console.log('[OwnerDashboard] listings OK:', listingsRes.value.length, 'items');
      setListings(listingsRes.value);
    } else {
      console.log('[OwnerDashboard] listings FAILED:', listingsRes.reason?.message ?? listingsRes.reason);
      errors.push('Could not load your equipment listings.');
    }

    if (bookingsRes.status === 'fulfilled') {
      console.log('[OwnerDashboard] bookings OK:', bookingsRes.value.length, 'items');
      setBookings(bookingsRes.value);
    } else {
      console.log('[OwnerDashboard] bookings FAILED:', bookingsRes.reason?.message ?? bookingsRes.reason);
      errors.push('Could not load incoming bookings.');
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMarketKey((k) => k + 1);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAccept = useCallback(
    async (bookingId: string) => {
      setActionLoadingId(bookingId);
      try {
        await confirmBooking(bookingId);
        await loadData();
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to accept booking.');
      } finally {
        setActionLoadingId(null);
      }
    },
    [loadData]
  );

  const handleReject = useCallback(
    (bookingId: string) => {
      Alert.alert('Reject Request', 'Are you sure you want to reject this booking request?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(bookingId);
            try {
              await cancelBooking(bookingId);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reject booking.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]);
    },
    [loadData]
  );

  const handleNotificationsPress = useCallback(() => {
    const parent = navigation.getParent() as any;
    if (parent) {
      parent.navigate('OwnerNotifications');
    } else {
      Alert.alert('Notifications', 'Notifications are not reachable from here.');
    }
  }, [navigation]);

  const handleAddEquipment = useCallback(() => {
    const parent = navigation.getParent() as any;
    if (parent) {
      parent.navigate('OwnerEquipment', { screen: 'CreateEquipment' });
    } else {
      navigation.navigate('CreateEquipment' as any);
    }
  }, [navigation]);

  const handleGoToIncoming = useCallback(() => {
    const parent = navigation.getParent() as any;
    parent?.navigate('OwnerBookings', { screen: 'OwnerBookingsList' });
  }, [navigation]);

  const handleGoToMyEquipment = useCallback(() => {
    const parent = navigation.getParent() as any;
    parent?.navigate('OwnerEquipment', { screen: 'OwnerEquipmentList' });
  }, [navigation]);


  const handleListItem = useCallback(() => {
    const parent = navigation.getParent() as any;
    parent?.navigate('OwnerMarket', { screen: 'MarketplaceList' });
  }, [navigation]);

  const handleEditEquipment = useCallback(
    (equipmentId: string) => {
      const parent = navigation.getParent() as any;
      parent?.navigate('OwnerEquipment', { screen: 'EditEquipment', params: { equipmentId } });
    },
    [navigation]
  );

  if (loading) {
    return <LoadingOverlay message="Loading dashboard..." />;
  }

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
  const activeBookings = bookings.filter(isBookingActive);

  const totalEarnings = completedBookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + b.totalCost, 0);

  const now = new Date();
  const thisMonthEarnings = completedBookings
    .filter((b) => b.paymentStatus === 'PAID')
    .filter((b) => {
      const created = new Date(b.createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    })
    .reduce((sum, b) => sum + b.totalCost, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.bellButton} onPress={() => navigation.navigate('GlobalSearch')}>
            <Ionicons name="search-outline" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerGreeting}>{firstName} 👋</Text>
            <Text style={styles.headerSubtitle}>Equipment Owner • {locationLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.bellButton} onPress={handleNotificationsPress}>
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3B30', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#1A6B2E' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable style={styles.bellButton} onPress={() => navigation.navigate('ChatRooms')}>
              <Ionicons name="chatbubble-outline" size={21} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => (navigation.getParent() as any)?.navigate('OwnerProfile')}>
              <UserAvatar user={user} size={34} borderWidth={2} borderColor="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ErrorMessage message={error} />

      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
        <Text style={styles.earningsValue}>{formatCurrency(totalEarnings)}</Text>
        <View style={styles.earningsDeltaRow}>
          <Ionicons name="arrow-up" size={13} color={colors.primaryGreen} />
          <Text style={styles.earningsDeltaText}>{formatCurrency(thisMonthEarnings)} this month</Text>
        </View>

        <View style={styles.earningsDivider} />

        <View style={styles.miniStatsRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{completedBookings.length}</Text>
            <Text style={styles.miniStatLabel}>Completed</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{activeBookings.length}</Text>
            <Text style={styles.miniStatLabel}>Active</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{pendingBookings.length}</Text>
            <Text style={styles.miniStatLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}
      >
        <QuickActionButton
          label="Add Equipment"
          icon="add-circle"
          colorsRange={[colors.primaryGreen, colors.primaryGreenLight]}
          onPress={handleAddEquipment}
          styles={styles}
        />
        <QuickActionButton
          label="Incoming"
          icon="time"
          colorsRange={['#FFB300', '#FF8F00']}
          onPress={handleGoToIncoming}
          styles={styles}
        />
        <QuickActionButton
          label="My Equipment"
          icon="construct"
          colorsRange={['#1E88E5', '#1565C0']}
          onPress={handleGoToMyEquipment}
          styles={styles}
        />
        <QuickActionButton
          label="List Item"
          icon="add-circle-outline"
          colorsRange={['#FF8F00', '#FFB300']}
          onPress={handleListItem}
          styles={styles}
        />
      </ScrollView>

      <WeatherWidget />

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Pending Requests</Text>
        {pendingBookings.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pendingBookings.length}</Text>
          </View>
        )}
      </View>

      {pendingBookings.length === 0 ? (
        <Text style={styles.emptyText}>No pending requests</Text>
      ) : (
        pendingBookings.slice(0, 3).map((booking) => (
          <RequestCard
            key={booking.id}
            booking={booking}
            styles={styles}
            colors={colors}
            onAccept={() => handleAccept(booking.id)}
            onReject={() => handleReject(booking.id)}
          />
        ))
      )}

      <Text style={[styles.sectionTitle, styles.equipmentSectionTitle]}>My Equipment</Text>
      {listings.length === 0 ? (
        <Text style={styles.emptyText}>You haven't listed any equipment yet.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentScroll}>
          {listings.map((equipment) => (
            <MiniEquipmentCard
              key={equipment.id}
              equipment={equipment}
              onPress={() => handleEditEquipment(equipment.id)}
              styles={styles}
            />
          ))}
        </ScrollView>
      )}

      <MarketPricesSection refreshKey={marketKey} />

      <MarketNewsFeed
        maxItems={3}
        refreshKey={marketKey}
        onSeeAll={() => (navigation.getParent() as any)?.navigate('OwnerNews')}
      />
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
    content: {
      paddingBottom: 120,
    },
    header: {
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTextWrap: {
      flex: 1,
      marginHorizontal: 8,
    },
    headerGreeting: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 4,
    },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    earningsCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      marginTop: -16,
      ...cardShadow,
      shadowOpacity: 0.1,
      elevation: 5,
    },
    earningsLabel: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: '500',
    },
    earningsValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primaryGreen,
      marginTop: 6,
    },
    earningsDeltaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    earningsDeltaText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    earningsDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 16,
    },
    miniStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    miniStat: {
      flex: 1,
      alignItems: 'center',
    },
    miniStatDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.divider,
    },
    miniStatValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    miniStatLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
    },
    quickActionsRow: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 16,
      marginTop: 20,
    },
    quickActionWrap: {
      width: 80,
    },
    quickActionPressable: {
      alignItems: 'center',
    },
    quickActionIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },
    quickActionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      marginTop: 8,
      textAlign: 'center',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      marginTop: 28,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    equipmentSectionTitle: {
      paddingHorizontal: 16,
      marginTop: 28,
      marginBottom: 12,
    },
    countBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 13,
      paddingHorizontal: 16,
    },
    requestCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 12,
      ...cardShadow,
    },
    requestTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    farmerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    farmerAvatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    requestInfo: {
      flex: 1,
      marginLeft: 10,
      marginRight: 8,
    },
    requestFarmerName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    requestEquipmentName: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    requestDates: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
    },
    requestAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    requestActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.primaryGreen,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    acceptButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    rejectButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.errorRed,
      paddingVertical: 9,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    rejectButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.errorRed,
    },
    equipmentScroll: {
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    miniCardWrap: {
      marginRight: 12,
    },
    miniCard: {
      width: 150,
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      ...cardShadow,
    },
    miniCardImage: {
      width: '100%',
      height: 90,
      backgroundColor: '#F0F7F2',
    },
    miniCardBody: {
      padding: 10,
    },
    miniCardName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    miniCardRate: {
      fontSize: 12,
      color: colors.primaryGreen,
      fontWeight: '700',
      marginTop: 4,
    },
    miniCardBadge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 6,
    },
    miniCardBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    availableBg: {
      backgroundColor: '#16A34A',
    },
    unavailableBg: {
      backgroundColor: '#DC2626',
    },
  });
}

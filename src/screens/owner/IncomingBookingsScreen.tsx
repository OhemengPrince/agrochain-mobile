import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  Pressable,
  Animated,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Booking } from '../../types';
import { getIncomingBookings, confirmBooking, cancelBooking } from '../../api/bookingApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerBookingsList'>;

type FilterKey = 'PENDING' | 'CONFIRMED' | 'ALL';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ALL', label: 'All' },
];

function statusMeta(status: Booking['status'], colors: ThemeColors): { color: string; background: string } {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return { color: colors.primaryGreen, background: colors.lightGreen };
    case 'CANCELLED':
    case 'REJECTED':
      return { color: colors.errorRed, background: 'rgba(183,28,28,0.12)' };
    default:
      return { color: colors.accentAmber, background: colors.lightAmber };
  }
}

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

function RequestCard({
  booking,
  styles,
  colors,
  onAccept,
  onReject,
  onViewDetails,
}: {
  booking: Booking;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onAccept: () => void;
  onReject: () => void;
  onViewDetails: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const meta = statusMeta(booking.status, colors);
  const isPending = booking.status === 'PENDING';

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onViewDetails} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.cardTopRow}>
          <View style={styles.farmerAvatar}>
            <Text style={styles.farmerAvatarText}>{booking.farmerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.farmerName} numberOfLines={1}>{booking.farmerName}</Text>
            <Text style={styles.equipmentName} numberOfLines={1}>{booking.equipmentName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
            <Text style={[styles.statusBadgeText, { color: meta.color }]}>{booking.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.secondaryText} />
            <Text style={styles.detailText}>
              {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
            </Text>
          </View>
          <Text style={styles.amount}>{formatCurrency(booking.totalCost)}</Text>
        </View>
      </Pressable>

      {isPending ? (
        <View style={styles.actionsRow}>
          <Pressable style={styles.rejectButton} onPress={onReject}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
        </View>
      ) : (
        <TouchableOpacity style={styles.viewDetailsRow} onPress={onViewDetails}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primaryGreen} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function IncomingBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('PENDING');

  const loadBookings = useCallback(async () => {
    setError(null);
    try {
      const data = await getIncomingBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load bookings.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBookings();
      setLoading(false);
    })();
  }, [loadBookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleAccept = useCallback(
    async (bookingId: string) => {
      try {
        await confirmBooking(bookingId);
        await loadBookings();
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to accept booking.');
      }
    },
    [loadBookings]
  );

  const handleReject = useCallback(
    (bookingId: string) => {
      Alert.alert('Reject Request', 'Are you sure you want to reject this booking request?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(bookingId);
              await loadBookings();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reject booking.');
            }
          },
        },
      ]);
    },
    [loadBookings]
  );

  const counts = useMemo(() => {
    return {
      PENDING: bookings.filter((b) => b.status === 'PENDING').length,
      CONFIRMED: bookings.filter((b) => b.status === 'CONFIRMED').length,
      ALL: bookings.length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === 'ALL') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  if (loading) {
    return <LoadingOverlay message="Loading incoming bookings..." />;
  }

  const filterLabel = FILTER_TABS.find((t) => t.key === filter)?.label ?? 'Pending';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Text style={styles.headerTitle}>Booking Requests</Text>
        <Text style={styles.headerSubtitle}>{bookings.length} total requests</Text>
      </LinearGradient>

      <View style={styles.tabsRow}>
        {FILTER_TABS.map((tab) => {
          const active = tab.key === filter;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{counts[tab.key]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ErrorMessage message={error} />

      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={filteredBookings}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RequestCard
            booking={item}
            styles={styles}
            colors={colors}
            onAccept={() => handleAccept(item.id)}
            onReject={() => handleReject(item.id)}
            onViewDetails={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.emptyTitle}>No {filterLabel.toLowerCase()} requests</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'PENDING'
                ? 'New booking requests will show up here.'
                : 'Nothing to show in this filter yet.'}
            </Text>
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
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerSubtitle: {
      fontSize: 13,
      color: '#FFFFFF',
      opacity: 0.8,
      marginTop: 4,
    },
    tabsRow: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
      marginRight: 4,
    },
    tabActive: {
      borderBottomColor: colors.primaryGreen,
    },
    tabText: {
      fontSize: 14,
      color: colors.secondaryText,
      fontWeight: '500',
    },
    tabTextActive: {
      color: colors.primaryGreen,
      fontWeight: '700',
    },
    tabBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    tabBadgeActive: {
      backgroundColor: colors.primaryGreen,
    },
    tabBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    tabBadgeTextActive: {
      color: '#FFFFFF',
    },
    list: {
      padding: 14,
      paddingBottom: 110,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      ...cardShadow,
    },
    cardTopRow: {
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
    cardInfo: {
      flex: 1,
      marginLeft: 10,
      marginRight: 8,
    },
    farmerName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    equipmentName: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 12,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    detailText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    amount: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.primaryGreen,
      borderRadius: 10,
      paddingVertical: 10,
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
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    rejectButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.errorRed,
    },
    viewDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 12,
    },
    viewDetailsText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    emptyState: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: 'center',
    },
  });
}

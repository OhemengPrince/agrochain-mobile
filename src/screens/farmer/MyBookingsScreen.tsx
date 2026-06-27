import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  Image,
  Pressable,
  Animated,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Booking } from '../../types';
import { getMyBookings, cancelBooking } from '../../api/bookingApi';
import { formatCurrency, formatDate, daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerBookingsList'>;

const GENERIC_EQUIPMENT_IMAGE = require('../../assets/equipment/tractor.jpg');

// Derived display status — the data model only has PENDING/CONFIRMED/CANCELLED/COMPLETED/REJECTED.
// We synthesize 'ACTIVE' client-side for CONFIRMED bookings whose date range covers today,
// and fold REJECTED into the same bucket as CANCELLED for filtering/display purposes.
type DisplayStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

function getDisplayStatus(booking: Booking): DisplayStatus {
  if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') return 'CANCELLED';
  if (booking.status === 'COMPLETED') return 'COMPLETED';
  if (booking.status === 'PENDING') return 'PENDING';
  if (booking.status === 'CONFIRMED') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(booking.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(booking.endDate);
    end.setHours(0, 0, 0, 0);
    if (start <= today && today <= end) return 'ACTIVE';
    return 'CONFIRMED';
  }
  return 'PENDING';
}

const STATUS_BADGE_META: Record<DisplayStatus, { label: string; bg: string }> = {
  PENDING: { label: 'PENDING', bg: '#FF8F00' },
  CONFIRMED: { label: 'CONFIRMED', bg: '#1565C0' },
  ACTIVE: { label: 'ACTIVE', bg: '#16A34A' },
  COMPLETED: { label: 'COMPLETED', bg: '#6B7280' },
  CANCELLED: { label: 'CANCELLED', bg: '#DC2626' },
};

type FilterKey = 'ALL' | DisplayStatus;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
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
  };
}

function AnimatedButton({
  style,
  textStyle,
  label,
  onPress,
}: {
  style: any;
  textStyle: any;
  label: string;
  onPress: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity, flex: 1 }}>
      <Pressable style={style} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function PremiumBookingCard({
  booking,
  styles,
  colors,
  onViewDetails,
  onCancel,
  onBrowseAgain,
}: {
  booking: Booking;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onViewDetails: () => void;
  onCancel: () => void;
  onBrowseAgain: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const displayStatus = getDisplayStatus(booking);
  const badgeMeta = STATUS_BADGE_META[displayStatus];
  const days = daysBetween(booking.startDate, booking.endDate);

  const handleConfirmReturn = () => {
    Alert.alert('Coming soon', 'Confirming returns will be available in a future update.');
  };

  const handleReportIssue = () => {
    Alert.alert('Coming soon', 'Reporting issues will be available in a future update.');
  };

  const handleLeaveReview = () => {
    Alert.alert('Coming soon', 'Leaving reviews will be available in a future update.');
  };

  const renderActions = () => {
    switch (displayStatus) {
      case 'PENDING':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.outlineRedButton}
              textStyle={styles.outlineRedButtonText}
              label="Cancel"
              onPress={onCancel}
            />
            <AnimatedButton
              style={styles.filledGreenButton}
              textStyle={styles.filledGreenButtonText}
              label="View Details"
              onPress={onViewDetails}
            />
          </View>
        );
      case 'CONFIRMED':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.filledGreenButtonFull}
              textStyle={styles.filledGreenButtonText}
              label="View Details"
              onPress={onViewDetails}
            />
          </View>
        );
      case 'ACTIVE':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.filledGreenButton}
              textStyle={styles.filledGreenButtonText}
              label="Confirm Return"
              onPress={handleConfirmReturn}
            />
            <AnimatedButton
              style={styles.outlineRedButton}
              textStyle={styles.outlineRedButtonText}
              label="Report Issue"
              onPress={handleReportIssue}
            />
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.filledAmberButton}
              textStyle={styles.filledAmberButtonText}
              label="Leave Review"
              onPress={handleLeaveReview}
            />
            <AnimatedButton
              style={styles.outlineGreenButton}
              textStyle={styles.outlineGreenButtonText}
              label="Book Again"
              onPress={onBrowseAgain}
            />
          </View>
        );
      case 'CANCELLED':
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onViewDetails} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.topRow}>
          <Image source={GENERIC_EQUIPMENT_IMAGE} style={styles.thumbnail} />
          <View style={styles.topRowMiddle}>
            <Text style={styles.equipmentName} numberOfLines={1}>{booking.equipmentName}</Text>
            <Text style={styles.ownerName} numberOfLines={1}>{booking.ownerName}</Text>
            <Text style={styles.dateRangeText}>
              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeMeta.bg }]}>
            <Text style={styles.statusBadgeText}>{badgeMeta.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoChipsRow}>
          <View style={styles.infoChip}>
            <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} />
            <Text style={styles.infoChipText}>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</Text>
          </View>
          <View style={styles.infoChip}>
            <Ionicons name="time-outline" size={12} color={colors.secondaryText} />
            <Text style={styles.infoChipText}>{days} days</Text>
          </View>
          <View style={styles.infoChip}>
            <Ionicons name="cash-outline" size={12} color={colors.primaryGreen} />
            <Text style={styles.infoChipCost}>{formatCurrency(booking.totalCost)}</Text>
          </View>
        </View>
      </Pressable>

      {renderActions()}
    </Animated.View>
  );
}

export default function MyBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const loadBookings = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyBookings();
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

  const goToEquipmentTab = useCallback(() => {
    const parent = navigation.getParent() as any;
    parent?.navigate('FarmerEquipment', { screen: 'FarmerEquipmentList' });
  }, [navigation]);

  const handleCancelBooking = useCallback(
    (bookingId: string) => {
      Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(bookingId);
              await loadBookings();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel booking.');
            }
          },
        },
      ]);
    },
    [loadBookings]
  );

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      ALL: bookings.length,
      PENDING: 0,
      CONFIRMED: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    bookings.forEach((b) => {
      const status = getDisplayStatus(b);
      result[status] += 1;
    });
    return result;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === 'ALL') return bookings;
    return bookings.filter((b) => getDisplayStatus(b) === filter);
  }, [bookings, filter]);

  if (loading) {
    return <LoadingOverlay message="Loading bookings..." />;
  }

  const filterLabel = FILTER_TABS.find((t) => t.key === filter)?.label ?? 'All';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>{bookings.length} total bookings</Text>
      </LinearGradient>

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {FILTER_TABS.map((tab) => {
            const active = tab.key === filter;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{counts[tab.key]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ErrorMessage message={error} />

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PremiumBookingCard
            booking={item}
            styles={styles}
            colors={colors}
            onViewDetails={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
            onCancel={() => handleCancelBooking(item.id)}
            onBrowseAgain={goToEquipmentTab}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚜</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'ALL' ? 'No bookings yet' : `No ${filterLabel} bookings`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'ALL'
                ? 'Start by renting equipment near you'
                : 'Try a different filter or browse new equipment'}
            </Text>
            <TouchableOpacity style={styles.browseButton} onPress={goToEquipmentTab}>
              <Text style={styles.browseButtonText}>Browse Equipment</Text>
            </TouchableOpacity>
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
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 55 : 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.white,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.white,
      opacity: 0.8,
      marginTop: 4,
    },
    tabsWrap: {
      backgroundColor: colors.card,
    },
    tabsContent: {
      paddingHorizontal: 12,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primaryGreen,
    },
    tabText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    tabTextActive: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    tabBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    tabBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    list: {
      paddingTop: 14,
      paddingBottom: 100,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    thumbnail: {
      width: 70,
      height: 70,
      borderRadius: 12,
    },
    topRowMiddle: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    equipmentName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    ownerName: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    dateRangeText: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
    },
    statusBadge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 0.3,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 12,
    },
    infoChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    infoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    infoChipText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    infoChipCost: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    filledGreenButton: {
      flex: 1,
      backgroundColor: colors.primaryGreen,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filledGreenButtonFull: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filledGreenButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    outlineRedButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.errorRed,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    outlineRedButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.errorRed,
    },
    outlineGreenButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primaryGreen,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    outlineGreenButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    filledAmberButton: {
      flex: 1,
      backgroundColor: colors.accentAmber,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filledAmberButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    emptyState: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 56,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: 'center',
    },
    browseButton: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 20,
    },
    browseButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.white,
    },
  });
}

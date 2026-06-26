import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Equipment, Booking } from '../../types';
import { getMyListings } from '../../api/equipmentApi';
import { getIncomingBookings } from '../../api/bookingApi';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../constants/colors';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerDashboardMain'>;

function bookingStatusMeta(status: Booking['status']): { color: string; background: string } {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return { color: colors.statusGreen, background: colors.statusGreenLight };
    case 'CANCELLED':
    case 'REJECTED':
      return { color: colors.errorRed, background: '#FDECEA' };
    default:
      return { color: colors.statusAmber, background: colors.statusAmberLight };
  }
}

export default function OwnerDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [listingsData, bookingsData] = await Promise.all([
        getMyListings(),
        getIncomingBookings(),
      ]);
      setListings(listingsData);
      setBookings(bookingsData);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load dashboard data.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingOverlay message="Loading dashboard..." />;
  }

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const totalEarnings = bookings
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.totalCost, 0);
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.banner}>
        <Text style={styles.bannerGreeting}>Welcome back,</Text>
        <Text style={styles.bannerName}>{firstName} 👋</Text>
      </LinearGradient>

      <ErrorMessage message={error} />

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.statusBlueLight }]}>
            <Ionicons name="construct" size={18} color={colors.statusBlue} />
          </View>
          <Text style={styles.statValue}>{listings.length}</Text>
          <Text style={styles.statLabel}>Listings</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.statusAmberLight }]}>
            <Ionicons name="time" size={18} color={colors.statusAmber} />
          </View>
          <Text style={styles.statValue}>{pendingBookings.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.lightGreen }]}>
            <Ionicons name="cash" size={18} color={colors.primaryGreen} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(totalEarnings)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Bookings</Text>
      {bookings.slice(0, 5).map((booking) => {
        const meta = bookingStatusMeta(booking.status);
        return (
          <View key={booking.id} style={styles.bookingRow}>
            <Text style={styles.bookingEquipment}>{booking.equipmentName}</Text>
            <View style={[styles.bookingBadge, { backgroundColor: meta.background }]}>
              <Text style={[styles.bookingBadgeText, { color: meta.color }]}>{booking.status}</Text>
            </View>
          </View>
        );
      })}
      {bookings.length === 0 && <Text style={styles.emptyText}>No bookings yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  banner: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
  },
  bannerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  bannerName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    ...cardShadow,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    ...cardShadow,
  },
  bookingEquipment: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bookingBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 13,
  },
});

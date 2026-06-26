import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FarmerStackParamList,
  OwnerStackParamList,
  Booking,
} from '../../types';
import { getMyBookings, getIncomingBookings, confirmBooking, cancelBooking, completeBooking } from '../../api/bookingApi';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { colors } from '../../constants/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<FarmerStackParamList | OwnerStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen({ route }: Props) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const isOwner = user?.role === 'EQUIPMENT_OWNER';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooking = async () => {
    setError(null);
    try {
      const list = isOwner ? await getIncomingBookings() : await getMyBookings();
      const found = list.find((b) => b.id === bookingId) ?? null;
      setBooking(found);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load booking.');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBooking();
      setLoading(false);
    })();
  }, [bookingId]);

  const runAction = async (action: (id: string) => Promise<Booking>) => {
    setError(null);
    setActionLoading(true);
    try {
      const updated = await action(bookingId);
      setBooking(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading booking..." />;
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error ?? 'Booking not found.'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{booking.equipmentName}</Text>
      <Text style={styles.status}>{booking.status}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Farmer</Text>
        <Text style={styles.value}>{booking.farmerName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Owner</Text>
        <Text style={styles.value}>{booking.ownerName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Dates</Text>
        <Text style={styles.value}>
          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Total Cost</Text>
        <Text style={styles.value}>{formatCurrency(booking.totalCost)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Payment</Text>
        <Text style={styles.value}>{booking.paymentStatus}</Text>
      </View>

      <ErrorMessage message={error} />

      {isOwner && booking.status === 'PENDING' && (
        <AppButton
          title="Confirm Booking"
          onPress={() => runAction(confirmBooking)}
          loading={actionLoading}
          style={styles.button}
        />
      )}
      {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
        <AppButton
          title="Cancel Booking"
          variant="outline"
          onPress={() => runAction(cancelBooking)}
          loading={actionLoading}
          style={styles.button}
        />
      ) : null}
      {isOwner && booking.status === 'CONFIRMED' && (
        <AppButton
          title="Mark as Completed"
          onPress={() => runAction(completeBooking)}
          loading={actionLoading}
          style={styles.button}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.darkText,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentAmber,
    marginTop: 4,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    color: colors.gray,
  },
  value: {
    fontSize: 13,
    color: colors.darkText,
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
  },
});

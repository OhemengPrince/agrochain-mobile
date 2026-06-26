import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FarmerStackParamList, Booking } from '../../types';
import { getMyBookings } from '../../api/bookingApi';
import { colors } from '../../constants/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import BookingCard from '../../components/BookingCard';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerBookingsList'>;

export default function MyBookingsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <LoadingOverlay message="Loading bookings..." />;
  }

  return (
    <View style={styles.container}>
      <ErrorMessage message={error} />
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no bookings yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    marginTop: 40,
  },
});

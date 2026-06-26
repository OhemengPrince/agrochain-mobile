import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FarmerStackParamList, Booking } from '../../types';
import { getMyBookings } from '../../api/bookingApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import BookingCard from '../../components/BookingCard';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerBookingsList'>;

export default function MyBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      padding: 14,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      marginTop: 40,
    },
  });
}

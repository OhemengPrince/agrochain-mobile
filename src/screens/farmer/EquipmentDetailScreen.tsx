import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FarmerStackParamList, Equipment } from '../../types';
import { getEquipmentById } from '../../api/equipmentApi';
import { createBooking } from '../../api/bookingApi';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../constants/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import AppButton from '../../components/AppButton';
import StarRating from '../../components/StarRating';

type Props = NativeStackScreenProps<FarmerStackParamList, 'EquipmentDetail'>;

function todayPlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function EquipmentDetailScreen({ route, navigation }: Props) {
  const { equipmentId } = route.params;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEquipmentById(equipmentId);
        setEquipment(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load equipment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId]);

  const handleBook = async () => {
    setError(null);
    setBooking(true);
    try {
      const result = await createBooking({
        equipmentId,
        startDate: todayPlusDays(1),
        endDate: todayPlusDays(2),
      });
      navigation.navigate('BookingDetail', { bookingId: result.id });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create booking.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading equipment..." />;
  }

  if (!equipment) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error ?? 'Equipment not found.'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {equipment.imageUrl ? (
        <Image source={{ uri: equipment.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{equipment.name}</Text>
        <Text style={styles.owner}>Listed by {equipment.ownerName}</Text>
        {equipment.averageRating !== undefined && (
          <StarRating rating={equipment.averageRating} />
        )}
        <Text style={styles.rate}>{formatCurrency(equipment.dailyRate)}/day</Text>
        <Text style={styles.location}>
          {equipment.district}, {equipment.region}
        </Text>
        <Text style={styles.description}>{equipment.description}</Text>

        <ErrorMessage message={error} />

        <AppButton
          title={equipment.isAvailable ? 'Book Now' : 'Currently Unavailable'}
          onPress={handleBook}
          loading={booking}
          disabled={!equipment.isAvailable}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: 220,
  },
  imagePlaceholder: {
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.gray,
  },
  body: {
    padding: 18,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.darkText,
  },
  owner: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
    marginBottom: 6,
  },
  rate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryGreen,
    marginTop: 8,
  },
  location: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: colors.darkText,
    marginTop: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
  },
});

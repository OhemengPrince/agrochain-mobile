import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { colors } from '../constants/colors';
import { cardShadow } from '../constants/shadows';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

function statusMeta(status: Booking['status']): { color: string; background: string } {
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

export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const meta = statusMeta(booking.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.equipmentName}>{booking.equipmentName}</Text>
        <View style={[styles.badge, { backgroundColor: meta.background }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{booking.status}</Text>
        </View>
      </View>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.secondaryText} />
        <Text style={styles.dates}>
          {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
        </Text>
      </View>
      <Text style={styles.cost}>{formatCurrency(booking.totalCost)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  dates: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  cost: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryGreen,
    marginTop: 6,
  },
});

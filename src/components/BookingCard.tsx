import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { cardShadow } from '../constants/shadows';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

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

export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const meta = statusMeta(booking.status, colors);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number, duration: number) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.97, 0.95, 100)}
        onPressOut={() => animateTo(1, 1, 150)}
        style={styles.card}
      >
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
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
}

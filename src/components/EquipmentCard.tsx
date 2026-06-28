import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Equipment } from '../types';
import { formatCurrency } from '../utils/formatters';
import { cardShadow } from '../constants/shadows';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { getEquipmentImage } from '../constants/equipmentImages';
import StarRating from './StarRating';

interface EquipmentCardProps {
  equipment: Equipment;
  onPress: () => void;
}

function EquipmentCard({ equipment, onPress }: EquipmentCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [remoteImageFailed, setRemoteImageFailed] = useState(false);
  const [fallbackImageFailed, setFallbackImageFailed] = useState(false);

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
        onFocus={() => animateTo(1.02, 1, 100)}
        onBlur={() => animateTo(1, 1, 150)}
        style={styles.card}
      >
        <View style={styles.imageWrapper}>
          {equipment.imageUrl && !remoteImageFailed ? (
            <Image
              source={{ uri: equipment.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setRemoteImageFailed(true)}
            />
          ) : !fallbackImageFailed ? (
            <Image
              source={getEquipmentImage(equipment.category)}
              style={styles.image}
              resizeMode="cover"
              onError={() => setFallbackImageFailed(true)}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="construct" size={32} color={colors.primaryGreenLight} />
            </View>
          )}
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{formatCurrency(equipment.dailyRate)}/day</Text>
          </View>
          {!equipment.isAvailable && (
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableBadgeText}>Unavailable</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{equipment.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={colors.secondaryText} />
            <Text style={styles.location}>
              {equipment.district}, {equipment.region}
            </Text>
          </View>
          <View style={styles.footer}>
            {equipment.averageRating !== undefined ? (
              <View style={styles.ratingRow}>
                <StarRating rating={equipment.averageRating} size={13} />
                {equipment.totalReviews !== undefined && (
                  <Text style={styles.reviewCount}>({equipment.totalReviews})</Text>
                )}
              </View>
            ) : (
              <Text style={styles.noRating}>No reviews yet</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(EquipmentCard);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      ...cardShadow,
    },
    imageWrapper: {
      position: 'relative',
      backgroundColor: '#F0F7F2',
    },
    image: {
      width: '100%',
      height: 140,
      backgroundColor: '#F0F7F2',
    },
    imagePlaceholder: {
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: 14,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    location: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    reviewCount: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    noRating: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    priceBadge: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      backgroundColor: colors.primaryGreen,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    priceBadgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '700',
    },
    unavailableBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: colors.errorRed,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    unavailableBadgeText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '700',
    },
  });
}

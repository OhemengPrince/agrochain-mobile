import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ProduceBatch } from '../types';
import { formatDate, getBatchStatusMeta, getCropEmoji } from '../utils/formatters';
import { cardShadow } from '../constants/shadows';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

interface BatchCardProps {
  batch: ProduceBatch;
  onPress: () => void;
  showCertification?: boolean;
}

export default function BatchCard({ batch, onPress, showCertification = false }: BatchCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const statusMeta = getBatchStatusMeta(batch.status);
  const isVerified = batch.processingStages.length > 0;
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
        onFocus={() => animateTo(1.02, 1, 100)}
        onBlur={() => animateTo(1, 1, 150)}
        style={styles.card}
      >
        <View style={styles.emojiWrap}>
          {batch.photoUrl ? (
            <Image source={{ uri: batch.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <Text style={styles.emoji}>{getCropEmoji(batch.cropName)}</Text>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.cropName}>{batch.cropName}</Text>
            <View style={[styles.badge, { backgroundColor: statusMeta.background }]}>
              <Text style={[styles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>
          {batch.variety ? <Text style={styles.variety}>{batch.variety}</Text> : null}
          <Text style={styles.meta}>
            {batch.quantityKg} kg  •  {batch.district}, {batch.region}
          </Text>
          {showCertification ? (
            <View style={[styles.certBadge, !isVerified && styles.certBadgeMuted]}>
              <Ionicons
                name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                size={12}
                color={isVerified ? colors.primaryGreen : colors.secondaryText}
              />
              <Text style={[styles.certBadgeText, !isVerified && styles.certBadgeTextMuted]}>
                {isVerified ? 'Verified Traceability' : 'Not Yet Verified'}
              </Text>
            </View>
          ) : (
            <Text style={styles.date}>Created {formatDate(batch.createdAt)}</Text>
          )}
        </View>

        <View style={styles.qrWrap}>
          <QRCode value={batch.qrCodeValue || batch.id} size={52} backgroundColor={colors.white} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      alignItems: 'center',
      ...cardShadow,
    },
    emojiWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden',
    },
    emoji: {
      fontSize: 24,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    body: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cropName: {
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
    variety: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    meta: {
      fontSize: 13,
      color: colors.text,
      marginTop: 6,
    },
    date: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
    },
    certBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.lightGreen,
      alignSelf: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 8,
    },
    certBadgeMuted: {
      backgroundColor: colors.inputBackground,
    },
    certBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    certBadgeTextMuted: {
      color: colors.secondaryText,
    },
    qrWrap: {
      marginLeft: 10,
      padding: 4,
      backgroundColor: colors.white,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}

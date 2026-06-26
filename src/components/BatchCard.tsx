import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ProduceBatch } from '../types';
import { formatDate, getBatchStatusMeta, getCropEmoji } from '../utils/formatters';
import { colors } from '../constants/colors';
import { cardShadow } from '../constants/shadows';

interface BatchCardProps {
  batch: ProduceBatch;
  onPress: () => void;
  showCertification?: boolean;
}

export default function BatchCard({ batch, onPress, showCertification = false }: BatchCardProps) {
  const statusMeta = getBatchStatusMeta(batch.status);
  const isVerified = batch.processingStages.length > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{getCropEmoji(batch.cropName)}</Text>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  },
  emoji: {
    fontSize: 24,
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
    backgroundColor: colors.statusGrayLight,
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

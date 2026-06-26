import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppNotification } from '../types';
import { formatDate } from '../utils/formatters';
import { colors } from '../constants/colors';
import { cardShadow } from '../constants/shadows';

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
}

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  BOOKING: 'calendar',
  PAYMENT: 'cash',
  BATCH: 'leaf',
  SYSTEM: 'information-circle',
};

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconWrap, notification.isRead && styles.iconWrapRead]}>
        <Ionicons
          name={TYPE_ICON[notification.type]}
          size={18}
          color={notification.isRead ? colors.secondaryText : colors.primaryGreen}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{notification.title}</Text>
          {!notification.isRead && <View style={styles.dot} />}
        </View>
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.date}>{formatDate(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    ...cardShadow,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapRead: {
    backgroundColor: colors.statusGrayLight,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentAmber,
    marginLeft: 8,
  },
  message: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 3,
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 6,
  },
});

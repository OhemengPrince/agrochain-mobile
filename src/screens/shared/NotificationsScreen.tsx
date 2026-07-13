import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  RefreshControl,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNotification, NotificationType } from '../../types';
import { getNotifications, markAsRead, markAllRead } from '../../api/notificationApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import SearchWithSuggestions from '../../components/SearchWithSuggestions';

const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  BOOKING: 'calendar',
  PAYMENT: 'cash',
  BATCH: 'leaf',
  SYSTEM: 'information-circle',
};

function getTypeColor(type: NotificationType, colors: ThemeColors): string {
  switch (type) {
    case 'BOOKING':
      return colors.primaryGreen;
    case 'PAYMENT':
      return '#1565C0';
    case 'BATCH':
      return colors.accentAmber;
    case 'SYSTEM':
    default:
      return colors.secondaryText;
  }
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Section {
  title: string;
  data: AppNotification[];
}

function groupNotifications(notifications: AppNotification[]): Section[] {
  const now = new Date();
  const today: AppNotification[] = [];
  const earlier: AppNotification[] = [];

  notifications.forEach((n) => {
    if (isSameDay(new Date(n.createdAt), now)) {
      today.push(n);
    } else {
      earlier.push(n);
    }
  });

  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: 'Today', data: today });
  if (earlier.length > 0) sections.push({ title: 'Earlier', data: earlier });
  return sections;
}

function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number, duration: number) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  return {
    scale,
    opacity,
    onPressIn: () => animateTo(0.97, 0.95, 100),
    onPressOut: () => animateTo(1, 1, 150),
  };
}

interface NotificationRowProps {
  notification: AppNotification;
  colors: ThemeColors;
  onPress: () => void;
  onDelete: () => void;
}

function NotificationRow({ notification, colors, onPress, onDelete }: NotificationRowProps) {
  const styles = createStyles(colors);
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const rowOpacity = useRef(new Animated.Value(1)).current;

  const handleDelete = () => {
    Animated.timing(rowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onDelete();
    });
  };

  return (
    <Animated.View style={{ opacity: rowOpacity }}>
      <Animated.View style={[{ transform: [{ scale }], opacity }]}>
        <Pressable
          style={[styles.row, !notification.isRead && styles.rowUnread]}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View style={[styles.iconCircle, { backgroundColor: getTypeColor(notification.type, colors) }]}>
            <Ionicons name={TYPE_ICON[notification.type]} size={20} color={colors.white} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{notification.title}</Text>
            <Text style={styles.rowMessage}>{notification.message}</Text>
            <Text style={styles.rowTime}>{timeAgo(notification.createdAt)}</Text>
          </View>
          <View style={styles.rowRight}>
            {!notification.isRead && <View style={styles.unreadDot} />}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadNotifications = useCallback(async () => {
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load notifications.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadNotifications(); } finally { setLoading(false); }
    })();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await loadNotifications(); } finally { setRefreshing(false); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to mark all as read.');
    }
  };

  const handlePressNotification = async (notification: AppNotification) => {
    if (notification.isRead) return;
    try {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to mark as read.');
    }
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // All hooks must appear before any early return
  const displayedNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const q = searchQuery.toLowerCase();
    return notifications.filter(
      (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
    );
  }, [notifications, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const sections = groupNotifications(displayedNotifications);

  if (loading) {
    return <LoadingOverlay message="Loading notifications..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
        <SearchWithSuggestions
          data={notifications}
          keys={['title', 'message']}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search notifications..."
          icon="search-outline"
          colors={colors}
          containerStyle={styles.notifSearchWrapper}
          barHeight={44}
        />
      </LinearGradient>

      <ErrorMessage message={error} />

      {unreadCount > 0 && (
        <Text style={styles.unreadCountText}>
          You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
        </Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            colors={colors}
            onPress={() => handlePressNotification(item)}
            onDelete={() => handleDeleteNotification(item.id)}
          />
        )}
        contentContainerStyle={sections.length === 0 ? styles.emptyContentContainer : styles.listContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>You are all caught up!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 50,
      paddingBottom: 14,
      paddingHorizontal: 18,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    notifSearchWrapper: {
      zIndex: 100,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.white,
    },
    markAllText: {
      fontSize: 13,
      color: colors.white,
    },
    unreadCountText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
      marginHorizontal: 16,
      marginTop: 12,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      letterSpacing: 1,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
    },
    listContentContainer: {
      paddingBottom: 120,
    },
    emptyContentContainer: {
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 14,
    },
    rowUnread: {
      backgroundColor: colors.lightGreen,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    rowMessage: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 3,
      lineHeight: 18,
    },
    rowTime: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 6,
    },
    rowRight: {
      alignItems: 'center',
      marginLeft: 8,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primaryGreen,
      marginBottom: 10,
    },
    deleteButton: {
      padding: 2,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
    },
  });
}

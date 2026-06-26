import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { AppNotification } from '../../types';
import { getNotifications, markAsRead, markAllRead } from '../../api/notificationApi';
import { colors } from '../../constants/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import NotificationItem from '../../components/NotificationItem';
import AppButton from '../../components/AppButton';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await loadNotifications();
      setLoading(false);
    })();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
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

  if (loading) {
    return <LoadingOverlay message="Loading notifications..." />;
  }

  return (
    <View style={styles.container}>
      <ErrorMessage message={error} />
      <View style={styles.headerRow}>
        <AppButton title="Mark all read" variant="outline" onPress={handleMarkAllRead} />
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={() => handlePressNotification(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You have no notifications yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    padding: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    marginTop: 40,
  },
});

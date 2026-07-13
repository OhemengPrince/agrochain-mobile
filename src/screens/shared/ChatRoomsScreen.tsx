import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { getRooms } from '../../api/chatApi';
import { ChatRoom } from '../../types';
import SearchWithSuggestions from '../../components/SearchWithSuggestions';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

export default function ChatRoomsScreen({ navigation }: { navigation: any }) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      setError(null);
      const data = await getRooms();
      // Most recent first
      const sorted = [...data].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      setRooms(sorted);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load conversations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // useFocusEffect already fires on first focus (= initial mount), so no separate
  // useEffect is needed — the duplicate caused 2× GET /chat/rooms on every mount.
  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRooms();
  }, [loadRooms]);

  const enrichedRooms = useMemo(
    () =>
      rooms.map((room) => {
        const other =
          user && String(room.participant1.id) === String(user.id)
            ? room.participant2
            : room.participant1;
        return { ...room, participantName: other.fullName ?? other.email ?? '' };
      }),
    [rooms, user]
  );

  const filteredRooms = useMemo(() => {
    if (!roomSearch.trim()) return rooms;
    const q = roomSearch.toLowerCase();
    return rooms.filter((room) => {
      const other =
        user && String(room.participant1.id) === String(user.id)
          ? room.participant2
          : room.participant1;
      return (other.fullName ?? other.email ?? '').toLowerCase().includes(q);
    });
  }, [rooms, roomSearch, user]);

  function getOtherParticipant(room: ChatRoom) {
    if (!user) return room.participant1;
    return String(room.participant1.id) === String(user.id) ? room.participant2 : room.participant1;
  }

  const s = createStyles(colors, isDarkMode);

  function renderRoom({ item }: { item: ChatRoom }) {
    const other = getOtherParticipant(item);
    const initials = (other.fullName ?? other.email ?? '?')
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('');

    return (
      <TouchableOpacity
        style={s.row}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Chat', {
            name: other.fullName ?? other.email ?? 'User',
            role: other.role ?? 'AgroChain User',
            otherUserId: String(other.id),
          })
        }
      >
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials || '?'}</Text>
        </View>

        {/* Name + time */}
        <View style={s.rowBody}>
          <View style={s.rowTop}>
            <Text style={s.name} numberOfLines={1}>{other.fullName ?? other.email ?? 'User'}</Text>
            <Text style={s.time}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          <View style={s.rowBottom}>
            <Text style={s.preview} numberOfLines={1}>Tap to open conversation</Text>
            {item.unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.unreadCount > 99 ? '99+' : String(item.unreadCount)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Messages</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <SearchWithSuggestions
          data={enrichedRooms}
          keys={['participantName']}
          value={roomSearch}
          onChangeText={setRoomSearch}
          onSelectSuggestion={(item) => {
            const other =
              user && String(item.participant1.id) === String(user.id)
                ? item.participant2
                : item.participant1;
            navigation.navigate('Chat', {
              name: other.fullName ?? other.email ?? 'User',
              role: other.role ?? 'AgroChain User',
              otherUserId: String(other.id),
            });
          }}
          placeholder="Search conversations..."
          icon="search-outline"
          colors={colors}
          barHeight={44}
        />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primaryGreen} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.secondaryText} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadRooms} style={s.retryBtn}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : rooms.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.secondaryText} />
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptySubtitle}>Start a chat from any equipment, booking, or listing page.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRoom}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryGreen]} tintColor={colors.primaryGreen} />}
          ItemSeparatorComponent={() => <View style={s.divider} />}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDarkMode: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.primaryGreen,
    },
    backBtn: { padding: 8, borderRadius: 20 },
    title: { fontSize: 18, fontWeight: '700', color: colors.white, letterSpacing: 0.2 },
    searchWrap: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card,
      zIndex: 100,
    },
    list: { paddingVertical: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.cardBackground,
      gap: 12,
    },
    avatar: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
    rowBody: { flex: 1 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: 8 },
    time: { fontSize: 12, color: colors.secondaryText, flexShrink: 0 },
    rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    preview: { fontSize: 13, color: colors.secondaryText, flex: 1, marginRight: 8 },
    badge: {
      minWidth: 20, height: 20, borderRadius: 10,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 5,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 80 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
    errorText: { fontSize: 14, color: colors.secondaryText, textAlign: 'center', lineHeight: 20 },
    retryBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primaryGreen },
    retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
    emptySubtitle: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', lineHeight: 19 },
  });
}

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable,
  ActivityIndicator, RefreshControl, Animated, PanResponder, StyleSheet as RNStyleSheet, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { getRooms } from '../../api/chatApi';
import { ChatRoom } from '../../types';
import SearchWithSuggestions from '../../components/SearchWithSuggestions';
import GlassBlur from '../../components/GlassBlur';
import {
  getPinnedRoomIds, setRoomPinned,
  getHiddenRoomsAt, hideRoom,
  getBlockedContactIds,
} from '../../utils/storage';

const PIN_WIDTH = 76;
const DELETE_WIDTH = 76;
const LONG_SWIPE_THRESHOLD = 190;

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

// ─────────────────────────────────────────────────────────────
// SwipeableRoomRow — swipe right to pin/unpin, swipe left to reveal
// delete (red bin only); a long swipe left deletes immediately.
// ─────────────────────────────────────────────────────────────
function SwipeableRoomRow({
  rowId, registerReset, onRowOpened, onTogglePin, onDelete, pinned, colors, children,
}: {
  rowId: string;
  registerReset: (id: string, reset: () => void) => void;
  onRowOpened: (id: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  pinned: boolean;
  colors: any;
  children: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current;
  const openStateRef = useRef<'none' | 'delete'>('none');
  const removedRef = useRef(false);
  // The pin/delete panels only ever MOUNT while this is true — driven by
  // React state (not the Animated value) so there is no way for them to be
  // visible at rest, regardless of how the sliding content is laid out.
  const [panelsVisible, setPanelsVisible] = useState(false);

  const resetSwipe = useCallback(() => {
    openStateRef.current = 'none';
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 300, friction: 26 }).start(() => {
      setPanelsVisible(false);
    });
  }, [translateX]);

  useEffect(() => {
    registerReset(rowId, resetSwipe);
  }, [rowId, registerReset, resetSwipe]);

  const triggerDelete = useCallback(() => {
    if (removedRef.current) return;
    removedRef.current = true;
    Animated.parallel([
      Animated.timing(translateX, { toValue: -500, duration: 220, useNativeDriver: true }),
      Animated.timing(rowHeight, { toValue: 0, duration: 220, useNativeDriver: false, delay: 100 }),
    ]).start(() => onDelete());
  }, [translateX, rowHeight, onDelete]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => {
        setPanelsVisible(true);
        if (openStateRef.current === 'none') onRowOpened(rowId);
      },
      onPanResponderMove: (_, gesture) => {
        const base = openStateRef.current === 'delete' ? -DELETE_WIDTH : 0;
        const next = base + gesture.dx;
        translateX.setValue(Math.max(-260, Math.min(PIN_WIDTH, next)));
      },
      onPanResponderRelease: (_, gesture) => {
        const base = openStateRef.current === 'delete' ? -DELETE_WIDTH : 0;
        const projected = base + gesture.dx;

        if (projected <= -LONG_SWIPE_THRESHOLD) {
          triggerDelete();
          return;
        }
        if (projected <= -DELETE_WIDTH / 2) {
          openStateRef.current = 'delete';
          onRowOpened(rowId);
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, tension: 300, friction: 26 }).start();
          return;
        }
        if (projected >= PIN_WIDTH / 2) {
          resetSwipe();
          onTogglePin();
          return;
        }
        resetSwipe();
      },
    })
  ).current;

  return (
    <Animated.View style={{ maxHeight: rowHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }}>
      <View style={[styles.swipeWrap, { overflow: 'hidden' }]}>
        {panelsVisible && (
          <>
            {/* Pin action — revealed behind on the left ONLY while swiping right */}
            <View style={[styles.pinAction, { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 24 }}>📌</Text>
            </View>
            {/* Delete action — revealed behind on the right ONLY while swiping left */}
            <View style={[styles.deleteAction, { backgroundColor: colors.card }]}>
              <Pressable onPress={() => { resetSwipe(); onDelete(); }} hitSlop={8}>
                <Ionicons name="trash" size={24} color="#EF4444" />
              </Pressable>
            </View>
          </>
        )}
        <Animated.View style={{ transform: [{ translateX }], backgroundColor: colors.cardBackground }} {...panResponder.panHandlers}>
          {children}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function ChatRoomsScreen({ navigation }: { navigation: any }) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [hiddenAt, setHiddenAt] = useState<Record<string, string>>({});
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const rowResettersRef = useRef<Record<string, () => void>>({});

  const registerRowReset = useCallback((id: string, reset: () => void) => {
    rowResettersRef.current[id] = reset;
  }, []);

  const handleRowOpened = useCallback((openedId: string) => {
    Object.entries(rowResettersRef.current).forEach(([id, reset]) => {
      if (id !== openedId) reset();
    });
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      setError(null);
      const [data, pinned, hidden, blocked] = await Promise.all([
        getRooms(), getPinnedRoomIds(), getHiddenRoomsAt(), getBlockedContactIds(),
      ]);
      setPinnedIds(new Set(pinned));
      setHiddenAt(hidden);
      setBlockedIds(new Set(blocked));
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

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRooms();
  }, [loadRooms]);

  function getOtherParticipant(room: ChatRoom) {
    if (!user) return room.participant1;
    return String(room.participant1.id) === String(user.id) ? room.participant2 : room.participant1;
  }

  // Visible rooms: hidden ("deleted") ones stay hidden unless a newer
  // message has arrived since the hide time — then they reappear. Blocked
  // contacts stay in the list (shown with a "Blocked" tag) rather than
  // disappearing — you can still open the conversation to unblock them.
  const visibleRooms = useMemo(() => {
    return rooms.filter((room) => {
      const hiddenSince = hiddenAt[String(room.id)];
      if (!hiddenSince) return true;
      return new Date(room.lastMessageAt).getTime() > new Date(hiddenSince).getTime();
    });
  }, [rooms, hiddenAt]);

  // Pinned rooms float to the top, each group still ordered by recency.
  const orderedRooms = useMemo(() => {
    const pinned = visibleRooms.filter((r) => pinnedIds.has(String(r.id)));
    const rest = visibleRooms.filter((r) => !pinnedIds.has(String(r.id)));
    return [...pinned, ...rest];
  }, [visibleRooms, pinnedIds]);

  const enrichedRooms = useMemo(
    () =>
      orderedRooms.map((room) => {
        const other = getOtherParticipant(room);
        return { ...room, participantName: other.fullName ?? other.email ?? '' };
      }),
    [orderedRooms, user]
  );

  const filteredRooms = useMemo(() => {
    if (!roomSearch.trim()) return orderedRooms;
    const q = roomSearch.toLowerCase();
    return orderedRooms.filter((room) => {
      const other = getOtherParticipant(room);
      return (other.fullName ?? other.email ?? '').toLowerCase().includes(q);
    });
  }, [orderedRooms, roomSearch, user]);

  const MAX_PINNED = 3;

  const handleTogglePin = useCallback((roomId: string) => {
    setPinnedIds((prev) => {
      const alreadyPinned = prev.has(roomId);
      if (!alreadyPinned && prev.size >= MAX_PINNED) {
        Alert.alert('Pin Limit Reached', `You can only pin up to ${MAX_PINNED} conversations. Unpin one first.`);
        return prev;
      }
      const next = new Set(prev);
      const nowPinned = !alreadyPinned;
      if (nowPinned) next.add(roomId); else next.delete(roomId);
      setRoomPinned(roomId, nowPinned).catch(() => {});
      return next;
    });
  }, []);

  const handleDeleteRoom = useCallback((roomId: string) => {
    const now = new Date().toISOString();
    setHiddenAt((prev) => ({ ...prev, [roomId]: now }));
    hideRoom(roomId, now).catch(() => {});
  }, []);

  const s = createStyles(colors, isDarkMode);

  function renderRoom({ item }: { item: ChatRoom }) {
    const other = getOtherParticipant(item);
    const initials = (other.fullName ?? other.email ?? '?')
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('');
    const roomId = String(item.id);

    return (
      <SwipeableRoomRow
        rowId={roomId}
        registerReset={registerRowReset}
        onRowOpened={handleRowOpened}
        onTogglePin={() => handleTogglePin(roomId)}
        onDelete={() => handleDeleteRoom(roomId)}
        pinned={pinnedIds.has(roomId)}
        colors={colors}
      >
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
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials || '?'}</Text>
          </View>

          <View style={s.rowBody}>
            <View style={s.rowTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                {pinnedIds.has(roomId) && (
                  <Text style={{ fontSize: 12, marginRight: 4 }}>📌</Text>
                )}
                <Text style={s.name} numberOfLines={1}>{other.fullName ?? other.email ?? 'User'}</Text>
              </View>
              <Text style={s.time}>{formatTime(item.lastMessageAt)}</Text>
            </View>
            <View style={s.rowBottom}>
              {blockedIds.has(String(other.id)) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="ban" size={12} color="#EF4444" />
                  <Text style={[s.preview, { color: '#EF4444', fontWeight: '600' }]}>Blocked</Text>
                </View>
              ) : (
                <Text style={s.preview} numberOfLines={1}>Tap to open conversation</Text>
              )}
              {item.unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.unreadCount > 99 ? '99+' : String(item.unreadCount)}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </SwipeableRoomRow>
    );
  }

  return (
    <View style={s.root}>
      {/* Glassmorphism header — extends behind the status bar */}
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight ?? colors.primaryGreen]} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <GlassBlur
          intensity={40}
          tint="dark"
          style={RNStyleSheet.absoluteFillObject}
          androidFallbackColor="rgba(0,0,0,0.08)"
        />
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Messages</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={s.searchWrap}>
          <SearchWithSuggestions
            data={enrichedRooms}
            keys={['participantName']}
            value={roomSearch}
            onChangeText={setRoomSearch}
            onSelectSuggestion={(item) => {
              const other = getOtherParticipant(item);
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
      </LinearGradient>

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
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
        ) : visibleRooms.length === 0 ? (
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
            style={{ flex: 1 }}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryGreen]} tintColor={colors.primaryGreen} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeWrap: { position: 'relative' },
  pinAction: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: PIN_WIDTH,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_WIDTH,
    alignItems: 'center', justifyContent: 'center',
  },
});

function createStyles(colors: any, isDarkMode: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      overflow: 'hidden',
      paddingBottom: 14,
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    backBtn: { padding: 8, borderRadius: 20 },
    title: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
    searchWrap: {
      paddingHorizontal: 12,
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
    errorText: { fontSize: 14, color: colors.secondaryText, textAlign: 'center', lineHeight: 20 },
    retryBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primaryGreen },
    retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
    emptySubtitle: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', lineHeight: 19 },
  });
}

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, ImageBackground, Alert, Modal,
  Animated, Dimensions, ScrollView, StyleProp, ViewStyle, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import type { StompSubscription } from '@stomp/stompjs';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { ThemeColors } from '../../context/ThemeContext';
import { ChatSocketMessage } from '../../types';
import { getOrCreateRoom, getMessages, markRead } from '../../api/chatApi';
import {
  connect as connectChatSocket,
  subscribeToRoom,
  sendMessage as sendSocketMessage,
  disconnect as disconnectChatSocket,
} from '../../services/chatSocket';
import ActiveIndicator from '../../components/ActiveIndicator';

// Bundled default wallpaper — always shown unless user picks a custom one
const DEFAULT_WALLPAPER = require('../../../assets/default message wallpaper background.jpg');

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ChatParams = {
  name: string;
  role?: string;
  wallpaperUri?: string | null;
  otherUserId?: string;
};

type Message = {
  id: string;
  text?: string;
  type: 'text' | 'voice' | 'sep';
  label?: string;
  sent: boolean;
  time: string;
  read?: boolean;
};

// ─────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────

const WAVE_HEIGHTS = [5, 13, 8, 18, 11, 22, 7, 16, 10, 20, 6, 14, 19, 9, 15, 12, 7, 17, 11, 8, 14];

const SEED: Message[] = [
  { id: 'sep1', type: 'sep', label: 'Today', sent: false, time: '' },
  { id: '1', type: 'text', text: 'Hello! I am interested in your equipment listing on AgroChain.', sent: false, time: '10:02 AM' },
  { id: '2', type: 'text', text: 'Welcome! Thank you for reaching out. The equipment is available.', sent: true, time: '10:05 AM', read: true },
  { id: '3', type: 'text', text: 'Which region are you farming in? And how many days do you need it?', sent: true, time: '10:06 AM', read: true },
  { id: '4', type: 'text', text: 'I am in the Ashanti region, around Kumasi. I need it for 3 days starting next Monday.', sent: false, time: '10:09 AM' },
  { id: '5', type: 'voice', sent: true, time: '10:12 AM', read: true },
  { id: '6', type: 'text', text: 'Perfect. The rate is GHS 450/day. I can confirm Monday–Wednesday. Shall I send the booking summary?', sent: false, time: '10:15 AM' },
  { id: '7', type: 'text', text: 'Yes please! That works perfectly for me. Thank you!', sent: true, time: '10:17 AM', read: false },
];

// ─────────────────────────────────────────────────────────────
// Live chat helpers — convert backend messages into the UI shape above
// ─────────────────────────────────────────────────────────────

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparatorLabel(date: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// GlassBlur — iOS: real BlurView, Android: semi-transparent fallback
// Keep opacity LOW so wallpaper remains visible in both themes
// ─────────────────────────────────────────────────────────────

function GlassBlur({
  intensity, tint, style, androidFallbackColor,
}: {
  intensity: number;
  tint: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  androidFallbackColor: string;
}) {
  if (Platform.OS === 'ios') {
    return <BlurView intensity={intensity} tint={tint} style={style} />;
  }
  return <View style={[style, { backgroundColor: androidFallbackColor }]} />;
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function ChatScreen({ route, navigation }: { route: { params: ChatParams }; navigation: any }) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { name, role = 'AgroChain User', otherUserId } = route.params;
  console.log('[ChatScreen] Mounted — name:', name, '| otherUserId:', otherUserId, '| typeof:', typeof otherUserId);

  // null = show DEFAULT_WALLPAPER; string uri = custom picked image
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(route.params.wallpaperUri ?? null);
  // Without otherUserId (e.g. the "message yourself" preview button on a profile
  // screen) there's no real room to connect to — keep the old static demo intact.
  const [messages, setMessages] = useState<Message[]>(otherUserId ? [] : SEED);
  const [inputText, setInputText] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  // ── Live chat wiring ──────────────────────────────────────
  const [roomId, setRoomId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!otherUserId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const lastDateKeyRef = useRef<string>('');

  // Panel visibility
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [callOptionsVisible, setCallOptionsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  // Search state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCursor, setMatchCursor] = useState(0);

  const [muted, setMuted] = useState(false);
  const listRef = useRef<FlatList>(null);
  const searchInputRef = useRef<TextInput>(null);

  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  // Memoize styles — createStyles allocates many StyleSheet objects, reuse between renders
  const s = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const blurTint = isDarkMode ? 'dark' : 'light';

  // ── Search logic ──────────────────────────────────────────
  const matchedIds = useMemo<Set<string>>(() => {
    if (!searchQuery.trim()) return new Set();
    const q = searchQuery.toLowerCase();
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.type === 'text' && m.text?.toLowerCase().includes(q)) set.add(m.id);
    });
    return set;
  }, [searchQuery, messages]);

  const matchedList = useMemo(
    () => messages.filter((m) => matchedIds.has(m.id)),
    [matchedIds, messages],
  );

  const navigateMatch = useCallback((direction: 1 | -1) => {
    if (matchedList.length === 0) return;
    const next = (matchCursor + direction + matchedList.length) % matchedList.length;
    setMatchCursor(next);
    const targetId = matchedList[next].id;
    const idx = messages.findIndex((m) => m.id === targetId);
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  }, [matchCursor, matchedList, messages]);

  // ── Load / create room + message history ──────────────────
  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;

    (async () => {
      setInitialLoading(true);
      setLoadError(null);
      try {
        const room = await getOrCreateRoom(otherUserId);
        if (cancelled) return;
        const resolvedRoomId = String(room.id);
        console.log('[ChatScreen] Room resolved:', resolvedRoomId);

        const history = await getMessages(resolvedRoomId);
        if (cancelled) return;

        const sorted = [...history].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const ui: Message[] = [];
        let dateKey = '';
        sorted.forEach((m) => {
          const d = new Date(m.createdAt);
          const dk = d.toDateString();
          if (dk !== dateKey) {
            ui.push({ id: `sep-${dk}`, type: 'sep', label: formatDateSeparatorLabel(d), sent: false, time: '' });
            dateKey = dk;
          }
          ui.push({
            id: String(m.id),
            type: 'text',
            text: m.content,
            sent: user != null && String(m.senderId) === String(user.id),
            time: formatMessageTime(m.createdAt),
            read: m.isRead,
          });
        });
        console.log('[ChatScreen] History loaded:', sorted.length, 'message(s)');
        lastDateKeyRef.current = dateKey;
        setMessages(ui);
        setRoomId(resolvedRoomId);
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.response?.data?.message ?? 'Could not load this conversation.');
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [otherUserId, user?.id]);

  // ── Live socket connection — subscribes once the room is known ──
  useEffect(() => {
    if (!otherUserId || !roomId || !token) return;

    const handleIncoming = (payload: ChatSocketMessage) => {
      console.log('[ChatScreen] Received message from', payload.senderName, ':', payload.content?.slice(0, 60));
      const d = new Date(payload.createdAt);
      const dk = d.toDateString();
      setMessages((prev) => {
        const next = [...prev];
        if (dk !== lastDateKeyRef.current) {
          next.push({ id: `sep-${dk}`, type: 'sep', label: formatDateSeparatorLabel(d), sent: false, time: '' });
          lastDateKeyRef.current = dk;
        }
        next.push({
          id: `${payload.senderId}-${payload.createdAt}`,
          type: 'text',
          text: payload.content,
          sent: user != null && String(payload.senderId) === String(user.id),
          time: formatMessageTime(payload.createdAt),
          read: false,
        });
        return next;
      });
    };

    connectChatSocket(token, {
      onConnect: () => {
        console.log('[ChatScreen] Socket connected, subscribing to room', roomId);
        setSocketConnected(true);
        subscriptionRef.current = subscribeToRoom(roomId, handleIncoming);
      },
      onDisconnect: () => setSocketConnected(false),
      onError: () => setSocketConnected(false),
    });

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      disconnectChatSocket();
      setSocketConnected(false);
    };
  }, [otherUserId, roomId, token, user?.id]);

  // ── Mark messages read whenever this chat gains focus ──────
  useFocusEffect(
    useCallback(() => {
      if (otherUserId && roomId) {
        markRead(roomId).catch(() => {});
      }
    }, [otherUserId, roomId])
  );

  const openSearch = useCallback(() => {
    setOptionsVisible(false);
    setSearchVisible(true);
    setSearchQuery('');
    setMatchCursor(0);
    setTimeout(() => searchInputRef.current?.focus(), 150);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchVisible(false);
    setSearchQuery('');
    setMatchCursor(0);
  }, []);

  // ── Profile picture picker ────────────────────────────────
  const handleUpdateProfilePicture = async () => {
    Alert.alert('Update Contact Photo', 'Choose a photo source.', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
          if (!result.canceled) setProfileImageUri(result.assets[0].uri);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
          if (!result.canceled) setProfileImageUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Wallpaper picker ──────────────────────────────────────
  const handleChangeWallpaper = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to choose a wallpaper.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    if (!result.canceled) { setWallpaperUri(result.assets[0].uri); setOptionsVisible(false); }
  };

  // ── Clear chat ────────────────────────────────────────────
  const handleClearChat = () => {
    Alert.alert('Clear Chat', 'All messages will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: () => {
          setMessages([{ id: 'sep1', type: 'sep', label: 'Today', sent: false, time: '' }]);
          setOptionsVisible(false);
        },
      },
    ]);
  };

  // ── Send message ──────────────────────────────────────────
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    // Demo mode (no real otherUserId) — keep the original local-only behavior.
    if (!otherUserId || !roomId) {
      const msg: Message = {
        id: Date.now().toString(), type: 'text', text, sent: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setMessages((prev) => [...prev, msg]);
      setInputText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      return;
    }

    // Live mode — publish over the socket and wait for the broadcast to come
    // back before it appears in the list; the server is the source of truth.
    try {
      console.log('[ChatScreen] Sending message to room', roomId, ':', text.slice(0, 60));
      sendSocketMessage(roomId, text);
      setInputText('');
      setSendError(null);
    } catch {
      setSendError('Message not sent — check your connection and try again.');
    }
  };

  // ── renderItem — stable reference so FlatList skips unnecessary re-renders ──
  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isMatch = matchedIds.has(item.id);

    if (item.type === 'sep') {
      return (
        <View style={s.sep}>
          <View style={s.sepLine} />
          <View style={s.sepPill}><Text style={s.sepText}>{item.label}</Text></View>
          <View style={s.sepLine} />
        </View>
      );
    }

    if (item.type === 'voice') {
      return (
        <View style={[s.row, item.sent ? s.rowSent : s.rowReceived, isMatch && s.rowHighlight]}>
          {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} />}
          <View>
            <View style={[s.voiceBubble, item.sent ? s.bubbleSent : s.bubbleReceived]}>
              <TouchableOpacity style={s.playBtn} activeOpacity={0.8}>
                <Ionicons name="play" size={15} color="#fff" />
              </TouchableOpacity>
              <View style={s.waveform}>
                {WAVE_HEIGHTS.map((h, i) => (
                  <View key={i} style={[s.waveBar, { height: h },
                    item.sent ? { backgroundColor: 'rgba(255,255,255,0.85)' } : { backgroundColor: 'rgba(0,0,0,0.35)' },
                    i >= 9 && { opacity: 0.38 }]} />
                ))}
              </View>
              <Text style={[s.voiceDur, { color: item.sent ? 'rgba(255,255,255,0.80)' : colors.secondaryText }]}>0:22</Text>
            </View>
            <TimeMeta sent={item.sent} time={item.time} read={item.read} s={s} colors={colors} />
          </View>
        </View>
      );
    }

    return (
      <View style={[s.row, item.sent ? s.rowSent : s.rowReceived, isMatch && s.rowHighlight]}>
        {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} />}
        <View style={{ maxWidth: '75%' }}>
          <View style={[s.bubble, item.sent ? s.bubbleSent : s.bubbleReceived]}>
            <HighlightedText text={item.text ?? ''} query={searchQuery} sent={item.sent} s={s} />
          </View>
          <TimeMeta sent={item.sent} time={item.time} read={item.read} s={s} colors={colors} />
        </View>
      </View>
    );
  // deps: everything used inside renderItem
  }, [matchedIds, searchQuery, initial, profileImageUri, s, colors]);

  return (
    <View style={s.root}>

      {/* ── LAYER 1: Wallpaper — explicit pixel dimensions so it ALWAYS fills on Android ── */}
      <Image
        source={wallpaperUri ? { uri: wallpaperUri } : DEFAULT_WALLPAPER}
        style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        resizeMode="cover"
        fadeDuration={0}
      />

      {/* ── LAYER 2: Header ── */}
      <ChatHeader
        name={name} role={role} initial={initial}
        profileImageUri={profileImageUri}
        isDarkMode={isDarkMode}
        onBack={() => navigation.goBack()}
        onContactPress={() => setOptionsVisible(true)}
        onDotsPress={() => setCallOptionsVisible(true)}
        colors={colors} s={s}
        statusLabel={otherUserId && !socketConnected ? 'Connecting…' : undefined}
      />

      {/* ── LAYER 3: Search bar (below header, above messages) ── */}
      {searchVisible && (
        <View style={s.searchBar}>
          <TouchableOpacity onPress={closeSearch} style={s.searchClose}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef}
            style={s.searchInput}
            placeholder="Search messages…"
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); setMatchCursor(0); }}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Text style={s.searchCount}>
              {matchedList.length > 0 ? `${matchCursor + 1}/${matchedList.length}` : '0'}
            </Text>
          )}
          <TouchableOpacity onPress={() => navigateMatch(-1)} style={s.searchNav} disabled={matchedList.length === 0}>
            <Ionicons name="chevron-up" size={20} color={matchedList.length > 0 ? colors.primaryGreen : colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateMatch(1)} style={s.searchNav} disabled={matchedList.length === 0}>
            <Ionicons name="chevron-down" size={20} color={matchedList.length > 0 ? colors.primaryGreen : colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={closeSearch} style={s.searchClose}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── LAYER 4: Messages + Input ── */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Message area — LOW opacity glass so wallpaper stays visible */}
        <View style={s.messageArea}>
          <GlassBlur
            intensity={isDarkMode ? 18 : 20}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(4,10,5,0.48)' : 'rgba(255,255,255,0.38)'}
          />
          {initialLoading ? (
            <View style={s.centerState}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : loadError ? (
            <View style={s.centerState}>
              <Ionicons name="alert-circle-outline" size={28} color="#fff" />
              <Text style={s.centerStateText}>{loadError}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={s.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
              style={s.flatList}
              onScrollToIndexFailed={() => {}}
            />
          )}
        </View>

        {/* Input bar + bottom safe area inside one BlurView container */}
        <View style={s.inputBarOuter}>
          <GlassBlur
            intensity={60} tint={blurTint}
            style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(4,10,5,0.88)' : 'rgba(255,255,255,0.88)'}
          />
          <View style={[StyleSheet.absoluteFill, s.inputBarBlurOverlay]} />
          <View style={s.inputBarTopBorder} />

          {sendError && (
            <View style={s.sendErrorBanner}>
              <Ionicons name="alert-circle" size={13} color="#EF4444" />
              <Text style={s.sendErrorText}>{sendError}</Text>
            </View>
          )}

          <View style={s.inputBar}>
            <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
              <Ionicons name="attach" size={22} color={isDarkMode ? 'rgba(255,255,255,0.55)' : '#6B7280'} />
            </TouchableOpacity>
            <View style={s.inputWrap}>
              <TextInput
                style={[s.input, { color: isDarkMode ? '#fff' : '#111827' }]}
                placeholder="Send a message..."
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF'}
                value={inputText}
                onChangeText={setInputText}
                multiline
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />
            </View>
            {inputText.trim() ? (
              <TouchableOpacity onPress={sendMessage} activeOpacity={0.8}>
                <LinearGradient colors={['#0B6E36', '#1B8B50']} style={s.sendBtn}>
                  <Ionicons name="send" size={17} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.8}>
                <LinearGradient colors={['#0B6E36', '#1B8B50']} style={s.sendBtn}>
                  <Ionicons name="mic" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: insets.bottom }} />
        </View>
      </KeyboardAvoidingView>

      {/* ── LAYER 5: Contact options panel ── */}
      <ChatOptionsPanel
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        name={name} role={role} initial={initial}
        profileImageUri={profileImageUri}
        muted={muted}
        hasCustomWallpaper={wallpaperUri !== null}
        colors={colors} isDarkMode={isDarkMode}
        onUpdatePhoto={handleUpdateProfilePicture}
        onViewProfile={() => { setOptionsVisible(false); setProfileVisible(true); }}
        onSearchInChat={openSearch}
        onMuteToggle={() => setMuted((p) => !p)}
        onChangeWallpaper={handleChangeWallpaper}
        onRestoreWallpaper={() => { setWallpaperUri(null); setOptionsVisible(false); }}
        onClearChat={handleClearChat}
        onBlock={() => { setOptionsVisible(false); Alert.alert('Block Contact', 'This feature is coming soon.'); }}
        onReport={() => { setOptionsVisible(false); Alert.alert('Report', 'This feature is coming soon.'); }}
      />

      {/* ── LAYER 6: Call options panel ── */}
      <CallOptionsPanel
        visible={callOptionsVisible}
        onClose={() => setCallOptionsVisible(false)}
        name={name} colors={colors} isDarkMode={isDarkMode}
      />

      {/* ── LAYER 7: Contact profile modal ── */}
      <ContactProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        name={name} role={role} initial={initial}
        profileImageUri={profileImageUri}
        wallpaperUri={wallpaperUri}
        onUpdatePhoto={handleUpdateProfilePicture}
        colors={colors} isDarkMode={isDarkMode}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ChatHeader
// ─────────────────────────────────────────────────────────────

function ChatHeader({ name, role, initial, profileImageUri, isDarkMode, onBack, onContactPress, onDotsPress, colors, s, statusLabel }: {
  name: string; role: string; initial: string; profileImageUri: string | null;
  isDarkMode: boolean; onBack: () => void;
  onContactPress: () => void; onDotsPress: () => void;
  colors: ThemeColors; s: any; statusLabel?: string;
}) {
  return (
    <View style={isDarkMode ? s.headerDark : s.headerLight}>
      <View style={s.headerGloss} />
      <SafeAreaView edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={s.headerCenter} onPress={onContactPress} activeOpacity={0.8}>
            <View style={{ position: 'relative' }}>
              <View style={s.avatarLargeWrap}>
                {profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={s.avatarLargeImage} />
                ) : (
                  <Text style={s.avatarLargeText}>{initial}</Text>
                )}
              </View>
              <View style={{ position: 'absolute', bottom: 0, right: 0 }}>
                <ActiveIndicator size={10} />
              </View>
            </View>
            <View style={s.headerInfo}>
              <Text style={s.headerName} numberOfLines={1}>{name}</Text>
              <View style={s.onlineRow}>
                <ActiveIndicator size={6} />
                <Text style={s.onlineSub}>{statusLabel ?? `Active now · ${role}`}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.iconBtn} onPress={onDotsPress} activeOpacity={0.75}>
            <View style={s.headerIconCircle}>
              <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ContactProfileModal — glassmorphism full-screen profile view
// Rendered as an Animated.View inside the chat tree (NOT a native Modal)
// so Android never pauses the parent's rendering and the chat wallpaper stays alive.
// ─────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ContactProfileModal({ visible, onClose, name, role, initial, profileImageUri, wallpaperUri, onUpdatePhoto, colors, isDarkMode }: {
  visible: boolean; onClose: () => void;
  name: string; role: string; initial: string; profileImageUri: string | null;
  wallpaperUri: string | null;
  onUpdatePhoto: () => void; colors: ThemeColors; isDarkMode: boolean;
}) {
  const insets = useSafeAreaInsets();
  const blurTint = isDarkMode ? 'dark' : 'light';
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(slideY, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideY, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }).start(() => {
        setRendered(false);
      });
    }
  }, [visible]);

  if (!rendered) return null;

  const glassCard = {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 22,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.70)',
  };
  const glassCardAndroid = isDarkMode ? 'rgba(4,10,5,0.62)' : 'rgba(255,255,255,0.62)';

  const infoRows = [
    { icon: 'briefcase-outline', label: 'Role', value: role },
    { icon: 'location-outline', label: 'Region', value: 'Ashanti Region, Ghana' },
    { icon: 'call-outline', label: 'Phone', value: '+233 XX XXX XXXX' },
    { icon: 'calendar-outline', label: 'Member since', value: 'January 2024' },
    { icon: 'shield-checkmark-outline', label: 'Status', value: 'Verified AgroChain Member' },
  ];

  // Same wallpaper source as the parent chat screen
  const wallpaperSource = wallpaperUri ? { uri: wallpaperUri } : DEFAULT_WALLPAPER;

  return (
    // backgroundColor is a solid opaque fallback — chat content can NEVER bleed through
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 200, elevation: 200, backgroundColor: '#04331A', transform: [{ translateY: slideY }] }]}
    >
      {/* ImageBackground fills the Animated.View and renders the wallpaper reliably */}
      <ImageBackground
        source={wallpaperSource}
        style={{ flex: 1, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        resizeMode="cover"
        fadeDuration={0}
      >

        {/* ── Header bar (glass, properly inset) ── */}
        <View style={{ paddingTop: insets.top, overflow: 'hidden' }}>
          <GlassBlur intensity={isDarkMode ? 55 : 60} tint={blurTint} style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(4,20,10,0.88)' : 'rgba(11,110,54,0.88)'} />
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.20)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 8, paddingBottom: 14 }}>
            <TouchableOpacity onPress={onClose} style={{ padding: 10 }} activeOpacity={0.75}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: 0.2 }}>
              Profile
            </Text>
            <TouchableOpacity onPress={onUpdatePhoto} style={{ padding: 10 }} activeOpacity={0.75}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + name */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={onUpdatePhoto} activeOpacity={0.85}>
              <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primaryGreen, borderWidth: 4, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={{ width: 108, height: 108 }} />
                ) : (
                  <Text style={{ fontSize: 44, fontWeight: '800', color: '#fff' }}>{initial}</Text>
                )}
              </View>
              <View style={{ position: 'absolute', bottom: 2, right: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: '#0B6E36', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.60)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={15} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 16, letterSpacing: 0.2, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
              {name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
              <ActiveIndicator size={7} />
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.90)', fontWeight: '600' }}>Active now · {role}</Text>
            </View>
          </View>

          {/* ── Action buttons — glass card ── */}
          <View style={glassCard}>
            <GlassBlur intensity={isDarkMode ? 30 : 40} tint={blurTint} style={StyleSheet.absoluteFill} androidFallbackColor={glassCardAndroid} />
            <View style={{ flexDirection: 'row', paddingVertical: 20, paddingHorizontal: 12 }}>
              {[
                { icon: 'chatbubble-ellipses', label: 'Message', onPress: onClose },
                { icon: 'call', label: 'Voice Call', onPress: () => Alert.alert('Voice Call', 'Coming soon.') },
                { icon: 'videocam', label: 'Video', onPress: () => Alert.alert('Video Call', 'Coming soon.') },
              ].map((btn) => (
                <TouchableOpacity key={btn.label} onPress={btn.onPress} activeOpacity={0.8}
                  style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#0B6E36', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 7 }}>
                    <Ionicons name={btn.icon as any} size={24} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#fff' }}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Info rows — glass card ── */}
          <View style={[glassCard, { marginTop: 0 }]}>
            <GlassBlur intensity={isDarkMode ? 30 : 40} tint={blurTint} style={StyleSheet.absoluteFill} androidFallbackColor={glassCardAndroid} />
            {infoRows.map((row, i) => (
              <View key={row.label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={row.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.60)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 }}>{row.label}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{row.value}</Text>
                  </View>
                </View>
                {i < infoRows.length - 1 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginLeft: 70 }} />}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ height: insets.bottom }} />
      </ImageBackground>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// CallOptionsPanel — audio / video call
// ─────────────────────────────────────────────────────────────

function CallOptionsPanel({ visible, onClose, name, colors, isDarkMode }: {
  visible: boolean; onClose: () => void;
  name: string; colors: ThemeColors; isDarkMode: boolean;
}) {
  const sheetBg = isDarkMode ? '#1A1A1E' : '#FFFFFF';
  const labelColor = isDarkMode ? '#FFFFFF' : '#111827';
  const subColor = isDarkMode ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const divider = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.20)' : '#D1D5DB' }} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: subColor, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 12 }}>
          Call {name}
        </Text>

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}
          onPress={() => { onClose(); Alert.alert('Voice Call', 'Voice calling is coming soon.'); }}
          activeOpacity={0.7}
        >
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#0B6E36', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: labelColor }}>Voice Call</Text>
            <Text style={{ fontSize: 13, color: subColor, marginTop: 2 }}>Start an audio call</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={subColor} />
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: divider, marginLeft: 88 }} />

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}
          onPress={() => { onClose(); Alert.alert('Video Call', 'Video calling is coming soon.'); }}
          activeOpacity={0.7}
        >
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#1B8B50', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="videocam" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: labelColor }}>Video Call</Text>
            <Text style={{ fontSize: 13, color: subColor, marginTop: 2 }}>Start a video call</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={subColor} />
        </TouchableOpacity>

        <SafeAreaView edges={['bottom']} />
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// ChatOptionsPanel — WhatsApp-style bottom sheet
// ─────────────────────────────────────────────────────────────

type OptionItem = { icon: string; label: string; sublabel?: string; color?: string; onPress: () => void; };

function ChatOptionsPanel({
  visible, onClose, name, role, initial, profileImageUri,
  muted, hasCustomWallpaper, colors, isDarkMode,
  onUpdatePhoto, onViewProfile, onSearchInChat,
  onMuteToggle, onChangeWallpaper, onRestoreWallpaper, onClearChat, onBlock, onReport,
}: {
  visible: boolean; onClose: () => void;
  name: string; role: string; initial: string; profileImageUri: string | null;
  muted: boolean; hasCustomWallpaper: boolean; colors: ThemeColors; isDarkMode: boolean;
  onUpdatePhoto: () => void; onViewProfile: () => void; onSearchInChat: () => void;
  onMuteToggle: () => void; onChangeWallpaper: () => void; onRestoreWallpaper: () => void;
  onClearChat: () => void; onBlock: () => void; onReport: () => void;
}) {
  const sheetBg = isDarkMode ? '#1A1A1E' : '#FFFFFF';
  const dividerColor = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0';
  const labelColor = isDarkMode ? '#FFFFFF' : '#111827';
  const subColor = isDarkMode ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const iconBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  const options: OptionItem[] = [
    {
      icon: 'person-circle-outline', label: 'View Profile', sublabel: 'See full profile information',
      onPress: onViewProfile,
    },
    {
      icon: 'search-outline', label: 'Search in Chat', sublabel: 'Find messages',
      onPress: onSearchInChat,
    },
    {
      icon: muted ? 'notifications-outline' : 'notifications-off-outline',
      label: muted ? 'Unmute Notifications' : 'Mute Notifications',
      sublabel: muted ? 'Turn notifications back on' : 'Stop notifications for this chat',
      onPress: onMuteToggle,
    },
    {
      icon: 'image-outline', label: 'Change Wallpaper', sublabel: 'Pick a photo from your gallery',
      onPress: onChangeWallpaper,
    },
    ...(hasCustomWallpaper ? [{ icon: 'color-palette-outline', label: 'Restore Default Wallpaper', sublabel: 'Go back to the AgroChain default', onPress: onRestoreWallpaper }] : []),
    {
      icon: 'trash-outline', label: 'Clear Chat', sublabel: 'Delete all messages',
      onPress: onClearChat,
    },
  ];

  const destructiveOptions: OptionItem[] = [
    { icon: 'ban-outline', label: 'Block Contact', color: '#EF4444', onPress: onBlock },
    { icon: 'flag-outline', label: 'Report', color: '#EF4444', onPress: onReport },
  ];

  function OptionRow({ item }: { item: OptionItem }) {
    return (
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 }} onPress={item.onPress} activeOpacity={0.7}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.color ? 'rgba(239,68,68,0.10)' : iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={item.icon as any} size={20} color={item.color ?? colors.primaryGreen} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: item.color ?? labelColor }}>{item.label}</Text>
          {item.sublabel ? <Text style={{ fontSize: 12, color: subColor, marginTop: 2 }}>{item.sublabel}</Text> : null}
        </View>
        {!item.color && <Ionicons name="chevron-forward" size={16} color={subColor} />}
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.20)' : '#D1D5DB' }} />
        </View>

        {/* Contact header — tap avatar to update photo */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <TouchableOpacity onPress={onUpdatePhoto} activeOpacity={0.85}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryGreen, borderWidth: 3, borderColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 }}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={{ width: 84, height: 84, borderRadius: 42 }} />
              ) : (
                <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }}>{initial}</Text>
              )}
            </View>
            <View style={{ position: 'absolute', bottom: 14, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#0B6E36', borderWidth: 2, borderColor: sheetBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '800', color: labelColor, letterSpacing: 0.2 }}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <ActiveIndicator size={7} />
            <Text style={{ fontSize: 13, color: colors.primaryGreen, fontWeight: '600' }}>Active now</Text>
            <Text style={{ fontSize: 13, color: subColor }}>· {role}</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: dividerColor }} />

        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {options.map((item) => (
            <View key={item.label}>
              <OptionRow item={item} />
              <View style={{ height: 1, backgroundColor: dividerColor, marginLeft: 74 }} />
            </View>
          ))}
          <View style={{ height: 8, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.20)' : '#F9FAFB' }} />
          {destructiveOptions.map((item) => (
            <View key={item.label}>
              <OptionRow item={item} />
              <View style={{ height: 1, backgroundColor: dividerColor, marginLeft: 74 }} />
            </View>
          ))}
          <SafeAreaView edges={['bottom']} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// HighlightedText — renders message text with search matches highlighted
// ─────────────────────────────────────────────────────────────

const HighlightedText = React.memo(function HighlightedText({ text, query, sent, s }: {
  text: string; query: string; sent: boolean; s: any;
}) {
  if (!query.trim()) {
    return <Text style={[s.bubbleText, sent ? s.bubbleTextSent : s.bubbleTextRecv]}>{text}</Text>;
  }
  const lower = text.toLowerCase();
  const lowerQ = query.toLowerCase();
  const parts: { value: string; match: boolean }[] = [];
  let cursor = 0;
  let idx = lower.indexOf(lowerQ, cursor);
  while (idx !== -1) {
    if (idx > cursor) parts.push({ value: text.slice(cursor, idx), match: false });
    parts.push({ value: text.slice(idx, idx + query.length), match: true });
    cursor = idx + query.length;
    idx = lower.indexOf(lowerQ, cursor);
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor), match: false });
  return (
    <Text style={[s.bubbleText, sent ? s.bubbleTextSent : s.bubbleTextRecv]}>
      {parts.map((p, i) =>
        p.match ? (
          <Text key={i} style={s.highlight}>{p.value}</Text>
        ) : (
          <Text key={i}>{p.value}</Text>
        )
      )}
    </Text>
  );
});

// ─────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────

const SmallAvatar = React.memo(function SmallAvatar({ initial, profileUri, s }: { initial: string; profileUri: string | null; s: any }) {
  return (
    <View style={s.avatarSmall}>
      {profileUri ? <Image source={{ uri: profileUri }} style={s.avatarSmallImage} /> : <Text style={s.avatarSmallText}>{initial}</Text>}
    </View>
  );
});

const TimeMeta = React.memo(function TimeMeta({ sent, time, read, s, colors }: {
  sent: boolean; time: string; read?: boolean; s: any; colors: ThemeColors;
}) {
  return (
    <View style={[s.timeMeta, sent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
      <Text style={[s.timeText, sent ? s.timeSent : s.timeRecv]}>{time}</Text>
      {sent && <Ionicons name="checkmark-done" size={13} color={read ? '#4ade80' : 'rgba(255,255,255,0.45)'} style={{ marginLeft: 2 }} />}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  const SENT_BG        = '#0B6E36';
  const RECV_BG        = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.72)';
  const RECV_BORDER    = isDarkMode ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.85)';
  const RECV_TOP       = isDarkMode ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.95)';
  const INPUT_OVERLAY  = isDarkMode ? 'rgba(4,10,5,0.50)' : 'rgba(255,255,255,0.40)';
  const INPUT_BORDER   = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.60)';
  const INPUT_PILL_BG  = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.70)';
  const INPUT_PILL_BRD = isDarkMode ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.85)';
  const SEP_BG         = isDarkMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.55)';
  const SEP_BORDER     = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.75)';
  const SEP_TEXT       = isDarkMode ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.60)';
  const SEP_LINE       = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.50)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#04331A' }, // fallback color while image loads
    kav:  { flex: 1, backgroundColor: 'transparent' },

    // ── Header ──────────────────────────────────────────────
    headerLight: { backgroundColor: '#0B6E36', paddingBottom: 14, overflow: 'hidden' },
    headerDark:  { backgroundColor: 'rgba(6,42,20,0.97)', paddingBottom: 14, overflow: 'hidden' },
    headerGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.20)' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 8, gap: 2 },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 4 },
    iconBtn: { padding: 8 },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
    headerIconCircle: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center', justifyContent: 'center',
    },

    // ── Search bar ───────────────────────────────────────────
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDarkMode ? '#1A1A1E' : '#FFFFFF',
      paddingHorizontal: 4, paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#EFEFEF',
    },
    searchClose: { padding: 8 },
    searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 4 },
    searchCount: { fontSize: 13, color: colors.secondaryText, paddingHorizontal: 6 },
    searchNav: { padding: 6 },

    // ── Header avatar ────────────────────────────────────────
    avatarLargeWrap: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.50)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarLargeImage: { width: 46, height: 46, borderRadius: 23 },
    avatarLargeText:  { fontSize: 18, fontWeight: '700', color: '#fff' },

    // ── Small in-chat avatar ─────────────────────────────────
    avatarSmall: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: '#0B6E36',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)',
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'flex-end', flexShrink: 0, overflow: 'hidden',
    },
    avatarSmallImage: { width: 30, height: 30, borderRadius: 15 },
    avatarSmallText:  { fontSize: 13, fontWeight: '700', color: '#fff' },

    // ── Message area — intentionally LOW opacity so wallpaper always shows ──
    messageArea: { flex: 1, overflow: 'hidden' },
    flatList: { backgroundColor: 'transparent' },
    list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8, gap: 4 },

    // ── Loading / error state (live chat) ────────────────────
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
    centerStateText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

    // ── Send error banner ────────────────────────────────────
    sendErrorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingTop: 8,
    },
    sendErrorText: { fontSize: 12, color: '#EF4444', fontWeight: '600', flexShrink: 1 },

    // ── Match highlight ──────────────────────────────────────
    rowHighlight: {
      backgroundColor: isDarkMode ? 'rgba(255,221,0,0.08)' : 'rgba(255,221,0,0.15)',
      borderRadius: 12,
      marginHorizontal: -4,
      paddingHorizontal: 4,
    },
    highlight: {
      backgroundColor: '#FFE066',
      color: '#111827',
      borderRadius: 3,
    },

    // ── Date separator ──────────────────────────────────────
    sep: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, paddingHorizontal: 16, gap: 10 },
    sepLine: { flex: 1, height: 1, backgroundColor: SEP_LINE },
    sepPill: { backgroundColor: SEP_BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: SEP_BORDER },
    sepText: { fontSize: 12, color: SEP_TEXT, fontWeight: '600', letterSpacing: 0.3 },

    // ── Message rows ────────────────────────────────────────
    row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2, gap: 6 },
    rowSent: { justifyContent: 'flex-end' },
    rowReceived: { justifyContent: 'flex-start' },

    // ── Bubbles ─────────────────────────────────────────────
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    bubbleSent: {
      backgroundColor: SENT_BG,
      borderColor: 'transparent',
      borderTopColor: 'rgba(255,255,255,0.10)',
      borderBottomRightRadius: 4,
    },
    bubbleReceived: {
      backgroundColor: RECV_BG,
      borderColor: RECV_BORDER,
      borderTopColor: RECV_TOP,
      borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextSent: { color: '#fff' },
    bubbleTextRecv: { color: isDarkMode ? 'rgba(255,255,255,0.95)' : '#111827' },

    // ── Time + ticks ────────────────────────────────────────
    timeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
    timeText: { fontSize: 11 },
    timeSent: { color: 'rgba(255,255,255,0.55)' },
    timeRecv: { color: isDarkMode ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)' },

    // ── Voice bubble ────────────────────────────────────────
    voiceBubble: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 8, minWidth: 180 },
    playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
    waveBar: { width: 3, borderRadius: 2 },
    voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

    // ── Input bar ────────────────────────────────────────────
    inputBarOuter: { overflow: 'hidden' },
    inputBarBlurOverlay: { backgroundColor: INPUT_OVERLAY },
    inputBarTopBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: INPUT_BORDER },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
    attachBtn: { paddingBottom: 10 },
    inputWrap: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120, backgroundColor: INPUT_PILL_BG, borderWidth: 1, borderColor: INPUT_PILL_BRD },
    input: { fontSize: 15, lineHeight: 20 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  });
}

import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import ActiveIndicator from '../../components/ActiveIndicator';

type ChatParams = { name: string; role?: string };

type Message = {
  id: string;
  text?: string;
  type: 'text' | 'voice' | 'sep';
  label?: string;
  sent: boolean;
  time: string;
  read?: boolean;
};

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

// Neon green colour constants
const NEON = '#00E87A';
const NEON_DIM = 'rgba(0,232,122,0.22)';
const NEON_BORDER = 'rgba(0,232,122,0.45)';
const NEON_GLOW_STRONG = 'rgba(0,232,122,0.55)';

function getNeonTheme(dark: boolean) {
  if (dark) {
    return {
      bg: ['#01080A', '#011510', '#020D08', '#01080A'] as const,
      headerBg: 'rgba(1,16,10,0.92)',
      headerBorder: NEON_BORDER,
      headerShine: NEON,
      avatarBg: 'rgba(0,232,122,0.12)',
      avatarBorder: NEON_BORDER,
      headerTitle: '#FFFFFF',
      headerSub: 'rgba(0,232,122,0.75)',
      iconColor: '#FFFFFF',
      pillBg: NEON_DIM,
      pillBorder: NEON_BORDER,
      pillText: NEON,
      sepLine: 'rgba(0,232,122,0.15)',
      sepPillBg: 'rgba(0,232,122,0.08)',
      sepPillBorder: 'rgba(0,232,122,0.25)',
      sepText: 'rgba(0,232,122,0.60)',
      recvBg: 'rgba(255,255,255,0.04)',
      recvBorder: 'rgba(0,232,122,0.18)',
      recvText: 'rgba(255,255,255,0.92)',
      smallAvatarBg: 'rgba(0,232,122,0.12)',
      smallAvatarBorder: NEON_BORDER,
      timeColor: 'rgba(0,232,122,0.45)',
      playBtnRecvBg: 'rgba(0,232,122,0.12)',
      waveRecv: 'rgba(0,232,122,0.55)',
      inputBarBg: 'rgba(1,16,10,0.96)',
      inputBarBorder: NEON_BORDER,
      inputFieldBg: 'rgba(0,232,122,0.06)',
      inputFieldBorder: NEON_BORDER,
      inputText: '#FFFFFF',
      placeholder: 'rgba(0,232,122,0.40)',
      attachColor: 'rgba(0,232,122,0.55)',
      sentGlow: NEON,
      readTick: NEON,
      unreadTick: 'rgba(255,255,255,0.30)',
    };
  }
  // Light mode: crystalline light with green neon accents
  return {
    bg: ['#E8F8EF', '#F0FFF6', '#E8F8EF', '#F0FFF6'] as const,
    headerBg: 'rgba(255,255,255,0.88)',
    headerBorder: 'rgba(26,107,46,0.35)',
    headerShine: '#1A6B2E',
    avatarBg: 'rgba(26,107,46,0.10)',
    avatarBorder: 'rgba(26,107,46,0.40)',
    headerTitle: '#0F2A15',
    headerSub: '#1A6B2E',
    iconColor: '#0F2A15',
    pillBg: 'rgba(26,107,46,0.10)',
    pillBorder: 'rgba(26,107,46,0.30)',
    pillText: '#1A6B2E',
    sepLine: 'rgba(26,107,46,0.15)',
    sepPillBg: 'rgba(255,255,255,0.85)',
    sepPillBorder: 'rgba(26,107,46,0.20)',
    sepText: 'rgba(26,107,46,0.60)',
    recvBg: 'rgba(255,255,255,0.90)',
    recvBorder: 'rgba(26,107,46,0.18)',
    recvText: '#1C2E20',
    smallAvatarBg: 'rgba(26,107,46,0.10)',
    smallAvatarBorder: 'rgba(26,107,46,0.35)',
    timeColor: 'rgba(26,107,46,0.55)',
    playBtnRecvBg: 'rgba(26,107,46,0.10)',
    waveRecv: 'rgba(26,107,46,0.60)',
    inputBarBg: 'rgba(255,255,255,0.92)',
    inputBarBorder: 'rgba(26,107,46,0.35)',
    inputFieldBg: 'rgba(26,107,46,0.06)',
    inputFieldBorder: 'rgba(26,107,46,0.25)',
    inputText: '#1C2E20',
    placeholder: 'rgba(26,107,46,0.38)',
    attachColor: 'rgba(26,107,46,0.55)',
    sentGlow: '#1A6B2E',
    readTick: '#1A6B2E',
    unreadTick: 'rgba(0,0,0,0.25)',
  };
}

export default function ChatScreen({ route, navigation }: { route: { params: ChatParams }; navigation: any }) {
  const { isDarkMode } = useTheme();
  const c = useMemo(() => getNeonTheme(isDarkMode), [isDarkMode]);

  const { name, role = 'AgroChain User' } = route.params;
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;
    const msg: Message = {
      id: Date.now().toString(),
      type: 'text',
      text,
      sent: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setMessages((prev) => [...prev, msg]);
    setInputText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const initial = name.trim()[0]?.toUpperCase() ?? '?';

  const renderItem = ({ item }: { item: Message }) => {
    // ── Date separator ──
    if (item.type === 'sep') {
      return (
        <View style={s.sep}>
          <View style={[s.sepLine, { backgroundColor: c.sepLine }]} />
          <View style={[s.sepPill, { backgroundColor: c.sepPillBg, borderColor: c.sepPillBorder }]}>
            <Text style={[s.sepText, { color: c.sepText }]}>{item.label}</Text>
          </View>
          <View style={[s.sepLine, { backgroundColor: c.sepLine }]} />
        </View>
      );
    }

    // ── Voice message ──
    if (item.type === 'voice') {
      const isSent = item.sent;
      return (
        <View style={[s.row, isSent ? s.rowSent : s.rowReceived]}>
          {!isSent && (
            <View style={[s.smallAvatar, { backgroundColor: c.smallAvatarBg, borderColor: c.smallAvatarBorder }]}>
              <Text style={[s.smallAvatarText, { color: isDarkMode ? NEON : '#1A6B2E' }]}>{initial}</Text>
            </View>
          )}
          <View>
            {isSent ? (
              <LinearGradient
                colors={isDarkMode ? ['#003D20', '#005C30'] : ['#1A6B2E', '#2E8B4A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.voiceBubble, s.sentGlowBox, { borderColor: isDarkMode ? NEON_BORDER : 'rgba(46,139,74,0.5)', shadowColor: c.sentGlow }]}
              >
                <View style={s.neonShine} />
                <TouchableOpacity style={[s.playBtn, { backgroundColor: isDarkMode ? NEON_DIM : 'rgba(255,255,255,0.25)' }]} activeOpacity={0.8}>
                  <Ionicons name="play" size={15} color={isDarkMode ? NEON : '#fff'} />
                </TouchableOpacity>
                <View style={s.waveform}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <View key={i} style={[s.waveBar, { height: h, backgroundColor: isDarkMode ? NEON : 'rgba(255,255,255,0.88)' }, i >= 9 && { opacity: 0.35 }]} />
                  ))}
                </View>
                <Text style={[s.voiceDur, { color: isDarkMode ? 'rgba(0,232,122,0.75)' : 'rgba(255,255,255,0.80)' }]}>0:22</Text>
              </LinearGradient>
            ) : (
              <View style={[s.voiceBubble, { backgroundColor: c.recvBg, borderColor: c.recvBorder, borderWidth: 1 }]}>
                <TouchableOpacity style={[s.playBtnRecv, { backgroundColor: c.playBtnRecvBg }]} activeOpacity={0.8}>
                  <Ionicons name="play" size={15} color={isDarkMode ? NEON : '#1A6B2E'} />
                </TouchableOpacity>
                <View style={s.waveform}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <View key={i} style={[s.waveBar, { height: h, backgroundColor: c.waveRecv }, i >= 9 && { opacity: 0.35 }]} />
                  ))}
                </View>
                <Text style={[s.voiceDur, { color: c.timeColor }]}>0:22</Text>
              </View>
            )}
            <View style={[s.timeMeta, isSent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
              <Text style={[s.timeText, { color: c.timeColor }]}>{item.time}</Text>
              {isSent && <Ionicons name="checkmark-done" size={13} color={item.read ? c.readTick : c.unreadTick} style={{ marginLeft: 2 }} />}
            </View>
          </View>
        </View>
      );
    }

    // ── Text message ──
    const isSent = item.sent;
    return (
      <View style={[s.row, isSent ? s.rowSent : s.rowReceived]}>
        {!isSent && (
          <View style={[s.smallAvatar, { backgroundColor: c.smallAvatarBg, borderColor: c.smallAvatarBorder }]}>
            <Text style={[s.smallAvatarText, { color: isDarkMode ? NEON : '#1A6B2E' }]}>{initial}</Text>
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          {isSent ? (
            <LinearGradient
              colors={isDarkMode ? ['#003D20', '#005C30'] : ['#1A6B2E', '#2E8B4A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.bubble, s.bubbleSent, s.sentGlowBox, { borderColor: isDarkMode ? NEON_BORDER : 'rgba(46,139,74,0.4)', shadowColor: c.sentGlow }]}
            >
              {/* Neon top-edge shine */}
              <View style={s.neonShine} />
              <Text style={[s.bubbleTextSent, { color: isDarkMode ? '#DFFFEF' : '#fff' }]}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={[s.bubble, s.bubbleRecv, { backgroundColor: c.recvBg, borderColor: c.recvBorder }]}>
              <Text style={[s.bubbleTextRecv, { color: c.recvText }]}>{item.text}</Text>
            </View>
          )}
          <View style={[s.timeMeta, isSent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
            <Text style={[s.timeText, { color: c.timeColor }]}>{item.time}</Text>
            {isSent && <Ionicons name="checkmark-done" size={13} color={item.read ? c.readTick : c.unreadTick} style={{ marginLeft: 2 }} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={c.bg} style={s.root}>
      {/* Ambient neon glow orbs */}
      {isDarkMode && (
        <>
          <View style={s.orbBottom} />
          <View style={s.orbTop} />
        </>
      )}

      {/* ── Neon Glass Header ── */}
      <View style={[s.header, { backgroundColor: c.headerBg, borderBottomColor: c.headerBorder }]}>
        {/* Neon top-edge line */}
        <View style={[s.headerNeonLine, { backgroundColor: c.headerShine, shadowColor: c.headerShine }]} />

        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={c.iconColor} />
            </TouchableOpacity>

            {/* Avatar with neon glow ring */}
            <View style={s.avatarWrap}>
              <View style={[s.avatarGlowRing, { shadowColor: isDarkMode ? NEON : '#1A6B2E' }]} />
              <View style={[s.avatarLarge, { backgroundColor: c.avatarBg, borderColor: c.avatarBorder, shadowColor: isDarkMode ? NEON : '#1A6B2E' }]}>
                <Text style={[s.avatarLargeText, { color: isDarkMode ? NEON : '#1A6B2E' }]}>{initial}</Text>
              </View>
              <View style={s.activeBadge}>
                <ActiveIndicator size={11} />
              </View>
            </View>

            <View style={s.headerInfo}>
              <Text style={[s.headerTitle, { color: c.headerTitle }]} numberOfLines={1}>{name}</Text>
              <View style={s.onlineRow}>
                <ActiveIndicator size={7} />
                <Text style={[s.onlineSub, { color: c.headerSub }]}>Active now · {role}</Text>
              </View>
            </View>

            {/* Neon-pill glass action buttons */}
            <TouchableOpacity style={[s.headerPill, { backgroundColor: c.pillBg, borderColor: c.pillBorder, shadowColor: isDarkMode ? NEON : '#1A6B2E' }]} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={17} color={isDarkMode ? NEON : '#1A6B2E'} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.headerPill, { backgroundColor: c.pillBg, borderColor: c.pillBorder, shadowColor: isDarkMode ? NEON : '#1A6B2E' }]} activeOpacity={0.7}>
              <Ionicons name="ellipsis-vertical" size={17} color={isDarkMode ? NEON : '#1A6B2E'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Neon bottom-edge line */}
        <View style={[s.headerNeonBottomLine, { backgroundColor: c.headerShine, shadowColor: c.headerShine }]} />
      </View>

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* ── Neon Glass Input Bar ── */}
        <View style={[s.inputBar, { backgroundColor: c.inputBarBg, borderTopColor: c.inputBarBorder, shadowColor: isDarkMode ? NEON : '#1A6B2E' }]}>
          {/* Neon top glow line on input bar */}
          <View style={[s.inputBarNeonLine, { backgroundColor: c.inputBarBorder, shadowColor: isDarkMode ? NEON : '#1A6B2E' }]} />

          <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color={c.attachColor} />
          </TouchableOpacity>

          <View style={[s.inputWrap, { backgroundColor: c.inputFieldBg, borderColor: c.inputFieldBorder }]}>
            <TextInput
              style={[s.input, { color: c.inputText }]}
              placeholder="Send a message..."
              placeholderTextColor={c.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
          </View>

          {/* Neon send button */}
          <TouchableOpacity onPress={inputText.trim() ? sendMessage : undefined} activeOpacity={0.82} style={[s.sendBtnWrap, { shadowColor: isDarkMode ? NEON : '#1A6B2E' }]}>
            <LinearGradient
              colors={isDarkMode ? ['#003D20', NEON] : ['#1A6B2E', '#2ECC71']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.sendBtn}
            >
              <View style={[s.sendBtnInnerRing, { borderColor: isDarkMode ? 'rgba(0,232,122,0.35)' : 'rgba(255,255,255,0.30)' }]} />
              <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={inputText.trim() ? 17 : 20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.inputBarBg }} />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Ambient neon orbs (dark mode only)
  orbBottom: {
    position: 'absolute',
    width: 340,
    height: 200,
    borderRadius: 170,
    backgroundColor: NEON,
    opacity: 0.07,
    bottom: -40,
    alignSelf: 'center',
  },
  orbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: NEON,
    opacity: 0.04,
    top: -60,
    right: -60,
  },

  // ── Header ──
  header: {
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerNeonLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 0,
  },
  headerNeonBottomLine: {
    height: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.70,
    shadowRadius: 8,
    elevation: 0,
    opacity: 0.60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  iconBtn: { padding: 6 },

  // Header neon-pill buttons (like Follow/Channel in the image)
  headerPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 8,
    elevation: 3,
  },

  // Avatar
  avatarWrap: { position: 'relative', width: 44, height: 44 },
  avatarGlowRing: {
    position: 'absolute',
    top: -5, left: -5, right: -5, bottom: -5,
    borderRadius: 27,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 0,
  },
  avatarLarge: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarLargeText: { fontSize: 18, fontWeight: '800' },
  activeBadge: { position: 'absolute', bottom: -2, right: -2 },

  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  onlineSub: { fontSize: 11, fontWeight: '600' },

  // Date separator
  sep: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 16, gap: 10 },
  sepLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sepPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  sepText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },

  // Message list
  list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2, gap: 6 },
  rowSent: { justifyContent: 'flex-end' },
  rowReceived: { justifyContent: 'flex-start' },

  // Small avatar
  smallAvatar: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', flexShrink: 0,
  },
  smallAvatarText: { fontSize: 13, fontWeight: '800' },

  // Bubble base
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, overflow: 'hidden' },
  bubbleSent: { borderBottomRightRadius: 5, borderWidth: 1 },
  bubbleRecv: { borderWidth: 1, borderBottomLeftRadius: 5 },

  // Neon glow on sent bubbles
  sentGlowBox: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 6,
  },
  // Neon top-edge shine inside sent bubble
  neonShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: NEON_GLOW_STRONG,
  },

  bubbleTextSent: { fontSize: 15, lineHeight: 21 },
  bubbleTextRecv: { fontSize: 15, lineHeight: 21 },

  // Time row
  timeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
  timeText: { fontSize: 11, fontWeight: '500' },

  // Voice bubble
  voiceBubble: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 22, gap: 8, minWidth: 186,
    overflow: 'hidden',
  },
  playBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  playBtnRecv: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  waveBar: { width: 3, borderRadius: 2 },
  voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

  // Glass input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 10, gap: 8,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  inputBarNeonLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 0,
  },
  attachBtn: { paddingBottom: 10 },
  inputWrap: {
    flex: 1, borderRadius: 26,
    paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 120, borderWidth: 1.5,
  },
  input: { fontSize: 15, lineHeight: 20 },

  // Neon send button
  sendBtnWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.70,
    shadowRadius: 14,
    elevation: 8,
    borderRadius: 24,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  sendBtnInnerRing: {
    position: 'absolute',
    top: 3, left: 3, right: 3, bottom: 3,
    borderRadius: 21,
    borderWidth: 1,
  },
});

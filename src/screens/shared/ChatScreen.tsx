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

function getCrystal(dark: boolean) {
  if (dark) {
    return {
      bg: ['#060F1A', '#0C1E30', '#091628', '#060F1A'] as const,
      orb1: '#22c55e', orb1o: 0.10,
      orb2: '#0ea5e9', orb2o: 0.08,
      orb3: '#818cf8', orb3o: 0.06,
      headerBg: 'rgba(255,255,255,0.05)',
      headerBorder: 'rgba(255,255,255,0.08)',
      headerShine: 'rgba(255,255,255,0.12)',
      avatarBg: 'rgba(34,197,94,0.20)',
      avatarBorder: 'rgba(34,197,94,0.50)',
      avatarGlow: 'rgba(34,197,94,0.15)',
      headerTitle: '#FFFFFF',
      headerSub: 'rgba(255,255,255,0.58)',
      iconColor: 'rgba(255,255,255,0.88)',
      sepLine: 'rgba(255,255,255,0.08)',
      sepPillBg: 'rgba(255,255,255,0.07)',
      sepPillBorder: 'rgba(255,255,255,0.12)',
      sepText: 'rgba(255,255,255,0.42)',
      recvBg: 'rgba(255,255,255,0.08)',
      recvBorder: 'rgba(255,255,255,0.14)',
      recvHighlight: 'rgba(255,255,255,0.04)',
      recvText: 'rgba(255,255,255,0.92)',
      smallAvatarBg: 'rgba(34,197,94,0.18)',
      smallAvatarBorder: 'rgba(34,197,94,0.38)',
      timeColor: 'rgba(255,255,255,0.36)',
      playBtnRecvBg: 'rgba(255,255,255,0.12)',
      waveRecv: 'rgba(255,255,255,0.52)',
      inputBarBg: 'rgba(12,30,48,0.80)',
      inputBarBorder: 'rgba(255,255,255,0.08)',
      inputFieldBg: 'rgba(255,255,255,0.08)',
      inputFieldBorder: 'rgba(255,255,255,0.12)',
      inputText: 'rgba(255,255,255,0.92)',
      placeholder: 'rgba(255,255,255,0.28)',
      attachColor: 'rgba(255,255,255,0.48)',
      sentGradient: ['#1A6B2E', '#22c55e'] as const,
      readTick: '#4ade80',
      unreadTick: 'rgba(255,255,255,0.32)',
    };
  }
  return {
    bg: ['#DFF0F8', '#EEF6FF', '#F5FAFF', '#DFF0F8'] as const,
    orb1: '#16a34a', orb1o: 0.10,
    orb2: '#3b82f6', orb2o: 0.08,
    orb3: '#8b5cf6', orb3o: 0.06,
    headerBg: 'rgba(255,255,255,0.78)',
    headerBorder: 'rgba(0,0,0,0.06)',
    headerShine: 'rgba(255,255,255,0.90)',
    avatarBg: 'rgba(26,107,46,0.12)',
    avatarBorder: 'rgba(26,107,46,0.35)',
    avatarGlow: 'rgba(26,107,46,0.10)',
    headerTitle: '#0F172A',
    headerSub: 'rgba(15,23,42,0.52)',
    iconColor: '#0F172A',
    sepLine: 'rgba(0,0,0,0.08)',
    sepPillBg: 'rgba(255,255,255,0.80)',
    sepPillBorder: 'rgba(0,0,0,0.07)',
    sepText: 'rgba(0,0,0,0.42)',
    recvBg: 'rgba(255,255,255,0.88)',
    recvBorder: 'rgba(0,0,0,0.07)',
    recvHighlight: 'rgba(255,255,255,0.60)',
    recvText: '#1E293B',
    smallAvatarBg: 'rgba(26,107,46,0.12)',
    smallAvatarBorder: 'rgba(26,107,46,0.30)',
    timeColor: 'rgba(0,0,0,0.36)',
    playBtnRecvBg: 'rgba(0,0,0,0.10)',
    waveRecv: 'rgba(0,0,0,0.45)',
    inputBarBg: 'rgba(255,255,255,0.78)',
    inputBarBorder: 'rgba(0,0,0,0.06)',
    inputFieldBg: 'rgba(0,0,0,0.04)',
    inputFieldBorder: 'rgba(0,0,0,0.08)',
    inputText: '#1E293B',
    placeholder: 'rgba(0,0,0,0.28)',
    attachColor: 'rgba(0,0,0,0.42)',
    sentGradient: ['#1A6B2E', '#22c55e'] as const,
    readTick: '#16a34a',
    unreadTick: 'rgba(255,255,255,0.50)',
  };
}

export default function ChatScreen({ route, navigation }: { route: { params: ChatParams }; navigation: any }) {
  const { isDarkMode } = useTheme();
  const c = useMemo(() => getCrystal(isDarkMode), [isDarkMode]);

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
              <Text style={s.smallAvatarText}>{initial}</Text>
            </View>
          )}
          <View>
            {isSent ? (
              <LinearGradient
                colors={c.sentGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.voiceBubble, s.voiceSentGlow]}
              >
                <TouchableOpacity style={s.playBtnSent} activeOpacity={0.8}>
                  <Ionicons name="play" size={15} color="#fff" />
                </TouchableOpacity>
                <View style={s.waveform}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <View key={i} style={[s.waveBar, s.waveBarSent, { height: h }, i >= 9 && { opacity: 0.35 }]} />
                  ))}
                </View>
                <Text style={s.voiceDurSent}>0:22</Text>
              </LinearGradient>
            ) : (
              <View style={[s.voiceBubble, { backgroundColor: c.recvBg, borderColor: c.recvBorder, borderWidth: 1 }]}>
                <TouchableOpacity style={[s.playBtnRecv, { backgroundColor: c.playBtnRecvBg }]} activeOpacity={0.8}>
                  <Ionicons name="play" size={15} color={isDarkMode ? '#fff' : '#1A6B2E'} />
                </TouchableOpacity>
                <View style={s.waveform}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <View key={i} style={[s.waveBar, { backgroundColor: c.waveRecv, height: h }, i >= 9 && { opacity: 0.35 }]} />
                  ))}
                </View>
                <Text style={[s.voiceDurRecv, { color: c.timeColor }]}>0:22</Text>
              </View>
            )}
            <View style={[s.timeMeta, isSent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
              <Text style={[s.timeText, { color: c.timeColor }]}>{item.time}</Text>
              {isSent && (
                <Ionicons name="checkmark-done" size={13} color={item.read ? c.readTick : c.unreadTick} style={{ marginLeft: 2 }} />
              )}
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
            <Text style={s.smallAvatarText}>{initial}</Text>
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          {isSent ? (
            <LinearGradient
              colors={c.sentGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.bubble, s.bubbleSent, s.voiceSentGlow]}
            >
              {/* Inner shine line */}
              <View style={s.bubbleSentShine} />
              <Text style={s.bubbleTextSent}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={[s.bubble, s.bubbleRecv, { backgroundColor: c.recvBg, borderColor: c.recvBorder }]}>
              {/* Inner top highlight */}
              <View style={[s.bubbleRecvShine, { backgroundColor: c.recvHighlight }]} />
              <Text style={[s.bubbleTextRecv, { color: c.recvText }]}>{item.text}</Text>
            </View>
          )}
          <View style={[s.timeMeta, isSent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
            <Text style={[s.timeText, { color: c.timeColor }]}>{item.time}</Text>
            {isSent && (
              <Ionicons name="checkmark-done" size={13} color={item.read ? c.readTick : c.unreadTick} style={{ marginLeft: 2 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={c.bg} style={s.root}>
      {/* Crystalline ambient orbs */}
      <View style={[s.orb1, { backgroundColor: c.orb1, opacity: c.orb1o }]} />
      <View style={[s.orb2, { backgroundColor: c.orb2, opacity: c.orb2o }]} />
      <View style={[s.orb3, { backgroundColor: c.orb3, opacity: c.orb3o }]} />

      {/* Glass header */}
      <View style={[s.header, { backgroundColor: c.headerBg, borderBottomColor: c.headerBorder }]}>
        {/* Top shine strip */}
        <View style={[s.headerShine, { backgroundColor: c.headerShine }]} />
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={c.iconColor} />
            </TouchableOpacity>

            {/* Avatar with glow ring + active badge */}
            <View style={s.avatarWrap}>
              <View style={[s.avatarGlowRing, { backgroundColor: c.avatarGlow }]} />
              <View style={[s.avatarLarge, { backgroundColor: c.avatarBg, borderColor: c.avatarBorder }]}>
                <Text style={[s.avatarLargeText, { color: isDarkMode ? '#fff' : '#1A6B2E' }]}>{initial}</Text>
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

            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <View style={[s.iconGlassPill, { backgroundColor: c.avatarBg }]}>
                <Ionicons name="call-outline" size={18} color={c.iconColor} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <Ionicons name="ellipsis-vertical" size={20} color={c.iconColor} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Messages + Input */}
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

        {/* Glass input bar */}
        <View style={[s.inputBar, { backgroundColor: c.inputBarBg, borderTopColor: c.inputBarBorder }]}>
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

          <TouchableOpacity onPress={inputText.trim() ? sendMessage : undefined} activeOpacity={0.82}>
            <LinearGradient colors={['#1A6B2E', '#2ECC71']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sendBtn}>
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

  // Ambient orbs
  orb1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -110, right: -90 },
  orb2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, bottom: 80, left: -90 },
  orb3: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: '42%', right: -50 },

  // Glass header
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  headerShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 8,
    gap: 4,
  },
  iconBtn: { padding: 8 },
  iconGlassPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar with glow ring
  avatarWrap: { position: 'relative', marginHorizontal: 4, width: 46, height: 46 },
  avatarGlowRing: {
    position: 'absolute',
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 27,
  },
  avatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: { fontSize: 18, fontWeight: '700' },
  activeBadge: { position: 'absolute', bottom: -2, right: -2 },

  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  onlineSub: { fontSize: 12 },

  // Date separator
  sep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  sepLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sepPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sepText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  // Message list
  list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2, gap: 6 },
  rowSent: { justifyContent: 'flex-end' },
  rowReceived: { justifyContent: 'flex-start' },

  // Small avatar
  smallAvatar: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', flexShrink: 0,
  },
  smallAvatarText: { fontSize: 13, fontWeight: '700', color: '#1A6B2E' },

  // Text bubbles
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, overflow: 'hidden' },
  bubbleSent: { borderBottomRightRadius: 5 },
  bubbleRecv: { borderWidth: 1, borderBottomLeftRadius: 5 },
  bubbleSentShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  bubbleRecvShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  voiceSentGlow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 6,
  },
  bubbleTextSent: { fontSize: 15, lineHeight: 21, color: '#fff' },
  bubbleTextRecv: { fontSize: 15, lineHeight: 21 },

  // Time row
  timeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
  timeText: { fontSize: 11 },

  // Voice bubble
  voiceBubble: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 22, gap: 8, minWidth: 186,
    overflow: 'hidden',
  },
  playBtnSent: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  playBtnRecv: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  waveBar: { width: 3, borderRadius: 2 },
  waveBarSent: { backgroundColor: 'rgba(255,255,255,0.88)' },
  voiceDurSent: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', flexShrink: 0 },
  voiceDurRecv: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

  // Glass input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 10, gap: 8,
    borderTopWidth: 1,
  },
  attachBtn: { paddingBottom: 10 },
  inputWrap: {
    flex: 1, borderRadius: 26,
    paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 120, borderWidth: 1,
  },
  input: { fontSize: 15, lineHeight: 20 },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
});

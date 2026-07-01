import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
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

export default function ChatScreen({ route, navigation }: { route: { params: ChatParams }; navigation: any }) {
  const { colors, isDarkMode } = useTheme();
  const s = createStyles(colors, isDarkMode);
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
    if (item.type === 'sep') {
      return (
        <View style={s.sep}>
          <View style={s.sepPill}>
            <Text style={s.sepText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'voice') {
      return (
        <View style={[s.row, item.sent ? s.rowSent : s.rowReceived]}>
          {!item.sent && (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
          )}
          <View>
            <View style={[s.voiceBubble, item.sent ? s.bubbleSent : s.bubbleReceived]}>
              <TouchableOpacity style={s.playBtn} activeOpacity={0.8}>
                <Ionicons name="play" size={15} color="#fff" />
              </TouchableOpacity>
              <View style={s.waveform}>
                {WAVE_HEIGHTS.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      s.waveBar,
                      { height: h },
                      item.sent
                        ? { backgroundColor: 'rgba(255,255,255,0.85)' }
                        : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.35)' },
                      i >= 9 && { opacity: 0.4 },
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.voiceDur, item.sent ? { color: 'rgba(255,255,255,0.75)' } : { color: colors.secondaryText }]}>
                0:22
              </Text>
            </View>
            <View style={[s.timeMeta, item.sent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
              <Text style={[s.time, item.sent ? s.timeSent : s.timeRecv]}>{item.time}</Text>
              {item.sent && (
                <Ionicons
                  name="checkmark-done"
                  size={13}
                  color={item.read ? '#4ade80' : colors.secondaryText}
                  style={{ marginLeft: 2 }}
                />
              )}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[s.row, item.sent ? s.rowSent : s.rowReceived]}>
        {!item.sent && (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          <View style={[s.bubble, item.sent ? s.bubbleSent : s.bubbleReceived]}>
            <Text style={[s.bubbleText, item.sent ? s.bubbleTextSent : s.bubbleTextRecv]}>
              {item.text}
            </Text>
          </View>
          <View style={[s.timeMeta, item.sent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
            <Text style={[s.time, item.sent ? s.timeSent : s.timeRecv]}>{item.time}</Text>
            {item.sent && (
              <Ionicons
                name="checkmark-done"
                size={13}
                color={item.read ? '#4ade80' : colors.secondaryText}
                style={{ marginLeft: 2 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      {isDarkMode ? (
        <View style={s.headerDark}>
          <SafeAreaView edges={['top']}>
            <View style={s.headerRow}>
              <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
                <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.90)" />
              </TouchableOpacity>

              <View style={{ position: 'relative', marginHorizontal: 4 }}>
                <View style={s.avatarLarge}>
                  <Text style={s.avatarLargeText}>{initial}</Text>
                </View>
                <View style={{ position: 'absolute', bottom: -3, right: -3 }}>
                  <ActiveIndicator size={11} />
                </View>
              </View>

              <View style={s.headerInfo}>
                <Text style={s.headerName} numberOfLines={1}>{name}</Text>
                <View style={s.onlineRow}>
                  <ActiveIndicator size={7} />
                  <Text style={s.onlineSub}>Active now · {role}</Text>
                </View>
              </View>

              <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
                <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
                <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      ) : (
        <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.headerGrad}>
          <SafeAreaView edges={['top']}>
            <View style={s.headerRow}>
              <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              <View style={{ position: 'relative', marginHorizontal: 4 }}>
                <View style={s.avatarLargeLight}>
                  <Text style={s.avatarLargeText}>{initial}</Text>
                </View>
                <View style={{ position: 'absolute', bottom: -3, right: -3 }}>
                  <ActiveIndicator size={11} />
                </View>
              </View>

              <View style={s.headerInfo}>
                <Text style={s.headerName} numberOfLines={1}>{name}</Text>
                <View style={s.onlineRow}>
                  <ActiveIndicator size={7} />
                  <Text style={s.onlineSub}>Active now · {role}</Text>
                </View>
              </View>

              <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
                <Ionicons name="call-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
                <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      )}

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={[s.flex, { backgroundColor: s.msgBg.backgroundColor }]}
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

        {/* ── Input Bar ── */}
        <View style={s.inputBar}>
          <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Send a message..."
              placeholderTextColor={colors.secondaryText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
          </View>

          {inputText.trim() ? (
            <TouchableOpacity onPress={sendMessage} activeOpacity={0.8}>
              <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.sendBtn}>
                <Ionicons name="send" size={17} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.sendBtn}>
                <Ionicons name="mic" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <SafeAreaView edges={['bottom']} style={s.inputBarSafe} />
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  // ── palette tokens ──
  const bgColor = isDarkMode ? '#0E0E10' : '#F4F5F7';
  const headerDarkBg = 'rgba(20,20,24,0.99)';
  const headerDarkBorder = 'rgba(255,255,255,0.08)';

  const bubbleSentBg = isDarkMode ? 'rgba(18,68,32,0.92)' : colors.primaryGreen;
  const bubbleSentBorder = isDarkMode ? 'rgba(60,160,80,0.28)' : 'transparent';

  const bubbleRecvBg = isDarkMode ? 'rgba(30,30,36,0.95)' : '#FFFFFF';
  const bubbleRecvBorder = isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';

  const inputBarBg = isDarkMode ? 'rgba(14,14,18,0.99)' : '#FFFFFF';
  const inputBarBorder = isDarkMode ? 'rgba(255,255,255,0.09)' : '#E8EAED';

  const inputBg = isDarkMode ? 'rgba(30,30,36,0.95)' : '#F0F2F5';

  const sepPillBg = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
  const sepTextColor = isDarkMode ? 'rgba(255,255,255,0.55)' : colors.secondaryText;

  const avatarBg = isDarkMode ? 'rgba(255,255,255,0.10)' : colors.primaryGreen;
  const avatarBorder = isDarkMode ? 'rgba(255,255,255,0.20)' : 'transparent';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: isDarkMode ? '#0E0E10' : colors.primaryGreen },
    flex: { flex: 1 },
    msgBg: { backgroundColor: bgColor },

    // ── Dark header ──
    headerDark: {
      backgroundColor: headerDarkBg,
      borderBottomWidth: 1,
      borderBottomColor: headerDarkBorder,
      paddingBottom: 12,
    },

    // ── Light header (gradient wrapper) ──
    headerGrad: { paddingBottom: 12 },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingTop: 8,
      gap: 4,
    },
    iconBtn: { padding: 8 },

    // Large avatar — dark mode: glass circle
    avatarLarge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: avatarBg,
      borderWidth: 1.5,
      borderColor: avatarBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    // Light mode large avatar
    avatarLargeLight: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    avatarLargeText: { fontSize: 18, fontWeight: '700', color: '#fff' },

    headerInfo: { flex: 1 },
    headerName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    onlineSub: {
      fontSize: 12,
      color: isDarkMode ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.85)',
    },

    // ── Date separator ──
    sep: {
      alignItems: 'center',
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    sepPill: {
      backgroundColor: sepPillBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
    },
    sepText: { fontSize: 12, color: sepTextColor, fontWeight: '600' },

    // ── Messages ──
    list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: 2,
      gap: 6,
    },
    rowSent: { justifyContent: 'flex-end' },
    rowReceived: { justifyContent: 'flex-start' },

    // Small avatar
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: avatarBg,
      borderWidth: 1,
      borderColor: avatarBorder,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
      flexShrink: 0,
    },
    avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Bubbles
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    bubbleSent: {
      backgroundColor: bubbleSentBg,
      borderColor: bubbleSentBorder,
      borderBottomRightRadius: 4,
    },
    bubbleReceived: {
      backgroundColor: bubbleRecvBg,
      borderColor: bubbleRecvBorder,
      borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextSent: { color: '#fff' },
    bubbleTextRecv: { color: isDarkMode ? 'rgba(255,255,255,0.90)' : colors.text },

    // Time row
    timeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      gap: 2,
    },
    time: { fontSize: 11 },
    timeSent: { color: isDarkMode ? 'rgba(255,255,255,0.40)' : colors.secondaryText },
    timeRecv: { color: isDarkMode ? 'rgba(255,255,255,0.35)' : colors.secondaryText },

    // Voice bubble
    voiceBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      gap: 8,
      minWidth: 180,
    },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.20)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    waveform: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      height: 24,
    },
    waveBar: {
      width: 3,
      borderRadius: 2,
    },
    voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

    // Input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: inputBarBg,
      borderTopWidth: 1,
      borderTopColor: inputBarBorder,
    },
    inputBarSafe: { backgroundColor: inputBarBg },
    attachBtn: { paddingBottom: 10 },
    inputWrap: {
      flex: 1,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 120,
      backgroundColor: inputBg,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'transparent',
    },
    input: { fontSize: 15, lineHeight: 20 },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

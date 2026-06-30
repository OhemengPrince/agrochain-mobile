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
  const { colors } = useTheme();
  const s = createStyles(colors);
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
    // Date separator
    if (item.type === 'sep') {
      return (
        <View style={s.sep}>
          <View style={s.sepLine} />
          <Text style={s.sepText}>{item.label}</Text>
          <View style={s.sepLine} />
        </View>
      );
    }

    // Voice message
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

    // Text message
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
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={s.avatarLarge}>
              <Text style={s.avatarLargeText}>{initial}</Text>
            </View>

            <View style={s.headerInfo}>
              <Text style={s.headerName} numberOfLines={1}>{name}</Text>
              <View style={s.onlineRow}>
                <View style={s.onlineDot} />
                <Text style={s.onlineSub}>{role}</Text>
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

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={[s.flex, { backgroundColor: colors.background }]}
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
        <View style={[s.inputBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={[s.inputWrap, { backgroundColor: colors.inputBackground }]}>
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
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }} />
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryGreen },
    flex: { flex: 1 },

    // Header
    headerGrad: { paddingBottom: 12 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingTop: 8,
      gap: 4,
    },
    iconBtn: { padding: 8 },
    avatarLarge: {
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
    headerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#4ade80',
    },
    onlineSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },

    // Date separator
    sep: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      paddingHorizontal: 16,
      gap: 10,
    },
    sepLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    sepText: { fontSize: 12, color: colors.secondaryText, fontWeight: '600' },

    // Messages
    list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: 2,
      gap: 6,
    },
    rowSent: { justifyContent: 'flex-end' },
    rowReceived: { justifyContent: 'flex-start' },

    // Small avatar (received side)
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
      flexShrink: 0,
    },
    avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Bubble
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
    },
    bubbleSent: {
      backgroundColor: colors.primaryGreen,
      borderBottomRightRadius: 4,
    },
    bubbleReceived: {
      backgroundColor: colors.card,
      borderBottomLeftRadius: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextSent: { color: '#fff' },
    bubbleTextRecv: { color: colors.text },

    // Time + checkmark row
    timeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      gap: 2,
    },
    time: { fontSize: 11 },
    timeSent: { color: colors.secondaryText },
    timeRecv: { color: colors.secondaryText },

    // Voice bubble
    voiceBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
      minWidth: 180,
    },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.25)',
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
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

    // Input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    attachBtn: { paddingBottom: 10 },
    inputWrap: {
      flex: 1,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 120,
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

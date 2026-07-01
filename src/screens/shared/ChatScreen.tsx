import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
          <View style={s.sepPill}>
            <Text style={s.sepText}>{item.label}</Text>
          </View>
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
            {item.sent ? (
              <LinearGradient
                colors={['rgba(26,107,46,0.98)', 'rgba(34,197,94,0.88)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.voiceBubble, s.voiceBubbleSent]}
              >
                <TouchableOpacity style={s.playBtn} activeOpacity={0.8}>
                  <Ionicons name="play" size={15} color="#fff" />
                </TouchableOpacity>
                <View style={s.waveform}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <View key={i} style={[s.waveBar, { height: h }, i >= 9 && { opacity: 0.35 }]} />
                  ))}
                </View>
                <Text style={[s.voiceDur, { color: 'rgba(255,255,255,0.75)' }]}>0:22</Text>
              </LinearGradient>
            ) : (
              <View style={[s.voiceBubble, s.voiceBubbleRecv]}>
                <TouchableOpacity style={s.playBtnRecv} activeOpacity={0.8}>
                  <Ionicons name="play" size={15} color="#fff" />
                </TouchableOpacity>
                <View style={s.waveform}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <View key={i} style={[s.waveBarRecv, { height: h }, i >= 9 && { opacity: 0.35 }]} />
                  ))}
                </View>
                <Text style={[s.voiceDur, { color: 'rgba(255,255,255,0.55)' }]}>0:22</Text>
              </View>
            )}
            <View style={[s.timeMeta, item.sent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
              <Text style={s.time}>{item.time}</Text>
              {item.sent && (
                <Ionicons
                  name="checkmark-done"
                  size={13}
                  color={item.read ? '#4ade80' : 'rgba(255,255,255,0.35)'}
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
          {item.sent ? (
            <LinearGradient
              colors={['rgba(26,107,46,0.98)', 'rgba(34,197,94,0.88)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.bubble, s.bubbleSent]}
            >
              <Text style={s.bubbleTextSent}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={[s.bubble, s.bubbleReceived]}>
              <Text style={s.bubbleTextRecv}>{item.text}</Text>
            </View>
          )}
          <View style={[s.timeMeta, item.sent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
            <Text style={s.time}>{item.time}</Text>
            {item.sent && (
              <Ionicons
                name="checkmark-done"
                size={13}
                color={item.read ? '#4ade80' : 'rgba(255,255,255,0.35)'}
                style={{ marginLeft: 2 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#071422', '#0D2035', '#0A1B2E', '#071422']} style={s.root}>
      {/* Crystalline ambient orbs */}
      <View style={[s.orb, s.orb1]} />
      <View style={[s.orb, s.orb2]} />
      <View style={[s.orb, s.orb3]} />

      {/* Glass header */}
      <View style={s.headerGlass}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>

            {/* Avatar with pulsing active badge */}
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
              <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
              <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.9)" />
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
        <View style={s.inputBar}>
          <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Send a message..."
              placeholderTextColor="rgba(255,255,255,0.30)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
          </View>

          {inputText.trim() ? (
            <TouchableOpacity onPress={sendMessage} activeOpacity={0.8}>
              <LinearGradient colors={['#1A6B2E', '#22c55e']} style={s.sendBtn}>
                <Ionicons name="send" size={17} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient colors={['#1A6B2E', '#22c55e']} style={s.sendBtn}>
                <Ionicons name="mic" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }} />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Ambient crystalline orbs (subtle colour bleed behind glass panels)
  orb: { position: 'absolute', borderRadius: 9999 },
  orb1: {
    width: 300,
    height: 300,
    backgroundColor: '#22c55e',
    opacity: 0.09,
    top: -100,
    right: -80,
  },
  orb2: {
    width: 240,
    height: 240,
    backgroundColor: '#0ea5e9',
    opacity: 0.07,
    bottom: 100,
    left: -80,
  },
  orb3: {
    width: 160,
    height: 160,
    backgroundColor: '#a78bfa',
    opacity: 0.05,
    top: '45%',
    right: -40,
  },

  // Frosted glass header
  headerGlass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.09)',
    paddingBottom: 12,
  },
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
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  avatarLargeText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  onlineSub: { fontSize: 12, color: 'rgba(255,255,255,0.60)' },

  // Date separator
  sep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  sepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.09)' },
  sepPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  sepText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },

  // Message list
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
    backgroundColor: 'rgba(34,197,94,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Text bubbles
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleSent: {
    borderBottomRightRadius: 4,
    // green glow
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  bubbleReceived: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderBottomLeftRadius: 4,
  },
  bubbleTextSent: { fontSize: 15, lineHeight: 21, color: '#fff' },
  bubbleTextRecv: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.90)' },

  // Time + checkmark row
  timeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 2,
  },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.38)' },

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
  voiceBubbleSent: {
    borderBottomRightRadius: 4,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  voiceBubbleRecv: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderBottomLeftRadius: 4,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playBtnRecv: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.13)',
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
  waveBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.90)' },
  waveBarRecv: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' },
  voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

  // Glass input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  attachBtn: { paddingBottom: 10 },
  inputWrap: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  input: { fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.92)' },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
});

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
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
  const { name, role = 'AgroChain User' } = route.params;

  const [messages, setMessages] = useState<Message[]>(SEED);
  const [inputText, setInputText] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const initial = name.trim()[0]?.toUpperCase() ?? '?';

  const handleUpdateProfilePicture = async () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose how you want to update the profile photo.',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Allow camera access to take a profile photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled) setProfileImageUri(result.assets[0].uri);
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled) setProfileImageUri(result.assets[0].uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

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

  const s = createStyles(colors, isDarkMode);

  const renderItem = ({ item }: { item: Message }) => {
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

    if (item.type === 'voice') {
      return (
        <View style={[s.row, item.sent ? s.rowSent : s.rowReceived]}>
          {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} />}
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
                        : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.30)' },
                      i >= 9 && { opacity: 0.38 },
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.voiceDur, { color: item.sent ? 'rgba(255,255,255,0.75)' : colors.secondaryText }]}>
                0:22
              </Text>
            </View>
            <TimeMeta sent={item.sent} time={item.time} read={item.read} s={s} colors={colors} />
          </View>
        </View>
      );
    }

    return (
      <View style={[s.row, item.sent ? s.rowSent : s.rowReceived]}>
        {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} />}
        <View style={{ maxWidth: '75%' }}>
          <View style={[s.bubble, item.sent ? s.bubbleSent : s.bubbleReceived]}>
            <Text style={[s.bubbleText, item.sent ? s.bubbleTextSent : s.bubbleTextRecv]}>
              {item.text}
            </Text>
          </View>
          <TimeMeta sent={item.sent} time={item.time} read={item.read} s={s} colors={colors} />
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      {isDarkMode ? (
        <DarkHeader
          name={name}
          role={role}
          initial={initial}
          profileImageUri={profileImageUri}
          onBack={() => navigation.goBack()}
          onUpdatePhoto={handleUpdateProfilePicture}
          s={s}
        />
      ) : (
        <LightHeader
          name={name}
          role={role}
          initial={initial}
          profileImageUri={profileImageUri}
          onBack={() => navigation.goBack()}
          onUpdatePhoto={handleUpdateProfilePicture}
          s={s}
          colors={colors}
        />
      )}

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
          style={{ backgroundColor: s.root.backgroundColor }}
        />

        {/* ── Input Bar ── */}
        <View style={s.inputBar}>
          <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, { color: isDarkMode ? '#fff' : colors.text }]}
              placeholder="Send a message..."
              placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.35)' : colors.secondaryText}
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
        <SafeAreaView edges={['bottom']} style={s.inputSafeArea} />
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SmallAvatar({ initial, profileUri, s }: { initial: string; profileUri: string | null; s: any }) {
  return (
    <View style={s.avatarSmall}>
      {profileUri ? (
        <Image source={{ uri: profileUri }} style={s.avatarSmallImage} />
      ) : (
        <Text style={s.avatarSmallText}>{initial}</Text>
      )}
    </View>
  );
}

function TimeMeta({ sent, time, read, s, colors }: {
  sent: boolean; time: string; read?: boolean; s: any; colors: ThemeColors;
}) {
  return (
    <View style={[s.timeMeta, sent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
      <Text style={[s.timeText, sent ? s.timeSent : s.timeRecv]}>{time}</Text>
      {sent && (
        <Ionicons
          name="checkmark-done"
          size={13}
          color={read ? '#4ade80' : colors.secondaryText}
          style={{ marginLeft: 2 }}
        />
      )}
    </View>
  );
}

function AvatarWithCamera({
  initial, profileUri, onUpdatePhoto, largeStyle, imageStyle, textStyle, cameraBadgeStyle, cameraIconColor,
}: {
  initial: string;
  profileUri: string | null;
  onUpdatePhoto: () => void;
  largeStyle: any;
  imageStyle: any;
  textStyle: any;
  cameraBadgeStyle: any;
  cameraIconColor: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onUpdatePhoto} style={{ position: 'relative' }}>
      <View style={largeStyle}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={imageStyle} />
        ) : (
          <Text style={textStyle}>{initial}</Text>
        )}
      </View>
      {/* Camera badge */}
      <View style={cameraBadgeStyle}>
        <Ionicons name="camera" size={11} color={cameraIconColor} />
      </View>
    </TouchableOpacity>
  );
}

function DarkHeader({ name, role, initial, profileImageUri, onBack, onUpdatePhoto, s }: {
  name: string; role: string; initial: string; profileImageUri: string | null;
  onBack: () => void; onUpdatePhoto: () => void; s: any;
}) {
  return (
    <View style={s.darkHeader}>
      {/* Gloss highlight strip at top */}
      <View style={s.darkHeaderGloss} />
      <SafeAreaView edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={{ position: 'relative', marginHorizontal: 6 }}>
            <AvatarWithCamera
              initial={initial}
              profileUri={profileImageUri}
              onUpdatePhoto={onUpdatePhoto}
              largeStyle={s.avatarLargeDark}
              imageStyle={s.avatarLargeImage}
              textStyle={s.avatarLargeText}
              cameraBadgeStyle={s.cameraBadgeDark}
              cameraIconColor="rgba(255,255,255,0.90)"
            />
            <View style={{ position: 'absolute', bottom: 2, right: 20 }}>
              <ActiveIndicator size={10} />
            </View>
          </View>

          <View style={s.headerInfo}>
            <Text style={s.headerNameDark} numberOfLines={1}>{name}</Text>
            <View style={s.onlineRow}>
              <ActiveIndicator size={6} />
              <Text style={s.onlineSubDark}>Active now · {role}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconGlass}>
              <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.80)" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconGlass}>
              <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.80)" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function LightHeader({ name, role, initial, profileImageUri, onBack, onUpdatePhoto, s, colors }: {
  name: string; role: string; initial: string; profileImageUri: string | null;
  onBack: () => void; onUpdatePhoto: () => void; s: any; colors: ThemeColors;
}) {
  return (
    <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={s.lightHeader}>
      <SafeAreaView edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={{ position: 'relative', marginHorizontal: 6 }}>
            <AvatarWithCamera
              initial={initial}
              profileUri={profileImageUri}
              onUpdatePhoto={onUpdatePhoto}
              largeStyle={s.avatarLargeLight}
              imageStyle={s.avatarLargeImage}
              textStyle={s.avatarLargeText}
              cameraBadgeStyle={s.cameraBadgeLight}
              cameraIconColor="#fff"
            />
            <View style={{ position: 'absolute', bottom: 2, right: 20 }}>
              <ActiveIndicator size={10} />
            </View>
          </View>

          <View style={s.headerInfo}>
            <Text style={s.headerNameLight} numberOfLines={1}>{name}</Text>
            <View style={s.onlineRow}>
              <ActiveIndicator size={6} />
              <Text style={s.onlineSubLight}>Active now · {role}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconGlassLight}>
              <Ionicons name="call-outline" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconGlassLight}>
              <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  const PAGE_BG = isDarkMode ? '#101014' : '#F0F2F5';

  // Glass panel tokens (matches Smart Home reference)
  const GLASS_BG = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const GLASS_BORDER = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const GLASS_GLOSS = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.80)';

  const SENT_BG = isDarkMode ? 'rgba(255,255,255,0.07)' : colors.primaryGreen;
  const SENT_BORDER_TOP = isDarkMode ? 'rgba(255,255,255,0.18)' : 'transparent';
  const SENT_BORDER = isDarkMode ? 'rgba(60,180,90,0.22)' : 'transparent';
  // sent bubble gets a green tint overlay via LinearGradient in dark mode
  const RECV_BG = isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const RECV_BORDER_TOP = isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.06)';
  const RECV_BORDER = isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';

  const INPUT_BAR_BG = isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF';
  const INPUT_BAR_BORDER = isDarkMode ? 'rgba(255,255,255,0.10)' : '#E5E7EB';
  const INPUT_FIELD_BG = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  const SEP_BG = isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';
  const SEP_TEXT = isDarkMode ? 'rgba(255,255,255,0.50)' : colors.secondaryText;
  const SEP_LINE = isDarkMode ? 'rgba(255,255,255,0.08)' : colors.divider;

  const AVATAR_SMALL_BG = isDarkMode ? 'rgba(255,255,255,0.10)' : colors.primaryGreen;
  const AVATAR_LARGE_DARK_BG = 'rgba(255,255,255,0.10)';
  const AVATAR_LARGE_DARK_BORDER = 'rgba(255,255,255,0.22)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: PAGE_BG },
    flex: { flex: 1, backgroundColor: PAGE_BG },

    // ── Dark header (glass panel) ──
    darkHeader: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: GLASS_BORDER,
      paddingBottom: 14,
      overflow: 'hidden',
    },
    darkHeaderGloss: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: GLASS_GLOSS,
    },

    // ── Light header ──
    lightHeader: { paddingBottom: 14 },

    // Shared header layout
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingTop: 8,
      gap: 2,
    },
    iconBtn: { padding: 8 },
    headerInfo: { flex: 1, paddingLeft: 2 },

    headerNameDark: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 },
    headerNameLight: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 },

    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    onlineSubDark: { fontSize: 12, color: 'rgba(255,255,255,0.50)' },
    onlineSubLight: { fontSize: 12, color: 'rgba(255,255,255,0.80)' },

    // Glass icon buttons in header
    headerIconGlass: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: GLASS_BG,
      borderWidth: 1,
      borderColor: GLASS_BORDER,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconGlassLight: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.30)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Avatars ──
    avatarLargeDark: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: AVATAR_LARGE_DARK_BG,
      borderWidth: 1.5,
      borderColor: AVATAR_LARGE_DARK_BORDER,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarLargeLight: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.50)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarLargeImage: { width: 50, height: 50, borderRadius: 25 },
    avatarLargeText: { fontSize: 20, fontWeight: '700', color: '#fff' },

    cameraBadgeDark: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primaryGreen,
      borderWidth: 1.5,
      borderColor: '#101014',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraBadgeLight: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.50)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatarSmall: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: AVATAR_SMALL_BG,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
      flexShrink: 0,
      overflow: 'hidden',
    },
    avatarSmallImage: { width: 30, height: 30, borderRadius: 15 },
    avatarSmallText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // ── Date separator ──
    sep: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 18,
      paddingHorizontal: 16,
      gap: 10,
    },
    sepLine: { flex: 1, height: 1, backgroundColor: SEP_LINE },
    sepPill: {
      backgroundColor: SEP_BG,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
    },
    sepText: { fontSize: 12, color: SEP_TEXT, fontWeight: '600', letterSpacing: 0.3 },

    // ── Message list ──
    list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8, gap: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: 2,
      gap: 6,
    },
    rowSent: { justifyContent: 'flex-end' },
    rowReceived: { justifyContent: 'flex-start' },

    // ── Bubbles ── (glass style)
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    bubbleSent: {
      backgroundColor: isDarkMode ? 'rgba(26,80,42,0.72)' : colors.primaryGreen,
      borderTopColor: isDarkMode ? SENT_BORDER_TOP : 'transparent',
      borderColor: isDarkMode ? SENT_BORDER : 'transparent',
      borderBottomRightRadius: 4,
    },
    bubbleReceived: {
      backgroundColor: RECV_BG,
      borderTopColor: RECV_BORDER_TOP,
      borderColor: RECV_BORDER,
      borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextSent: { color: '#fff' },
    bubbleTextRecv: {
      color: isDarkMode ? 'rgba(255,255,255,0.90)' : colors.text,
    },

    // ── Time + checkmark ──
    timeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      gap: 2,
    },
    timeText: { fontSize: 11 },
    timeSent: { color: isDarkMode ? 'rgba(255,255,255,0.38)' : colors.secondaryText },
    timeRecv: { color: isDarkMode ? 'rgba(255,255,255,0.32)' : colors.secondaryText },

    // ── Voice bubble ──
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
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.30)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.50)',
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

    // ── Input bar (glass dock) ──
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: INPUT_BAR_BG,
      borderTopWidth: 1,
      borderTopColor: INPUT_BAR_BORDER,
    },
    inputSafeArea: { backgroundColor: INPUT_BAR_BG },
    attachBtn: { paddingBottom: 10 },
    inputWrap: {
      flex: 1,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 120,
      backgroundColor: INPUT_FIELD_BG,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
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

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Alert, Modal,
  ScrollView, StyleProp, ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ActiveIndicator from '../../components/ActiveIndicator';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ChatParams = {
  name: string;
  role?: string;
  wallpaperUri?: string | null;
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
// Static data — untouched
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
// GlassBlur helper — iOS: real BlurView, Android: solid fallback
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
  const { name, role = 'AgroChain User' } = route.params;

  // wallpaperUri lives in state so the options panel can update it
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(route.params.wallpaperUri ?? null);
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [inputText, setInputText] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const listRef = useRef<FlatList>(null);

  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  const s = createStyles(colors, isDarkMode);
  const blurTint = isDarkMode ? 'dark' : 'light';

  // ── Profile picture picker ────────────────────────────────
  const handleUpdateProfilePicture = async () => {
    Alert.alert('Update Profile Picture', 'Choose how you want to update the profile photo.', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to take a profile photo.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
          if (!result.canceled) setProfileImageUri(result.assets[0].uri);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
          if (!result.canceled) setProfileImageUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Wallpaper picker (from options panel) ─────────────────
  const handleChangeWallpaper = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to choose a wallpaper.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      setWallpaperUri(result.assets[0].uri);
      setOptionsVisible(false);
    }
  };

  // ── Clear chat ────────────────────────────────────────────
  const handleClearChat = () => {
    Alert.alert('Clear Chat', 'All messages will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([{ id: 'sep1', type: 'sep', label: 'Today', sent: false, time: '' }]);
          setOptionsVisible(false);
        },
      },
    ]);
  };

  // ── Send message — untouched ──────────────────────────────
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

  // ── renderItem — logic untouched ─────────────────────────
  const renderItem = ({ item }: { item: Message }) => {
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
                      s.waveBar, { height: h },
                      item.sent ? { backgroundColor: 'rgba(255,255,255,0.85)' } : { backgroundColor: 'rgba(0,0,0,0.35)' },
                      i >= 9 && { opacity: 0.38 },
                    ]}
                  />
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
      <View style={[s.row, item.sent ? s.rowSent : s.rowReceived]}>
        {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} />}
        <View style={{ maxWidth: '75%' }}>
          <View style={[s.bubble, item.sent ? s.bubbleSent : s.bubbleReceived]}>
            <Text style={[s.bubbleText, item.sent ? s.bubbleTextSent : s.bubbleTextRecv]}>{item.text}</Text>
          </View>
          <TimeMeta sent={item.sent} time={item.time} read={item.read} s={s} colors={colors} />
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // JSX — Layer order:
  //   1. Wallpaper (absoluteFill)
  //   2. Header (solid green)
  //   3. KAV → MessageArea (BlurView + FlatList) + InputBar (BlurView + SafeArea)
  //   4. Chat options Modal (slides up from bottom)
  // ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ── LAYER 1: Wallpaper ── */}
      {wallpaperUri ? (
        <Image source={{ uri: wallpaperUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={isDarkMode ? ['#04251A', '#061F10', '#030E08'] : ['#0B6E36', '#085C2C', '#04331A']}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ── LAYER 2: Header ── */}
      <ChatHeader
        name={name} role={role} initial={initial}
        profileImageUri={profileImageUri}
        isDarkMode={isDarkMode}
        onBack={() => navigation.goBack()}
        onUpdatePhoto={handleUpdateProfilePicture}
        onHeaderPress={() => setOptionsVisible(true)}
        colors={colors} s={s}
      />

      {/* ── LAYER 3: Messages + Input ── */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Message area */}
        <View style={s.messageArea}>
          <GlassBlur
            intensity={isDarkMode ? 40 : 55} tint={blurTint}
            style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(10,20,12,0.85)' : 'rgba(240,241,243,0.82)'}
          />
          <View style={[StyleSheet.absoluteFill, s.messageAreaOverlay]} />
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            style={s.flatList}
          />
        </View>

        {/* ── Input bar + bottom safe area — all inside one BlurView container ── */}
        <View style={s.inputBarOuter}>
          <GlassBlur
            intensity={65} tint={blurTint}
            style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(8,16,10,0.92)' : 'rgba(255,255,255,0.88)'}
          />
          <View style={[StyleSheet.absoluteFill, s.inputBarBlurOverlay]} />
          <View style={s.inputBarTopBorder} />

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

          {/* Bottom safe area INSIDE the glass container — fixes the bar at the bottom */}
          <View style={{ height: insets.bottom }} />
        </View>
      </KeyboardAvoidingView>

      {/* ── LAYER 4: Chat options modal ── */}
      <ChatOptionsPanel
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        name={name}
        role={role}
        initial={initial}
        profileImageUri={profileImageUri}
        muted={muted}
        wallpaperUri={wallpaperUri}
        colors={colors}
        isDarkMode={isDarkMode}
        onMuteToggle={() => setMuted((p) => !p)}
        onChangeWallpaper={handleChangeWallpaper}
        onRemoveWallpaper={() => { setWallpaperUri(null); setOptionsVisible(false); }}
        onClearChat={handleClearChat}
        onBlock={() => { setOptionsVisible(false); Alert.alert('Block Contact', 'This feature is coming soon.'); }}
        onReport={() => { setOptionsVisible(false); Alert.alert('Report', 'This feature is coming soon.'); }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ChatHeader — unified component for both light and dark modes
// Tapping the avatar area / name opens the options panel
// ─────────────────────────────────────────────────────────────

function ChatHeader({ name, role, initial, profileImageUri, isDarkMode, onBack, onUpdatePhoto, onHeaderPress, colors, s }: {
  name: string; role: string; initial: string; profileImageUri: string | null;
  isDarkMode: boolean; onBack: () => void; onUpdatePhoto: () => void;
  onHeaderPress: () => void; colors: ThemeColors; s: any;
}) {
  return (
    <View style={isDarkMode ? s.headerDark : s.headerLight}>
      <View style={s.headerGloss} />
      <SafeAreaView edges={['top']}>
        <View style={s.headerRow}>
          {/* Back */}
          <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Avatar + info — tap opens options panel */}
          <TouchableOpacity
            style={s.headerCenter}
            onPress={onHeaderPress}
            activeOpacity={0.8}
          >
            {/* Avatar with camera badge */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity activeOpacity={0.85} onPress={onUpdatePhoto} style={s.avatarLargeWrap}>
                {profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={s.avatarLargeImage} />
                ) : (
                  <Text style={s.avatarLargeText}>{initial}</Text>
                )}
              </TouchableOpacity>
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={10} color="#fff" />
              </View>
              <View style={{ position: 'absolute', bottom: 0, right: 18 }}>
                <ActiveIndicator size={10} />
              </View>
            </View>

            {/* Name + status */}
            <View style={s.headerInfo}>
              <Text style={s.headerName} numberOfLines={1}>{name}</Text>
              <View style={s.onlineRow}>
                <ActiveIndicator size={6} />
                <Text style={s.onlineSub}>Active now · {role}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Call */}
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconCircle}>
              <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>
          {/* More */}
          <TouchableOpacity style={s.iconBtn} onPress={onHeaderPress} activeOpacity={0.75}>
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
// Chat options panel — WhatsApp-style bottom sheet
// ─────────────────────────────────────────────────────────────

type OptionItem = {
  icon: string;
  label: string;
  sublabel?: string;
  color?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
};

function ChatOptionsPanel({
  visible, onClose, name, role, initial, profileImageUri,
  muted, wallpaperUri, colors, isDarkMode,
  onMuteToggle, onChangeWallpaper, onRemoveWallpaper, onClearChat, onBlock, onReport,
}: {
  visible: boolean; onClose: () => void;
  name: string; role: string; initial: string; profileImageUri: string | null;
  muted: boolean; wallpaperUri: string | null; colors: ThemeColors; isDarkMode: boolean;
  onMuteToggle: () => void; onChangeWallpaper: () => void; onRemoveWallpaper: () => void;
  onClearChat: () => void; onBlock: () => void; onReport: () => void;
}) {
  const sheetBg = isDarkMode ? '#1A1A1E' : '#FFFFFF';
  const dividerColor = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0';
  const labelColor = isDarkMode ? '#FFFFFF' : '#111827';
  const subColor = isDarkMode ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const iconBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  const options: OptionItem[] = [
    {
      icon: 'person-circle-outline',
      label: 'View Profile',
      sublabel: 'See full profile information',
      onPress: () => { onClose(); Alert.alert('View Profile', 'Profile view coming soon.'); },
    },
    {
      icon: 'search-outline',
      label: 'Search in Chat',
      sublabel: 'Find messages',
      onPress: () => { onClose(); Alert.alert('Search', 'Search coming soon.'); },
    },
    {
      icon: muted ? 'notifications-outline' : 'notifications-off-outline',
      label: muted ? 'Unmute Notifications' : 'Mute Notifications',
      sublabel: muted ? 'Turn notifications back on' : 'Stop notifications for this chat',
      onPress: onMuteToggle,
    },
    {
      icon: 'image-outline',
      label: 'Change Wallpaper',
      sublabel: 'Pick a photo from your gallery',
      onPress: onChangeWallpaper,
    },
    ...(wallpaperUri ? [{
      icon: 'color-palette-outline',
      label: 'Remove Wallpaper',
      sublabel: 'Restore default green gradient',
      onPress: onRemoveWallpaper,
    }] : []),
    {
      icon: 'trash-outline',
      label: 'Clear Chat',
      sublabel: 'Delete all messages',
      onPress: onClearChat,
    },
  ];

  const destructiveOptions: OptionItem[] = [
    { icon: 'ban-outline', label: 'Block Contact', color: '#EF4444', onPress: onBlock },
    { icon: 'flag-outline', label: 'Report', color: '#EF4444', onPress: onReport },
  ];

  function OptionRow({ item }: { item: OptionItem }) {
    return (
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)' }}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Bottom sheet */}
      <View style={{ backgroundColor: sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.20)' : '#D1D5DB' }} />
        </View>

        {/* Contact header */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryGreen, borderWidth: 3, borderColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 }}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
            ) : (
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff' }}>{initial}</Text>
            )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: labelColor, letterSpacing: 0.2 }}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <ActiveIndicator size={7} />
            <Text style={{ fontSize: 13, color: colors.primaryGreen, fontWeight: '600' }}>Active now</Text>
            <Text style={{ fontSize: 13, color: subColor }}>· {role}</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: dividerColor }} />

        {/* Options */}
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {options.map((item) => (
            <View key={item.label}>
              <OptionRow item={item} />
              <View style={{ height: 1, backgroundColor: dividerColor, marginLeft: 74 }} />
            </View>
          ))}

          {/* Destructive section */}
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
// Small sub-components
// ─────────────────────────────────────────────────────────────

function SmallAvatar({ initial, profileUri, s }: { initial: string; profileUri: string | null; s: any }) {
  return (
    <View style={s.avatarSmall}>
      {profileUri ? <Image source={{ uri: profileUri }} style={s.avatarSmallImage} /> : <Text style={s.avatarSmallText}>{initial}</Text>}
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
        <Ionicons name="checkmark-done" size={13} color={read ? '#4ade80' : 'rgba(255,255,255,0.45)'} style={{ marginLeft: 2 }} />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  const SENT_BG        = '#0B6E36';
  const RECV_BG        = isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.58)';
  const RECV_BORDER    = isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.75)';
  const RECV_TOP       = isDarkMode ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.90)';
  const INPUT_OVERLAY  = isDarkMode ? 'rgba(8,20,10,0.55)' : 'rgba(255,255,255,0.42)';
  const INPUT_BORDER   = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)';
  const INPUT_PILL_BG  = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const INPUT_PILL_BRD = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.80)';
  const SEP_BG         = isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)';
  const SEP_BORDER     = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.70)';
  const SEP_TEXT       = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';
  const SEP_LINE       = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.40)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    kav:  { flex: 1, backgroundColor: 'transparent' },

    // ── Header ──────────────────────────────────────────────
    headerLight: { backgroundColor: '#0B6E36', paddingBottom: 14, overflow: 'hidden' },
    headerDark:  { backgroundColor: isDarkMode ? 'rgba(6,42,20,0.96)' : '#0B6E36', paddingBottom: 14, overflow: 'hidden' },
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

    // ── Avatars ─────────────────────────────────────────────
    avatarLargeWrap: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.50)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarLargeImage: { width: 46, height: 46, borderRadius: 23 },
    avatarLargeText:  { fontSize: 18, fontWeight: '700', color: '#fff' },
    cameraBadge: {
      position: 'absolute', bottom: -1, right: -1,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.50)',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarSmall: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: '#0B6E36',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)',
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'flex-end', flexShrink: 0, overflow: 'hidden',
    },
    avatarSmallImage: { width: 30, height: 30, borderRadius: 15 },
    avatarSmallText:  { fontSize: 13, fontWeight: '700', color: '#fff' },

    // ── Message area ────────────────────────────────────────
    messageArea: { flex: 1, overflow: 'hidden' },
    messageAreaOverlay: { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' },
    flatList: { backgroundColor: 'transparent' },
    list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8, gap: 4 },

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
    bubbleTextRecv: { color: isDarkMode ? 'rgba(255,255,255,0.92)' : '#111827' },

    // ── Time + ticks ────────────────────────────────────────
    timeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
    timeText: { fontSize: 11 },
    timeSent: { color: 'rgba(255,255,255,0.55)' },
    timeRecv: { color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' },

    // ── Voice bubble ────────────────────────────────────────
    voiceBubble: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 8, minWidth: 180 },
    playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
    waveBar: { width: 3, borderRadius: 2 },
    voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

    // ── Input bar — BlurView covers this whole block ────────
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

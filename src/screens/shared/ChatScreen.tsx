import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Alert, StyleProp, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  // Pass a local URI or remote URL to swap the chat wallpaper.
  // Omit (or pass null) to fall back to the default green gradient.
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
// Glass blur helper
// On iOS: real BlurView. On Android: opaque fallback tint.
// ─────────────────────────────────────────────────────────────

function GlassBlur({
  intensity,
  tint,
  style,
  androidFallbackColor,
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
  const { name, role = 'AgroChain User', wallpaperUri = null } = route.params;

  // ── State — untouched ──
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [inputText, setInputText] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const initial = name.trim()[0]?.toUpperCase() ?? '?';

  // ── Profile picture picker — untouched ──
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
            const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
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
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
            if (!result.canceled) setProfileImageUri(result.assets[0].uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // ── Send message — untouched ──
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
  const blurTint = isDarkMode ? 'dark' : 'light';

  // ── renderItem — logic untouched, styles reference s ──
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
          {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} colors={colors} />}
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
                        : { backgroundColor: 'rgba(0,0,0,0.35)' },
                      i >= 9 && { opacity: 0.38 },
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.voiceDur, { color: item.sent ? 'rgba(255,255,255,0.80)' : colors.secondaryText }]}>
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
        {!item.sent && <SmallAvatar initial={initial} profileUri={profileImageUri} s={s} colors={colors} />}
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

  // ─────────────────────────────────────────────────────────
  // JSX  —  Layer order:
  //   1. Wallpaper   (absoluteFill, behind everything)
  //   2. Header      (solid green  ← OPTION A, active)
  //   3. KAV wrapper
  //      ├─ Message area
  //      │    ├─ BlurView (absoluteFill over wallpaper)
  //      │    └─ FlatList (transparent bg, floats above blur)
  //      └─ Input bar
  //           ├─ BlurView (absoluteFill)
  //           ├─ Semi-transparent white overlay
  //           └─ Input row
  // ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ══ LAYER 1: Wallpaper ══════════════════════════════════
          • If wallpaperUri is provided → show the image
          • Otherwise → default green-tinted gradient placeholder
          ═══════════════════════════════════════════════════════ */}
      {wallpaperUri ? (
        <Image
          source={{ uri: wallpaperUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          // Default gradient placeholder — looks finished without a custom image
          colors={
            isDarkMode
              ? ['#04251A', '#061F10', '#030E08']  // near-black dark green
              : ['#0B6E36', '#085C2C', '#04331A']  // rich AgroChain green
          }
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ══ HEADER ══════════════════════════════════════════════
          OPTION A (active): Solid green — picks up brand color cleanly.
          OPTION B (frosted): Uncomment the block below and remove option A
          to get a BlurView header that reflects the wallpaper through it.
          ═══════════════════════════════════════════════════════ */}

      {/* — OPTION A: Solid green header ————————————————————— */}
      {isDarkMode ? (
        <DarkHeader
          name={name} role={role} initial={initial}
          profileImageUri={profileImageUri}
          onBack={() => navigation.goBack()}
          onUpdatePhoto={handleUpdateProfilePicture}
          s={s}
        />
      ) : (
        <LightHeader
          name={name} role={role} initial={initial}
          profileImageUri={profileImageUri}
          onBack={() => navigation.goBack()}
          onUpdatePhoto={handleUpdateProfilePicture}
          s={s} colors={colors}
        />
      )}

      {/*
      — OPTION B: Frosted glass green header (picks up wallpaper) ———
      Replace the header block above with this to enable it:

      <View style={s.frostedHeaderOuter}>
        <GlassBlur
          intensity={70} tint={blurTint}
          style={StyleSheet.absoluteFill}
          androidFallbackColor={isDarkMode ? 'rgba(4,37,26,0.90)' : 'rgba(11,110,54,0.82)'}
        />
        <View style={[StyleSheet.absoluteFill, s.frostedHeaderOverlay]} />
        {isDarkMode ? (
          <DarkHeader ... s={s} />
        ) : (
          <LightHeader ... s={s} colors={colors} />
        )}
      </View>
      */}

      {/* ══ LAYER 2 + 3: Messages & Input ══════════════════════ */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Message area ─────────────────────────────────────── */}
        <View style={s.messageArea}>
          {/* BlurView blurs the wallpaper, creating the frosted chat backdrop */}
          <GlassBlur
            intensity={isDarkMode ? 40 : 55}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(10,20,12,0.85)' : 'rgba(240,241,243,0.82)'}
          />
          {/* Very subtle tint overlay so bubble text stays readable */}
          <View style={[StyleSheet.absoluteFill, s.messageAreaOverlay]} />

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            // Must be transparent so the BlurView behind it shows through
            style={s.flatList}
          />
        </View>

        {/* Input bar ─────────────────────────────────────────── */}
        <View style={s.inputBarOuter}>
          {/* Blur layer */}
          <GlassBlur
            intensity={65}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
            androidFallbackColor={isDarkMode ? 'rgba(8,16,10,0.92)' : 'rgba(255,255,255,0.88)'}
          />
          {/* Semi-transparent tint on top of blur */}
          <View style={[StyleSheet.absoluteFill, s.inputBarBlurOverlay]} />
          {/* Top border line */}
          <View style={s.inputBarTopBorder} />

          {/* The actual input row */}
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
        </View>

        <SafeAreaView edges={['bottom']} style={s.inputSafeArea} />
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components — logic untouched, only styles referenced
// ─────────────────────────────────────────────────────────────

function SmallAvatar({ initial, profileUri, s, colors }: {
  initial: string; profileUri: string | null; s: any; colors: ThemeColors;
}) {
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
          color={read ? '#4ade80' : 'rgba(255,255,255,0.45)'}
          style={{ marginLeft: 2 }}
        />
      )}
    </View>
  );
}

function AvatarWithCamera({
  initial, profileUri, onUpdatePhoto, largeStyle, imageStyle, textStyle, cameraBadgeStyle, cameraIconColor,
}: {
  initial: string; profileUri: string | null; onUpdatePhoto: () => void;
  largeStyle: any; imageStyle: any; textStyle: any; cameraBadgeStyle: any; cameraIconColor: string;
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
      <View style={s.darkHeaderGloss} />
      <SafeAreaView edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ position: 'relative', marginHorizontal: 6 }}>
            <AvatarWithCamera
              initial={initial} profileUri={profileImageUri} onUpdatePhoto={onUpdatePhoto}
              largeStyle={s.avatarLargeDark} imageStyle={s.avatarLargeImage}
              textStyle={s.avatarLargeText} cameraBadgeStyle={s.cameraBadgeDark}
              cameraIconColor="rgba(255,255,255,0.90)"
            />
            <View style={{ position: 'absolute', bottom: 2, right: 20 }}>
              <ActiveIndicator size={10} />
            </View>
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerName} numberOfLines={1}>{name}</Text>
            <View style={s.onlineRow}>
              <ActiveIndicator size={6} />
              <Text style={s.onlineSub}>Active now · {role}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconCircle}>
              <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconCircle}>
              <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.85)" />
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
    // Solid #0B6E36 header — clean, brand-accurate, matches the screenshot
    <View style={s.lightHeader}>
      {/* Subtle gloss line at very top */}
      <View style={s.lightHeaderGloss} />
      <SafeAreaView edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ position: 'relative', marginHorizontal: 6 }}>
            <AvatarWithCamera
              initial={initial} profileUri={profileImageUri} onUpdatePhoto={onUpdatePhoto}
              largeStyle={s.avatarLargeLight} imageStyle={s.avatarLargeImage}
              textStyle={s.avatarLargeText} cameraBadgeStyle={s.cameraBadgeLight}
              cameraIconColor="#fff"
            />
            <View style={{ position: 'absolute', bottom: 2, right: 20 }}>
              <ActiveIndicator size={10} />
            </View>
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerName} numberOfLines={1}>{name}</Text>
            <View style={s.onlineRow}>
              <ActiveIndicator size={6} />
              <Text style={s.onlineSub}>Active now · {role}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <View style={s.headerIconCircle}>
              <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
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
// Styles
// ─────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  // ── Sent bubble: solid AgroChain green + glass top-edge sheen
  const SENT_BG         = '#0B6E36';
  const SENT_TOP_SHEEN  = 'rgba(255,255,255,0.10)'; // inner highlight, glass feel

  // ── Received bubble: frosted white glass — lets wallpaper blur show through
  const RECV_BG         = isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.58)';
  const RECV_BORDER     = isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.75)';
  const RECV_BORDER_TOP = isDarkMode ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.90)'; // gloss on top edge

  // ── Header: solid green (Option A)
  const HEADER_BG       = '#0B6E36';

  // ── Date separator pill
  const SEP_BG          = isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)';
  const SEP_BORDER      = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.70)';
  const SEP_TEXT_COLOR  = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';
  const SEP_LINE_COLOR  = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.40)';

  // ── Input bar overlay on top of BlurView
  const INPUT_OVERLAY   = isDarkMode ? 'rgba(8,20,10,0.55)' : 'rgba(255,255,255,0.42)';
  const INPUT_BORDER    = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)';

  // ── Text input pill
  const INPUT_PILL_BG   = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const INPUT_PILL_BORDER = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.80)';

  // ── Avatar
  const AVATAR_SMALL_BG  = '#0B6E36';

  return StyleSheet.create({
    // ── Root: transparent so wallpaper bleeds through ──────
    root: { flex: 1, backgroundColor: 'transparent' },
    kav:  { flex: 1, backgroundColor: 'transparent' },

    // ── Headers ───────────────────────────────────────────
    // Option A: Solid green (currently active)
    lightHeader: {
      backgroundColor: HEADER_BG,
      paddingBottom: 14,
      overflow: 'hidden',
    },
    lightHeaderGloss: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.20)',
    },
    darkHeader: {
      backgroundColor: isDarkMode ? 'rgba(6,42,20,0.96)' : HEADER_BG,
      paddingBottom: 14,
      overflow: 'hidden',
    },
    darkHeaderGloss: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    // Option B frosted header styles (used if you enable Option B above)
    frostedHeaderOuter: { overflow: 'hidden' },
    frostedHeaderOverlay: {
      backgroundColor: isDarkMode ? 'rgba(4,37,26,0.75)' : 'rgba(11,110,54,0.75)',
    },

    // ── Shared header layout ──────────────────────────────
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingTop: 8,
      gap: 2,
    },
    iconBtn: { padding: 8 },
    headerInfo: { flex: 1, paddingLeft: 2 },
    headerName: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    onlineSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
    headerIconCircle: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center', justifyContent: 'center',
    },

    // ── Avatars ───────────────────────────────────────────
    avatarLargeLight: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarLargeDark: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarLargeImage: { width: 50, height: 50, borderRadius: 25 },
    avatarLargeText: { fontSize: 20, fontWeight: '700', color: '#fff' },
    cameraBadgeLight: {
      position: 'absolute', bottom: -2, right: -2,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.50)',
      alignItems: 'center', justifyContent: 'center',
    },
    cameraBadgeDark: {
      position: 'absolute', bottom: -2, right: -2,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: HEADER_BG,
      borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.40)',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarSmall: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: AVATAR_SMALL_BG,
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)',
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'flex-end', flexShrink: 0, overflow: 'hidden',
    },
    avatarSmallImage: { width: 30, height: 30, borderRadius: 15 },
    avatarSmallText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // ── Message area ──────────────────────────────────────
    messageArea: { flex: 1, overflow: 'hidden' },
    messageAreaOverlay: {
      // Very subtle overlay so text is always legible even without a wallpaper
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    },
    flatList: { backgroundColor: 'transparent' },
    list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8, gap: 4 },

    // ── Date separator ────────────────────────────────────
    sep: {
      flexDirection: 'row', alignItems: 'center',
      marginVertical: 18, paddingHorizontal: 16, gap: 10,
    },
    sepLine: { flex: 1, height: 1, backgroundColor: SEP_LINE_COLOR },
    sepPill: {
      backgroundColor: SEP_BG,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
      borderWidth: 1, borderColor: SEP_BORDER,
    },
    sepText: { fontSize: 12, color: SEP_TEXT_COLOR, fontWeight: '600', letterSpacing: 0.3 },

    // ── Message rows ──────────────────────────────────────
    row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2, gap: 6 },
    rowSent: { justifyContent: 'flex-end' },
    rowReceived: { justifyContent: 'flex-start' },

    // ── Bubbles ───────────────────────────────────────────
    bubble: {
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1,
    },

    // Sent: solid #0B6E36 + rgba top sheen for glass feel
    bubbleSent: {
      backgroundColor: SENT_BG,
      borderColor: 'transparent',
      borderTopColor: SENT_TOP_SHEEN, // <── glass sheen on top edge
      borderBottomRightRadius: 4,
    },

    // Received: frosted white — wallpaper blur shows through
    bubbleReceived: {
      backgroundColor: RECV_BG,
      borderColor: RECV_BORDER,
      borderTopColor: RECV_BORDER_TOP, // <── brighter top = glass gloss
      borderBottomLeftRadius: 4,
    },

    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextSent: { color: '#fff' },
    bubbleTextRecv: { color: isDarkMode ? 'rgba(255,255,255,0.92)' : '#111827' },

    // ── Time + ticks ──────────────────────────────────────
    timeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
    timeText: { fontSize: 11 },
    timeSent: { color: 'rgba(255,255,255,0.55)' },
    timeRecv: { color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' },

    // ── Voice bubble ──────────────────────────────────────
    voiceBubble: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1,
      gap: 8, minWidth: 180,
    },
    playBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
    waveBar: { width: 3, borderRadius: 2 },
    voiceDur: { fontSize: 11, fontWeight: '600', flexShrink: 0 },

    // ── Input bar ─────────────────────────────────────────
    inputBarOuter: {
      overflow: 'hidden',
      // No explicit bg — BlurView + overlay provide it
    },
    inputBarBlurOverlay: { backgroundColor: INPUT_OVERLAY },
    inputBarTopBorder: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 1,
      backgroundColor: INPUT_BORDER,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
    },
    inputSafeArea: { backgroundColor: INPUT_OVERLAY },
    attachBtn: { paddingBottom: 10 },
    inputWrap: {
      flex: 1,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 120,
      backgroundColor: INPUT_PILL_BG,
      borderWidth: 1,
      borderColor: INPUT_PILL_BORDER,
    },
    input: { fontSize: 15, lineHeight: 20 },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Ionicons name shown in the badge above the title — reinforces what the screen is for. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Plain-language explanation shown in a highlighted card at the top of the content — spells out what the screen is for and how to use it. */
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Shared chrome for "Settings" detail screens (Personal Information, Change
// Password, My Certifications, My PDF Reports, etc.).
//
// Deliberately NOT a React Native <Modal>: on Android, <Modal> renders into a
// separate native window that doesn't inherit the SafeAreaProvider context,
// so top insets resolve to 0 and the header ends up drawn underneath the
// status bar. Rendering as a plain absolute-fill Animated.View inside the
// normal tree (same trick used by ChatScreen's ContactProfileModal) keeps
// real safe-area insets and lets Android keep the screen behind it alive.
export default function FullScreenSheet({ visible, onClose, title, subtitle, icon, description, children, footer }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 20, mass: 0.9 }).start();
    } else if (rendered) {
      Animated.timing(slideY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
        setRendered(false);
      });
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { zIndex: 500, elevation: 500, transform: [{ translateY: slideY }] },
      ]}
    >
      <LinearGradient
        colors={[colors.primaryGreen, colors.primaryGreenLight]}
        style={[styles.hero, { paddingTop: (insets.top || StatusBar.currentHeight || 0) + 10 }]}
      >
        <View style={styles.backRow}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.heroContent}>
          {icon ? (
            <View style={styles.iconBadge}>
              <Ionicons name={icon} size={26} color="#fff" />
            </View>
          ) : null}
          <Text style={styles.heroTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.heroSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {description ? (
            <View style={styles.descriptionCard}>
              <View style={styles.descriptionIcon}>
                <Ionicons name="information-circle" size={20} color={colors.primaryGreen} />
              </View>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>
          ) : null}
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// Small "SECTION LABEL ————" divider used to break up long forms/lists
// inside a FullScreenSheet, so screens read as organized sections rather
// than one long unlabeled stack of fields.
export function SheetSectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primaryGreen, textTransform: 'uppercase', letterSpacing: 1.2 }}>
        {text}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.primaryGreen, opacity: 0.25, marginLeft: 10 }} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    hero: {
      alignItems: 'center',
      paddingBottom: 24,
      paddingHorizontal: 12,
    },
    backRow: {
      width: '100%',
      flexDirection: 'row',
      marginBottom: 4,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroContent: {
      alignItems: 'center',
      paddingHorizontal: 32,
      marginTop: 2,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.20)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    heroSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 18,
    },
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -20,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    descriptionCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.lightGreen,
      borderRadius: 16,
      padding: 14,
      marginBottom: 20,
    },
    descriptionIcon: {
      marginTop: 1,
    },
    descriptionText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
  });
}

import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Shared chrome for "Settings" detail screens (Personal Information, Change
// Password, My PDF Reports, etc.) — a full screen with a header + back
// button, matching how screens like "My Listings" present, instead of a
// small bottom-sheet card.
export default function FullScreenSheet({ visible, onClose, title, subtitle, children, footer }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.80)', marginTop: 2 },
    headerSpacer: { width: 40 },
    scrollBody: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    footer: { padding: 20, paddingTop: 0 },
  });
}

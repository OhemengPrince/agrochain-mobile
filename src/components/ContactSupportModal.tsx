import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SUPPORT_EMAIL = 'support@agrochain.com';

export default function ContactSupportModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const openEmail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('AgroChain Support Request')}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
      onClose();
    } else {
      Alert.alert('No Email App Found', `Please email us at ${SUPPORT_EMAIL}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Ionicons name="headset-outline" size={36} color={colors.primaryGreen} style={{ alignSelf: 'center' }} />
          <Text style={styles.title}>Contact Support</Text>
          <Text style={styles.subtitle}>Have a question or ran into a problem? Reach out and we'll get back to you.</Text>

          <Pressable style={styles.optionRow} onPress={openEmail}>
            <View style={styles.optionIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Email Support</Text>
              <Text style={styles.optionValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </Pressable>

          <Pressable onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.secondaryText, fontWeight: '600' }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: 24, padding: 24 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 10 },
    subtitle: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', marginTop: 6, lineHeight: 18 },
    optionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20,
      backgroundColor: colors.inputBackground, borderRadius: 14, padding: 14,
    },
    optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    optionLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    optionValue: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
  });
}

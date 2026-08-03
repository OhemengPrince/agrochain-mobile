import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import FullScreenSheet from './FullScreenSheet';

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
    <FullScreenSheet
      visible={visible}
      onClose={onClose}
      title="Contact Support"
      icon="headset-outline"
      description="Stuck on something, or found a problem in the app? Send our support team an email describing what happened and we'll get back to you as soon as we can."
    >
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
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    optionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.inputBackground, borderRadius: 14, padding: 14,
    },
    optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    optionLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    optionValue: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
  });
}

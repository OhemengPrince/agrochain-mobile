import React from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import FullScreenSheet from './FullScreenSheet';

export interface ReportStat {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  periodLabel: string;
  stats: ReportStat[];
}

export default function SeasonReportModal({ visible, onClose, title, periodLabel, stats }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleShare = () => {
    const lines = stats.map((s) => `${s.label}: ${s.value}`).join('\n');
    Share.share({ message: `${title} — ${periodLabel}\n\n${lines}\n\nvia AgroChain` });
  };

  return (
    <FullScreenSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={periodLabel}
      icon="bar-chart-outline"
      description="A quick summary of your activity for this period. Tap Share Report below to send it to someone else — for example over SMS or WhatsApp."
    >
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statRow}>
          <View style={styles.statIcon}>
            <Ionicons name={stat.icon} size={18} color={colors.primaryGreen} />
          </View>
          <Text style={styles.statLabel}>{stat.label}</Text>
          <Text style={styles.statValue}>{stat.value}</Text>
        </View>
      ))}

      <Pressable style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-outline" size={16} color={colors.primaryGreen} />
        <Text style={styles.shareBtnText}>Share Report</Text>
      </Pressable>
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    statRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    statLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    statValue: { fontSize: 15, fontWeight: '800', color: colors.primaryGreen },
    shareBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primaryGreen,
    },
    shareBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
  });
}

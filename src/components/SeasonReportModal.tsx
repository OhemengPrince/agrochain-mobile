import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.periodLabel}>{periodLabel}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.secondaryText} />
            </Pressable>
          </View>

          <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statRow}>
                <View style={styles.statIcon}>
                  <Ionicons name={stat.icon} size={18} color={colors.primaryGreen} />
                </View>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color={colors.primaryGreen} />
            <Text style={styles.shareBtnText}>Share Report</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 36, maxHeight: '75%',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    periodLabel: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    // flexShrink lets this give up space to the fixed header/footer instead of
    // overflowing them, while still being the part that actually scrolls.
    statsScroll: { flexGrow: 0, flexShrink: 1 },
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

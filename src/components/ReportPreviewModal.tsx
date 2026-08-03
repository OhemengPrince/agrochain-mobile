import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { ReportSection } from '../utils/pdfReport';
import FullScreenSheet from './FullScreenSheet';

export interface ReportPreviewData {
  title: string;
  subtitle: string;
  sections: ReportSection[];
}

interface Props {
  report: ReportPreviewData | null;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export default function ReportPreviewModal({ report, downloading, onClose, onDownload }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <FullScreenSheet
      visible={!!report}
      onClose={onClose}
      title={report?.title ?? 'PDF Preview'}
      subtitle={report?.subtitle}
      footer={
        <View style={styles.footerRow}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={downloading}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.downloadBtn} onPress={onDownload} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              </>
            )}
          </Pressable>
        </View>
      }
    >
      <Text style={styles.previewLabel}>PDF PREVIEW</Text>
      {report?.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.rows.length === 0 ? (
            <Text style={styles.emptyText}>No records.</Text>
          ) : (
            section.rows.map((row, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>{row.label}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
              </View>
            ))
          )}
        </View>
      ))}
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    previewLabel: { fontSize: 10, fontWeight: '800', color: colors.primaryGreen, letterSpacing: 1, marginBottom: 12 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen, marginBottom: 8 },
    emptyText: { fontSize: 12, color: colors.secondaryText, fontStyle: 'italic' },
    row: {
      flexDirection: 'row', justifyContent: 'space-between', gap: 12,
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    rowLabel: { flex: 1, fontSize: 12, color: colors.secondaryText },
    rowValue: { fontSize: 12, fontWeight: '700', color: colors.text },
    footerRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.border,
    },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
    downloadBtn: {
      flex: 2, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      flexDirection: 'row', gap: 8, backgroundColor: colors.primaryGreen,
    },
    downloadBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });
}

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import {
  ExportPreferences,
  ExportDateRange,
  DEFAULT_EXPORT_PREFERENCES,
  getExportPreferences,
  setExportPreferences,
} from '../utils/storage';
import FullScreenSheet from './FullScreenSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const DATE_RANGE_OPTIONS: { value: ExportDateRange; label: string }[] = [
  { value: 'ALL', label: 'All time' },
  { value: '30D', label: 'Last 30 days' },
  { value: '90D', label: 'Last 90 days' },
];

export default function ExportPreferencesModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [prefs, setPrefs] = useState<ExportPreferences>(DEFAULT_EXPORT_PREFERENCES);

  useEffect(() => {
    if (visible) getExportPreferences().then(setPrefs);
  }, [visible]);

  const update = (next: Partial<ExportPreferences>) => {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    setExportPreferences(updated).catch(() => {});
  };

  return (
    <FullScreenSheet visible={visible} onClose={onClose} title="Export Preferences">
      <Text style={styles.subtitle}>These apply whenever you generate a PDF report.</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Include prices</Text>
        <Switch
          value={prefs.includePrices}
          onValueChange={(v) => update({ includePrices: v })}
          trackColor={{ true: colors.primaryGreen }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Include dates</Text>
        <Switch
          value={prefs.includeDates}
          onValueChange={(v) => update({ includeDates: v })}
          trackColor={{ true: colors.primaryGreen }}
        />
      </View>

      <Text style={styles.sectionLabel}>Date range</Text>
      <View style={styles.chipsRow}>
        {DATE_RANGE_OPTIONS.map((option) => {
          const active = prefs.dateRange === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => update({ dateRange: option.value })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    subtitle: { fontSize: 12, color: colors.secondaryText, marginBottom: 16 },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.secondaryText, marginTop: 16, marginBottom: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.secondaryText },
    chipTextActive: { color: '#FFFFFF' },
  });
}

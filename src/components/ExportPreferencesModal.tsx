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
import FullScreenSheet, { SheetSectionLabel } from './FullScreenSheet';

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
    <FullScreenSheet
      visible={visible}
      onClose={onClose}
      title="Export Preferences"
      icon="options-outline"
      description="Control what shows up when you download a PDF report. These settings apply every time you generate a new report, until you change them again."
    >
      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.rowLabel}>Include prices</Text>
          <Text style={styles.rowHelper}>Show GH₵ amounts in the report.</Text>
        </View>
        <Switch
          value={prefs.includePrices}
          onValueChange={(v) => update({ includePrices: v })}
          trackColor={{ true: colors.primaryGreen }}
        />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.rowLabel}>Include dates</Text>
          <Text style={styles.rowHelper}>Show the date of each entry in the report.</Text>
        </View>
        <Switch
          value={prefs.includeDates}
          onValueChange={(v) => update({ includeDates: v })}
          trackColor={{ true: colors.primaryGreen }}
        />
      </View>

      <SheetSectionLabel text="Date range" />
      <Text style={styles.rangeHelper}>Choose how far back a report should look when you generate one.</Text>
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
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowHelper: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    rangeHelper: { fontSize: 12, color: colors.secondaryText, marginBottom: 10 },
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

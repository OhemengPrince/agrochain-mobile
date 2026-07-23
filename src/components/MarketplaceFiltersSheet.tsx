import React from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../context/ThemeContext';

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
];

const SHEET_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.75);

export interface MarketplaceFilters {
  minPrice: string;
  maxPrice: string;
  region: string | undefined;
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: MarketplaceFilters = {
  minPrice: '',
  maxPrice: '',
  region: undefined,
  sortBy: 'newest',
};

export function isFiltersActive(f: MarketplaceFilters): boolean {
  return !!f.minPrice || !!f.maxPrice || !!f.region || f.sortBy !== 'newest';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  regions: string[];
  colors: ThemeColors;
}

export default function MarketplaceFiltersSheet({ visible, onClose, filters, onChange, regions, colors }: Props) {
  const styles = createStyles(colors);

  const set = <K extends keyof MarketplaceFilters>(key: K, value: MarketplaceFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.secondaryText} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>Price range (GHS)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={(v) => set('minPrice', v.replace(/[^0-9]/g, ''))}
              />
              <Text style={styles.priceDash}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={(v) => set('maxPrice', v.replace(/[^0-9]/g, ''))}
              />
            </View>

            <Text style={styles.sectionLabel}>Region</Text>
            <View style={styles.chipsWrap}>
              <Pressable
                style={[styles.chip, filters.region === undefined && styles.chipActive]}
                onPress={() => set('region', undefined)}
              >
                <Text style={[styles.chipText, filters.region === undefined && styles.chipTextActive]}>All</Text>
              </Pressable>
              {regions.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, filters.region === r && styles.chipActive]}
                  onPress={() => set('region', r)}
                >
                  <Text style={[styles.chipText, filters.region === r && styles.chipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Sort by</Text>
            <View style={styles.chipsWrap}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, filters.sortBy === opt.value && styles.chipActive]}
                  onPress={() => set('sortBy', opt.value)}
                >
                  <Text style={[styles.chipText, filters.sortBy === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.resetBtn} onPress={() => onChange(DEFAULT_FILTERS)}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SHEET_MAX_HEIGHT,
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    priceInput: {
      flex: 1, backgroundColor: colors.inputBackground, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text,
      borderWidth: 1, borderColor: colors.border,
    },
    priceDash: { color: colors.secondaryText, fontSize: 14 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: {
      paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.secondaryText },
    chipTextActive: { color: '#FFFFFF' },
    footer: {
      flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: colors.divider,
    },
    resetBtn: {
      flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.border,
    },
    resetBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
    applyBtn: {
      flex: 2, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primaryGreen,
    },
    applyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, Text, RefreshControl, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import { formatDate, getBatchStatusMeta, getCropEmoji } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerCatalogueList'>;

type SortOption = 'NEWEST' | 'NEAREST' | 'PRICE';

const CROP_FILTERS: { label: string; emoji: string; value: string | null }[] = [
  { label: 'All', emoji: '', value: null },
  { label: 'Maize', emoji: '🌽', value: 'Maize' },
  { label: 'Cassava', emoji: '🍠', value: 'Cassava' },
  { label: 'Cocoa', emoji: '🍫', value: 'Cocoa' },
  { label: 'Pineapple', emoji: '🍍', value: 'Pineapple' },
  { label: 'Tomato', emoji: '🍅', value: 'Tomato' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'NEWEST' },
  { label: 'Nearest', value: 'NEAREST' },
  { label: 'Price', value: 'PRICE' },
];

function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number, duration: number) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  return {
    scale,
    opacity,
    onPressIn: () => animateTo(0.97, 0.95, 100),
    onPressOut: () => animateTo(1, 1, 150),
  };
}

function FilterChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function CatalogueBatchCard({
  batch,
  onPress,
  styles,
  colors,
}: {
  batch: ProduceBatch;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const statusMeta = getBatchStatusMeta(batch.status);
  const isReady = batch.status === 'READY_FOR_SALE';

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}>
      <Pressable style={styles.card} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.cardTopRow}>
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{getCropEmoji(batch.cropName)}</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cropName}>{batch.cropName}</Text>
              {isReady && (
                <View style={[styles.readyBadge, { backgroundColor: statusMeta.background }]}>
                  <Text style={[styles.readyBadgeText, { color: statusMeta.color }]}>READY</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardMeta}>{batch.quantityKg} kg • {batch.district}, {batch.region}</Text>
            <Text style={styles.cardDate}>Listed {formatDate(batch.createdAt)}</Text>
          </View>
        </View>
        <Pressable style={styles.viewDetailsButton} onPress={onPress}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.white} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default function CatalogueScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [query, setQuery] = useState('');
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('NEWEST');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = useCallback(async (searchQuery: string) => {
    setError(null);
    try {
      const data = await getProduceCatalogue({ query: searchQuery || undefined });
      setBatches(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load catalogue.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBatches('');
      setLoading(false);
    })();
  }, [loadBatches]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBatches(query);
    setRefreshing(false);
  };

  const filteredBatches = useMemo(() => {
    let list = batches;
    if (cropFilter) {
      list = list.filter((batch) => batch.cropName.toLowerCase() === cropFilter.toLowerCase());
    }
    const sorted = [...list];
    if (sort === 'NEWEST') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'PRICE') {
      sorted.sort((a, b) => (a.pricePerKg ?? Infinity) - (b.pricePerKg ?? Infinity));
    }
    // NEAREST has no real distance data — kept as a no-op, illustrative option only.
    return sorted;
  }, [batches, cropFilter, sort]);

  if (loading) {
    return <LoadingOverlay message="Loading catalogue..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Text style={styles.headerTitle}>Produce Catalogue</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => loadBatches(query)}
            placeholder="Search crops, varieties..."
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
          />
          <Pressable onPress={() => loadBatches(query)} style={styles.filterIconButton}>
            <Ionicons name="options-outline" size={18} color={colors.primaryGreen} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.filterBar}>
        <FlatList
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={5}
          data={CROP_FILTERS}
          horizontal
          keyExtractor={(item) => item.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = item.value === cropFilter;
            return (
              <FilterChip
                label={item.emoji ? `${item.emoji} ${item.label}` : item.label}
                active={active}
                onPress={() => setCropFilter(item.value)}
                styles={styles}
              />
            );
          }}
        />
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        <View style={styles.sortOptions}>
          {SORT_OPTIONS.map((option) => {
            const active = option.value === sort;
            return (
              <Pressable
                key={option.value}
                style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => setSort(option.value)}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ErrorMessage message={error} />
      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={filteredBatches}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CatalogueBatchCard
            batch={item}
            onPress={() => navigation.navigate('ProduceDetail', { batchId: item.id })}
            styles={styles}
            colors={colors}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No produce found.</Text>}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.white,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: 12,
      height: 48,
      paddingHorizontal: 14,
      marginTop: 14,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    filterIconButton: {
      paddingLeft: 8,
    },
    filterBar: {
      paddingTop: 12,
      paddingBottom: 4,
    },
    filterList: {
      paddingHorizontal: 14,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.lightGreen,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.primaryGreen,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 10,
    },
    sortLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: '600',
    },
    sortOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    sortChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortChipActive: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    sortChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    sortChipTextActive: {
      color: colors.white,
    },
    list: {
      paddingHorizontal: 14,
      paddingBottom: 110,
      paddingTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      ...cardShadow,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    emojiWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    emoji: {
      fontSize: 24,
    },
    cardBody: {
      flex: 1,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cropName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    readyBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    readyBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    cardMeta: {
      fontSize: 13,
      color: colors.text,
      marginTop: 6,
    },
    cardDate: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
    },
    viewDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    viewDetailsText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      marginTop: 40,
    },
  });
}

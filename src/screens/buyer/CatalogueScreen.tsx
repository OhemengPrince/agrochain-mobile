import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, Text, RefreshControl, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch, BatchStatus } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import BatchCard from '../../components/BatchCard';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerCatalogueList'>;

const FILTERS: { label: string; value: BatchStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Ready for Sale', value: 'READY_FOR_SALE' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Sold', value: 'SOLD' },
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

export default function CatalogueScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BatchStatus | 'ALL'>('ALL');
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
    if (filter === 'ALL') return batches;
    return batches.filter((batch) => batch.status === filter);
  }, [batches, filter]);

  if (loading) {
    return <LoadingOverlay message="Loading catalogue..." />;
  }

  return (
    <View style={styles.container}>
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
      </View>

      <View style={styles.filterBar}>
        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = item.value === filter;
            return (
              <FilterChip
                label={item.label}
                active={active}
                onPress={() => setFilter(item.value)}
                styles={styles}
              />
            );
          }}
        />
      </View>

      <ErrorMessage message={error} />
      <FlatList
        data={filteredBatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BatchCard
            batch={item}
            showCertification
            onPress={() => navigation.navigate('ProduceDetail', { batchId: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No produce found.</Text>}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 14,
      marginBottom: 10,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      ...cardShadow,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    filterBar: {
      paddingBottom: 8,
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
    list: {
      paddingHorizontal: 14,
      paddingBottom: 24,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      marginTop: 40,
    },
  });
}

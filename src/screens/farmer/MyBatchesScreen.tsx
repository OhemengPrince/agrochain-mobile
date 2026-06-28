import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl, Pressable, Animated, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { FarmerStackParamList, ProduceBatch, BatchStatus } from '../../types';
import { getMyBatches } from '../../api/produceApi';
import { formatDate } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerBatchesList'>;

type FilterTab = 'ALL' | 'LOGGED' | 'PROCESSING' | 'READY' | 'SOLD';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'LOGGED', label: 'Logged' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'READY', label: 'Ready' },
  { key: 'SOLD', label: 'Sold' },
];

const LOGGED_STATUSES: BatchStatus[] = ['PLANTED', 'GROWING', 'HARVESTED'];

interface CropMeta {
  emoji: string;
  color: string;
}

const CROP_META: Record<string, CropMeta> = {
  maize: { emoji: '🌽', color: '#FBC02D' },
  cassava: { emoji: '🍠', color: '#FB8C00' },
  cocoa: { emoji: '🍫', color: '#6D4C41' },
  tomato: { emoji: '🍅', color: '#E53935' },
  plantain: { emoji: '🍌', color: '#9E9D24' },
  pineapple: { emoji: '🍍', color: '#43A047' },
};

const DEFAULT_CROP_META: CropMeta = { emoji: '🌱', color: '#43A047' };

function getCropMeta(cropName: string): CropMeta {
  const lower = cropName.toLowerCase();
  const match = Object.keys(CROP_META).find((key) => lower.includes(key));
  return match ? CROP_META[match] : DEFAULT_CROP_META;
}

interface StatusBadgeMeta {
  label: string;
  bg: string;
  color: string;
}

function getStatusBadgeMeta(status: BatchStatus): StatusBadgeMeta {
  switch (status) {
    case 'PROCESSING':
      return { label: 'PROCESSING', bg: '#FFF8E1', color: '#FF8F00' };
    case 'READY_FOR_SALE':
      return { label: 'READY', bg: '#E8F5E9', color: '#1A6B2E' };
    case 'SOLD':
      return { label: 'SOLD', bg: '#F5F5F5', color: '#6B7280' };
    case 'PLANTED':
    case 'GROWING':
    case 'HARVESTED':
    default:
      return { label: 'LOGGED', bg: '#E3F2FD', color: '#1565C0' };
  }
}

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
    onFocus: () => animateTo(1.02, 1, 100),
    onBlur: () => animateTo(1, 1, 150),
  };
}

function BatchListCard({
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
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();
  const cropMeta = getCropMeta(batch.cropName);
  const statusMeta = getStatusBadgeMeta(batch.status);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable style={styles.card} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} onFocus={onFocus} onBlur={onBlur}>
        <View style={styles.cardTopRow}>
          <View style={[styles.cropCircle, { backgroundColor: `${cropMeta.color}26` }]}>
            <Text style={styles.cropEmoji}>{cropMeta.emoji}</Text>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cropName}>{batch.cropName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.quantityText}>{batch.quantityKg} kg</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={colors.secondaryText} />
              <Text style={styles.metaText}>{batch.district}, {batch.region}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} />
              <Text style={styles.metaText}>{formatDate(batch.harvestedDate ?? batch.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.qrRow}>
          <View style={styles.qrThumb}>
            <QRCode value={batch.qrCodeValue || batch.id} size={32} backgroundColor={colors.white} />
          </View>
          <Text style={styles.viewQrText}>View QR</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Fab({ onPress, styles }: { onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[styles.fabWrap, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={styles.fab}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function MyBatchesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const loadBatches = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyBatches();
      setBatches(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load batches.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBatches();
      setLoading(false);
    })();
  }, [loadBatches]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBatches();
    setRefreshing(false);
  };

  const stats = useMemo(
    () => ({
      total: batches.length,
      ready: batches.filter((b) => b.status === 'READY_FOR_SALE').length,
      sold: batches.filter((b) => b.status === 'SOLD').length,
    }),
    [batches]
  );

  const filteredBatches = useMemo(() => {
    let result = batches;
    if (activeTab === 'LOGGED') {
      result = result.filter((b) => LOGGED_STATUSES.includes(b.status));
    } else if (activeTab === 'PROCESSING') {
      result = result.filter((b) => b.status === 'PROCESSING');
    } else if (activeTab === 'READY') {
      result = result.filter((b) => b.status === 'READY_FOR_SALE');
    } else if (activeTab === 'SOLD') {
      result = result.filter((b) => b.status === 'SOLD');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((b) => b.cropName.toLowerCase().includes(q));
    }
    return result;
  }, [batches, activeTab, search]);

  const handleBellPress = () => {
    Alert.alert('Notifications', 'Coming soon.');
  };

  if (loading) {
    return <LoadingOverlay message="Loading batches..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>My Harvest</Text>
          <Pressable style={styles.bellButton} onPress={handleBellPress}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>{stats.total} Total</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>{stats.ready} Ready</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>{stats.sold} Sold</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.primaryGreen} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search crops..."
            placeholderTextColor={colors.secondaryText}
          />
        </View>
      </LinearGradient>

      <View style={styles.tabsRow}>
        {FILTER_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorMessage message={error} />

      <FlatList
        removeClippedSubviews
        data={filteredBatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BatchListCard
            batch={item}
            onPress={() => navigation.navigate('BatchDetail', { batchId: item.id })}
            styles={styles}
            colors={colors}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={40} color={colors.secondaryText} />
            <Text style={styles.emptyText}>No produce batches found.</Text>
          </View>
        }
      />

      <Fab onPress={() => navigation.navigate('CreateBatch')} styles={styles} />
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
      padding: 20,
      paddingTop: 50,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    statPill: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    statPillText: {
      color: colors.primaryGreen,
      fontSize: 13,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      height: 48,
      paddingHorizontal: 14,
      marginTop: 16,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: '#1C1C1C',
    },
    tabsRow: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingHorizontal: 8,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primaryGreen,
    },
    tabText: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: '600',
    },
    tabTextActive: {
      color: colors.primaryGreen,
      fontWeight: '800',
    },
    list: {
      paddingTop: 14,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    cardTopRow: {
      flexDirection: 'row',
    },
    cropCircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    cropEmoji: {
      fontSize: 26,
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
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    quantityText: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 12,
    },
    qrRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    qrThumb: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewQrText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    emptyState: {
      alignItems: 'center',
      marginTop: 60,
      gap: 10,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
    },
    fabWrap: {
      position: 'absolute',
      right: 20,
      bottom: 24,
    },
    fab: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
  });
}

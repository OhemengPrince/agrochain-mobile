import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl, Pressable, Animated, Platform, Modal, Share, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { FarmerStackParamList, ProduceBatch, BatchStatus } from '../../types';
import { getMyBatches, deleteBatch } from '../../api/produceApi';
import { formatDate } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import SearchWithSuggestions from '../../components/SearchWithSuggestions';

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
  onLongPress,
  onViewQr,
  styles,
  colors,
}: {
  batch: ProduceBatch;
  onPress: () => void;
  onLongPress: () => void;
  onViewQr: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();
  const cropMeta = getCropMeta(batch.cropName);
  const statusMeta = getStatusBadgeMeta(batch.status);
  const qrValue = batch.qrCodeValue || String(batch.id ?? '') || 'AGROCHAIN-UNKNOWN';

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.cropCircle, { backgroundColor: `${cropMeta.color}26` }]}>
            {batch.photoUrl ? (
              <Image source={{ uri: batch.photoUrl }} style={styles.cropPhoto} resizeMode="cover" />
            ) : (
              <Text style={styles.cropEmoji}>{cropMeta.emoji}</Text>
            )}
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

        <Pressable
          style={styles.qrRow}
          onPress={(e) => { e.stopPropagation(); onViewQr(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.qrThumb}>
            <QRCode value={qrValue} size={32} backgroundColor={colors.white} />
          </View>
          <Text style={styles.viewQrText}>View QR</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function QrViewModal({
  batch,
  visible,
  onClose,
  styles,
  colors,
}: {
  batch: ProduceBatch | null;
  visible: boolean;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  if (!batch) return null;
  const qrValue = batch.qrCodeValue || String(batch.id ?? '') || 'AGROCHAIN-UNKNOWN';

  const handleShare = async () => {
    try {
      await Share.share({ message: qrValue });
    } catch {
      // ignore
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.qrModalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.qrModalSheet} onPress={() => {}}>
          <Text style={styles.qrModalTitle}>{batch.cropName}</Text>
          <Text style={styles.qrModalSubtitle}>Scan to verify this batch</Text>
          <View style={styles.qrModalCodeWrap}>
            <QRCode value={qrValue} size={200} backgroundColor={colors.white} />
          </View>
          <Text style={styles.qrModalId}>{qrValue}</Text>
          <View style={styles.qrModalActionsRow}>
            <TouchableOpacity style={styles.qrModalShareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color={colors.primaryGreen} />
              <Text style={styles.qrModalShareText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrModalCloseBtn} onPress={onClose}>
              <Text style={styles.qrModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
  const [qrBatch, setQrBatch] = useState<ProduceBatch | null>(null);

  const loadBatches = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyBatches();
      setBatches(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load batches.');
    }
  }, []);

  // Refetch every time this screen regains focus — not just on mount — so a
  // stage change made on BatchDetailScreen (or a batch just created) shows up
  // immediately on returning here instead of requiring a manual pull-to-refresh.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!hasLoadedOnceRef.current) setLoading(true);
        try {
          await loadBatches();
        } finally {
          setLoading(false);
          hasLoadedOnceRef.current = true;
        }
      })();
    }, [loadBatches])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await loadBatches(); } finally { setRefreshing(false); }
  };

  const handleDelete = useCallback((batch: ProduceBatch) => {
    Alert.alert('Delete Batch', `Are you sure you want to delete "${batch.cropName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBatch(batch.id);
            setBatches((prev) => prev.filter((b) => b.id !== batch.id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete batch.');
          }
        },
      },
    ]);
  }, []);

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
      result = result.filter(
        (b) =>
          b.cropName.toLowerCase().includes(q) ||
          (b.variety ?? '').toLowerCase().includes(q) ||
          b.status.toLowerCase().includes(q) ||
          b.region.toLowerCase().includes(q)
      );
    }
    return result;
  }, [batches, activeTab, search]);

  if (loading) {
    return <LoadingOverlay message="Loading batches..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>My Harvest</Text>
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

        <SearchWithSuggestions
          data={batches}
          keys={['cropName', 'variety', 'status', 'region']}
          value={search}
          onChangeText={setSearch}
          placeholder="Search crops, status, region..."
          colors={colors}
          containerStyle={styles.searchBarWrapper}
          barHeight={48}
        />
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
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={filteredBatches}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BatchListCard
            batch={item}
            onPress={() => navigation.navigate('BatchDetail', { batchId: item.id })}
            onLongPress={() => handleDelete(item)}
            onViewQr={() => setQrBatch(item)}
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

      <QrViewModal
        batch={qrBatch}
        visible={qrBatch !== null}
        onClose={() => setQrBatch(null)}
        styles={styles}
        colors={colors}
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
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    statPill: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    statPillText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '700',
    },
    searchBarWrapper: {
      marginTop: 16,
    },
    tabsRow: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
      backgroundColor: colors.card,
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
      paddingBottom: 120,
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
      overflow: 'hidden',
    },
    cropPhoto: {
      width: '100%',
      height: '100%',
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
      bottom: Platform.OS === 'ios' ? 116 : 100,
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
    qrModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    qrModalSheet: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
    },
    qrModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    qrModalSubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
      marginBottom: 20,
      textAlign: 'center',
    },
    qrModalCodeWrap: {
      padding: 16,
      borderWidth: 2,
      borderColor: colors.primaryGreen,
      borderRadius: 18,
      backgroundColor: colors.white,
    },
    qrModalId: {
      marginTop: 16,
      fontSize: 12,
      color: colors.secondaryText,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      textAlign: 'center',
    },
    qrModalActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 22,
      width: '100%',
    },
    qrModalShareBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      borderRadius: 12,
      height: 48,
    },
    qrModalShareText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    qrModalCloseBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      height: 48,
    },
    qrModalCloseText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getTransactions, Transaction } from '../../api/earningsApi';
import { formatDate } from '../../utils/formatters';

const FILTERS = ['All', 'Income', 'Payments', 'Withdrawals', 'Refunds'] as const;
type Filter = typeof FILTERS[number];

const INCOME_TYPES = new Set([
  'EQUIPMENT_RENTAL_INCOME',
  'MARKETPLACE_SALE_INCOME',
  'PRODUCE_SALE_INCOME',
]);

function txIcon(type: string): { name: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; color: string } {
  if (INCOME_TYPES.has(type)) return { name: 'arrow-up-circle-outline', color: '#16A34A' };
  if (type === 'WITHDRAWAL') return { name: 'arrow-forward-circle-outline', color: '#1565C0' };
  if (type === 'REFUND') return { name: 'refresh-circle-outline', color: '#FF8F00' };
  return { name: 'arrow-down-circle-outline', color: '#DC2626' };
}

function statusColor(status: string) {
  if (status === 'COMPLETED') return '#16A34A';
  if (status === 'PENDING') return '#FF8F00';
  if (status === 'FAILED') return '#DC2626';
  return '#9CA3AF';
}

function matchesFilter(tx: Transaction, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Income') return INCOME_TYPES.has(tx.type);
  if (filter === 'Payments') return tx.type.includes('PAYMENT') || tx.type.includes('PURCHASE');
  if (filter === 'Withdrawals') return tx.type === 'WITHDRAWAL';
  if (filter === 'Refunds') return tx.type === 'REFUND';
  return true;
}

export default function TransactionHistoryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const load = useCallback(async (pageNum: number, reset = false) => {
    try {
      const res = await getTransactions(pageNum);
      const data = res.data;
      const items: Transaction[] = Array.isArray(data)
        ? data
        : (data as any)?.content ?? [];
      const pages = (data as any)?.totalPages ?? 1;
      setTotalPages(pages);
      setTransactions(prev => (reset ? items : [...prev, ...items]));
      setPage(pageNum);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(0, true).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(0, true);
    setRefreshing(false);
  };

  const onLoadMore = async () => {
    if (loadingMore || page + 1 >= totalPages) return;
    setLoadingMore(true);
    await load(page + 1);
    setLoadingMore(false);
  };

  const filtered = transactions.filter(tx => matchesFilter(tx, activeFilter));
  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={s.filterWrap}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[s.filterChip, activeFilter === f && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#1A6B2E" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="receipt-outline" size={64} color={colors.border} />
          <Text style={s.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={tx => String(tx.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A6B2E" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#1A6B2E" style={{ marginVertical: 16 }} /> : null
          }
          renderItem={({ item: tx }) => {
            const isIncome = INCOME_TYPES.has(tx.type);
            const { name: iconName, color: iconColor } = txIcon(tx.type);
            const sc = statusColor(tx.status);
            return (
              <View style={s.txRow}>
                <Ionicons name={iconName} size={28} color={iconColor} style={{ marginRight: 12 }} />
                <View style={s.txBody}>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={s.txMeta}>
                    {tx.counterpartyName} · {formatDate(tx.createdAt)}
                  </Text>
                </View>
                <View style={s.txRight}>
                  <Text style={[s.txAmount, { color: isIncome ? '#16A34A' : '#DC2626' }]}>
                    {isIncome ? '+' : '-'}GHS {Math.abs(tx.netAmount).toFixed(2)}
                  </Text>
                  {tx.agrochainFee > 0 && (
                    <Text style={s.txFee}>fee: GHS {tx.agrochainFee.toFixed(2)}</Text>
                  )}
                  <View style={[s.statusPill, { backgroundColor: sc + '20' }]}>
                    <Text style={[s.statusText, { color: sc }]}>{tx.status}</Text>
                  </View>
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 16,
      paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
    filterWrap: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
      flexWrap: 'wrap',
    },
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    filterChipActive: { backgroundColor: '#1A6B2E', borderColor: '#1A6B2E' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: colors.secondaryText },
    filterChipTextActive: { color: '#fff' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: colors.secondaryText },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    txBody: { flex: 1 },
    txDesc: { fontSize: 13, fontWeight: '600', color: colors.text },
    txMeta: { fontSize: 11, color: colors.secondaryText, marginTop: 2 },
    txRight: { alignItems: 'flex-end', marginLeft: 8 },
    txAmount: { fontSize: 13, fontWeight: '700' },
    txFee: { fontSize: 10, color: colors.secondaryText, marginTop: 1 },
    statusPill: { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
    statusText: { fontSize: 9, fontWeight: '700' },
    separator: { height: 0.5, backgroundColor: colors.divider },
  });
}

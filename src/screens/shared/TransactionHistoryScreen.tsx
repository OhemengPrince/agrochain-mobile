import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { getTransactions, Transaction } from '../../api/earningsApi';
import { formatDate } from '../../utils/formatters';

const FILTERS = ['All', 'Income', 'Payments', 'Withdrawals', 'Refunds'] as const;
type Filter = typeof FILTERS[number];

const INCOME_TYPES = new Set([
  'EQUIPMENT_RENTAL_INCOME',
  'MARKETPLACE_SALE_INCOME',
  'PRODUCE_SALE_INCOME',
]);

const FILTER_ICONS: Record<Filter, keyof typeof Ionicons.glyphMap> = {
  All: 'apps-outline',
  Income: 'trending-up-outline',
  Payments: 'card-outline',
  Withdrawals: 'arrow-forward-circle-outline',
  Refunds: 'refresh-circle-outline',
};

type IconInfo = { name: keyof typeof Ionicons.glyphMap; bg: string; color: string };

function txIconInfo(type: string): IconInfo {
  if (INCOME_TYPES.has(type)) return { name: 'arrow-down-outline', bg: '#DCFCE7', color: '#16A34A' };
  if (type === 'WITHDRAWAL') return { name: 'arrow-up-outline', bg: '#DBEAFE', color: '#1565C0' };
  if (type === 'REFUND') return { name: 'refresh-outline', bg: '#FEF3C7', color: '#D97706' };
  return { name: 'arrow-up-outline', bg: '#FEE2E2', color: '#DC2626' };
}

type StatusMeta = { color: string; bg: string; label: string };
function statusMeta(status: string): StatusMeta {
  if (status === 'COMPLETED') return { color: '#16A34A', bg: '#DCFCE7', label: 'Completed' };
  if (status === 'PENDING') return { color: '#D97706', bg: '#FEF3C7', label: 'Pending' };
  if (status === 'FAILED') return { color: '#DC2626', bg: '#FEE2E2', label: 'Failed' };
  return { color: '#6B7280', bg: '#F3F4F6', label: status };
}

function matchesFilter(tx: Transaction, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Income') return INCOME_TYPES.has(tx.type);
  if (filter === 'Payments') return tx.type.includes('PAYMENT') || tx.type.includes('PURCHASE') || tx.type.includes('BOOKING');
  if (filter === 'Withdrawals') return tx.type === 'WITHDRAWAL';
  if (filter === 'Refunds') return tx.type === 'REFUND';
  return true;
}

function formatCurrencyLocal(n: number): string {
  return `GHS ${Math.abs(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionHistoryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = createStyles(colors);

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
      const items: Transaction[] = Array.isArray(data) ? data : (data as any)?.content ?? [];
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

  const totalIncome = transactions
    .filter(tx => INCOME_TYPES.has(tx.type) && tx.status === 'COMPLETED')
    .reduce((sum, tx) => sum + (tx.netAmount ?? 0), 0);
  const totalOut = transactions
    .filter(tx => !INCOME_TYPES.has(tx.type) && tx.status === 'COMPLETED')
    .reduce((sum, tx) => sum + Math.abs(tx.netAmount ?? 0), 0);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Gradient Header */}
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Transaction History</Text>
          <Text style={s.headerSubtitle}>{transactions.length} transactions</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Summary Strip */}
      <View style={s.summaryStrip}>
        <View style={s.summaryBox}>
          <View style={s.summaryIconWrap}>
            <Ionicons name="trending-up-outline" size={18} color="#16A34A" />
          </View>
          <View>
            <Text style={s.summaryLabel}>Total In</Text>
            <Text style={[s.summaryValue, { color: '#16A34A' }]}>{formatCurrencyLocal(totalIncome)}</Text>
          </View>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryBox}>
          <View style={[s.summaryIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="trending-down-outline" size={18} color="#DC2626" />
          </View>
          <View>
            <Text style={s.summaryLabel}>Total Out</Text>
            <Text style={[s.summaryValue, { color: '#DC2626' }]}>{formatCurrencyLocal(totalOut)}</Text>
          </View>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
      >
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[s.filterChip, activeFilter === f && s.filterChipActive]}
          >
            <Ionicons
              name={FILTER_ICONS[f]}
              size={13}
              color={activeFilter === f ? '#fff' : colors.secondaryText}
              style={{ marginRight: 4 }}
            />
            <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#1A6B2E" />
          <Text style={s.loadingText}>Loading transactions...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={s.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={40} color="#16A34A" />
          </LinearGradient>
          <Text style={s.emptyTitle}>No transactions found</Text>
          <Text style={s.emptySubtitle}>
            {activeFilter === 'All' ? 'Your transaction history will appear here.' : `No ${activeFilter.toLowerCase()} yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={tx => String(tx.id)}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A6B2E" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#1A6B2E" style={{ marginVertical: 16 }} /> : null
          }
          renderItem={({ item: tx }) => {
            const isIncome = INCOME_TYPES.has(tx.type);
            const iconInfo = txIconInfo(tx.type);
            const sm = statusMeta(tx.status);
            const amountColor = isIncome ? '#16A34A' : '#DC2626';
            const amountPrefix = isIncome ? '+' : '-';

            return (
              <View style={s.txCard}>
                <View style={[s.txIconCircle, { backgroundColor: iconInfo.bg }]}>
                  <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
                </View>

                <View style={s.txBody}>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.description || tx.type.replace(/_/g, ' ')}</Text>
                  <View style={s.txMetaRow}>
                    {tx.counterpartyName ? (
                      <Text style={s.txCounterparty} numberOfLines={1}>{tx.counterpartyName}</Text>
                    ) : null}
                    {tx.counterpartyName ? <View style={s.txDot} /> : null}
                    <Text style={s.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  {tx.paymentMethod ? (
                    <Text style={s.txMethod}>{tx.paymentMethod}</Text>
                  ) : null}
                </View>

                <View style={s.txRight}>
                  <Text style={[s.txAmount, { color: amountColor }]}>
                    {amountPrefix}{formatCurrencyLocal(tx.netAmount)}
                  </Text>
                  {tx.agrochainFee > 0 && (
                    <Text style={s.txFee}>fee: GHS {tx.agrochainFee.toFixed(2)}</Text>
                  )}
                  <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
                    <Text style={[s.statusText, { color: sm.color }]}>{sm.label}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 56,
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

    summaryStrip: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: -1,
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    summaryBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryIconWrap: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: '#DCFCE7',
      alignItems: 'center', justifyContent: 'center',
    },
    summaryLabel: { fontSize: 11, color: colors.secondaryText, fontWeight: '500' },
    summaryValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    summaryDivider: { width: 1, height: 36, backgroundColor: colors.divider, marginHorizontal: 12 },

    filterScroll: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    filterChipActive: { backgroundColor: '#1A6B2E', borderColor: '#1A6B2E' },
    filterChipText: { fontSize: 12, fontWeight: '600', color: colors.secondaryText },
    filterChipTextActive: { color: '#fff' },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: colors.secondaryText },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
    emptyIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    emptySubtitle: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', lineHeight: 20 },

    listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 8 },

    txCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.divider,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    txIconCircle: {
      width: 46, height: 46, borderRadius: 23,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    txBody: { flex: 1, minWidth: 0 },
    txDesc: { fontSize: 13, fontWeight: '700', color: colors.text },
    txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    txCounterparty: { fontSize: 11, color: colors.secondaryText, fontWeight: '500', flexShrink: 1 },
    txDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.secondaryText, marginHorizontal: 5 },
    txDate: { fontSize: 11, color: colors.secondaryText },
    txMethod: { fontSize: 10, color: colors.secondaryText, marginTop: 2, fontStyle: 'italic' },

    txRight: { alignItems: 'flex-end', marginLeft: 10 },
    txAmount: { fontSize: 14, fontWeight: '800' },
    txFee: { fontSize: 9, color: colors.secondaryText, marginTop: 1 },
    statusPill: {
      borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4,
    },
    statusText: { fontSize: 10, fontWeight: '700' },
  });
}

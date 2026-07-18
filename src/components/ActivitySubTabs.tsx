import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { EarningsSummary, Transaction, getTransactions } from '../api/earningsApi';
import { Booking } from '../types';
import { getMyBookings, getIncomingBookings } from '../api/bookingApi';
import { formatDate } from '../utils/formatters';

const GREEN = '#1A6B2E';

const SUB_TABS = [
  { key: 'Earnings', label: '💰 Earnings' },
  { key: 'Bookings', label: '📅 Bookings' },
  { key: 'Purchases', label: '🛒 Purchases' },
  { key: 'Sales', label: '📦 Sales' },
  { key: 'Transactions', label: '💳 Transactions' },
];

interface Props {
  earnings: EarningsSummary | null;
  onWithdraw: () => void;
  onViewAllTransactions: () => void;
}

export default function ActivitySubTabs({ earnings, onWithdraw, onViewAllTransactions }: Props) {
  const { colors } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState('Earnings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incomingBookings, setIncomingBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'Bookings' && !bookingsLoaded && !bookingsLoading) {
      setBookingsLoading(true);
      Promise.all([getMyBookings(), getIncomingBookings()])
        .then(([mine, incoming]) => {
          setBookings(mine);
          setIncomingBookings(incoming);
          setBookingsLoaded(true);
        })
        .catch(() => {})
        .finally(() => setBookingsLoading(false));
    }
    if (['Purchases', 'Sales', 'Transactions'].includes(activeSubTab) && !txLoaded && !txLoading) {
      setTxLoading(true);
      getTransactions(0)
        .then(r => {
          setTransactions(r.data.content ?? []);
          setTxLoaded(true);
        })
        .catch(() => {})
        .finally(() => setTxLoading(false));
    }
  }, [activeSubTab]);

  const purchases = transactions.filter(t =>
    t.type?.includes('PURCHASE') || t.type?.includes('BUY')
  );
  const sales = transactions.filter(t =>
    t.type?.includes('INCOME') || t.type?.includes('SALE')
  );

  const statusColor = (status: string) => {
    if (status === 'CONFIRMED' || status === 'COMPLETED') return { bg: '#E8F5E9', text: '#16A34A' };
    if (status === 'PENDING') return { bg: '#FFF9E6', text: '#FF8F00' };
    return { bg: '#FEE2E2', text: '#DC2626' };
  };

  const EmptyState = ({ icon, message }: { icon: any; message: string }) => (
    <View style={{ paddingVertical: 36, paddingHorizontal: 20, alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Ionicons name={icon} size={30} color={colors.secondaryText} />
      </View>
      <Text style={{ color: colors.secondaryText, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
    </View>
  );

  // ── Earnings ──────────────────────────────────────────────────────────────
  const renderEarnings = () => (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1, alignItems: 'center', padding: 14, backgroundColor: '#FFF9E6', borderRadius: 14 }}>
          <Text style={{ color: '#FF8F00', fontSize: 11, marginBottom: 4, fontWeight: '600' }}>⏳ Pending</Text>
          <Text style={{ color: '#FF8F00', fontSize: 20, fontWeight: '800' }}>
            GHS {(earnings?.pendingBalance ?? 0).toFixed(2)}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>awaiting delivery</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', padding: 14, backgroundColor: '#E8F5E9', borderRadius: 14 }}>
          <Text style={{ color: GREEN, fontSize: 11, marginBottom: 4, fontWeight: '600' }}>✅ Available</Text>
          <Text style={{ color: GREEN, fontSize: 20, fontWeight: '800' }}>
            GHS {(earnings?.availableBalance ?? 0).toFixed(2)}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>ready to withdraw</Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12, marginBottom: 16 }}>
        {([
          ['Total Earned', `GHS ${(earnings?.totalEarned ?? 0).toFixed(2)}`, false],
          ['AgroChain Fee', `-GHS ${(earnings?.totalAgrochainFee ?? 0).toFixed(2)}`, true],
          ['Total Withdrawn', `GHS ${(earnings?.totalWithdrawn ?? 0).toFixed(2)}`, false],
        ] as [string, string, boolean][]).map(([key, val, isRed]) => (
          <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: colors.secondaryText }}>{key}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isRed ? '#DC2626' : colors.text }}>{val}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onWithdraw}
        disabled={(earnings?.availableBalance ?? 0) < 10}
        style={{
          backgroundColor: (earnings?.availableBalance ?? 0) < 10 ? '#E5E7EB' : GREEN,
          borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8,
        }}
      >
        <Text style={{
          color: (earnings?.availableBalance ?? 0) < 10 ? '#9CA3AF' : '#fff',
          fontSize: 14, fontWeight: '700',
        }}>
          Withdraw Funds
        </Text>
      </Pressable>
      {(earnings?.availableBalance ?? 0) < 10 && (
        <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
          Minimum withdrawal: GHS 10.00
        </Text>
      )}

      <Pressable
        onPress={onViewAllTransactions}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
      >
        <Text style={{ fontSize: 13, color: GREEN, fontWeight: '700' }}>View All Transactions</Text>
        <Ionicons name="arrow-forward" size={13} color={GREEN} />
      </Pressable>
    </View>
  );

  // ── Bookings ──────────────────────────────────────────────────────────────
  const renderBookings = () => {
    if (bookingsLoading) {
      return <ActivityIndicator color={GREEN} style={{ marginVertical: 32 }} />;
    }
    const allBookings = [
      ...bookings.map(b => ({ ...b, _direction: 'outgoing' as const })),
      ...incomingBookings.map(b => ({ ...b, _direction: 'incoming' as const })),
    ];
    if (allBookings.length === 0) {
      return <EmptyState icon="calendar-outline" message={`No bookings yet.\nBrowse equipment to make your first booking!`} />;
    }
    return (
      <View style={{ padding: 16, gap: 10 }}>
        {allBookings.map(b => {
          const sc = statusColor(b.status);
          return (
            <View key={`${b.id}-${b._direction}`} style={{ backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                  {b.equipmentName}
                </Text>
                <View style={{ backgroundColor: sc.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: sc.text }}>{b.status}</Text>
                </View>
              </View>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 2 }}>
                {b._direction === 'incoming' ? `From: ${b.farmerName}` : `Owner: ${b.ownerName}`}
              </Text>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 6 }}>
                {formatDate(b.startDate)} → {formatDate(b.endDate)}
              </Text>
              <Text style={{ color: GREEN, fontSize: 14, fontWeight: '700' }}>
                GHS {b.totalCost?.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Purchases ─────────────────────────────────────────────────────────────
  const renderPurchases = () => {
    if (txLoading) {
      return <ActivityIndicator color={GREEN} style={{ marginVertical: 32 }} />;
    }
    if (purchases.length === 0) {
      return <EmptyState icon="storefront-outline" message={`No purchases yet.\nBrowse the marketplace to find great deals!`} />;
    }
    return (
      <View style={{ padding: 16, gap: 10 }}>
        {purchases.map(t => (
          <View key={t.id} style={{ backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: '#F0FFF4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="storefront-outline" size={22} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                  {t.description}
                </Text>
                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>From: {t.counterpartyName}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(t.createdAt)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '700' }}>
                  -GHS {t.amount?.toFixed(2)}
                </Text>
                <View style={{ backgroundColor: t.status === 'COMPLETED' ? '#E8F5E9' : '#FFF9E6', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, color: t.status === 'COMPLETED' ? '#16A34A' : '#FF8F00', fontWeight: '700' }}>
                    {t.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ── Sales ─────────────────────────────────────────────────────────────────
  const renderSales = () => {
    if (txLoading) {
      return <ActivityIndicator color={GREEN} style={{ marginVertical: 32 }} />;
    }
    if (sales.length === 0) {
      return <EmptyState icon="arrow-up-circle-outline" message={`No sales yet.\nList your equipment or products to start earning!`} />;
    }
    return (
      <View style={{ padding: 16, gap: 10 }}>
        {sales.map(t => (
          <View key={t.id} style={{ backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="arrow-up-circle-outline" size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                  {t.description}
                </Text>
                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>To: {t.counterpartyName}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(t.createdAt)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#16A34A', fontSize: 14, fontWeight: '700' }}>
                  +GHS {t.netAmount?.toFixed(2)}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 10 }}>
                  fee: {t.agrochainFee?.toFixed(2)}
                </Text>
                <View style={{ backgroundColor: t.status === 'COMPLETED' ? '#E8F5E9' : '#FFF9E6', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, color: t.status === 'COMPLETED' ? '#16A34A' : '#FF8F00', fontWeight: '700' }}>
                    {t.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ── Transactions ──────────────────────────────────────────────────────────
  const renderTransactions = () => {
    if (txLoading) {
      return <ActivityIndicator color={GREEN} style={{ marginVertical: 32 }} />;
    }
    const recent = transactions.slice(0, 10);
    if (recent.length === 0) {
      return <EmptyState icon="receipt-outline" message="No transactions yet." />;
    }
    return (
      <View style={{ padding: 16, gap: 10 }}>
        {recent.map(t => {
          const isIncome = t.type?.includes('INCOME') || t.type?.includes('SALE');
          return (
            <View key={t.id} style={{ backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: isIncome ? '#E8F5E9' : '#FEE2E2',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons
                    name={isIncome ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={isIncome ? '#16A34A' : '#DC2626'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {t.description}
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(t.createdAt)}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isIncome ? '#16A34A' : '#DC2626' }}>
                  {isIncome ? '+' : '-'}GHS {(isIncome ? t.netAmount : t.amount)?.toFixed(2)}
                </Text>
              </View>
            </View>
          );
        })}
        <Pressable
          onPress={onViewAllTransactions}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
        >
          <Text style={{ fontSize: 13, color: GREEN, fontWeight: '700' }}>View All Transactions</Text>
          <Ionicons name="arrow-forward" size={13} color={GREEN} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{
      marginHorizontal: 16, marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 20, overflow: 'hidden',
      borderWidth: 1.5, borderColor: 'rgba(26,107,46,0.15)',
      shadowColor: '#1A6B2E', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
    }}>
      {/* Sub-tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.divider }}
      >
        {SUB_TABS.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveSubTab(tab.key)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 13,
              borderBottomWidth: 2.5,
              borderBottomColor: activeSubTab === tab.key ? GREEN : 'transparent',
            }}
          >
            <Text style={{
              color: activeSubTab === tab.key ? GREEN : colors.secondaryText,
              fontWeight: activeSubTab === tab.key ? '700' : '400',
              fontSize: 13,
            }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeSubTab === 'Earnings' && renderEarnings()}
      {activeSubTab === 'Bookings' && renderBookings()}
      {activeSubTab === 'Purchases' && renderPurchases()}
      {activeSubTab === 'Sales' && renderSales()}
      {activeSubTab === 'Transactions' && renderTransactions()}
    </View>
  );
}

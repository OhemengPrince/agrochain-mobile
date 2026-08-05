import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { EarningsSummary } from '../api/earningsApi';
import { Booking, MarketplacePurchase, ProducePurchase, PurchaseStatus } from '../types';
import { getMyBookings, getIncomingBookings } from '../api/bookingApi';
import {
  getMyMarketplacePurchases,
  getIncomingMarketplacePurchases,
  getMyProducePurchases,
  getIncomingProducePurchases,
  markMarketplaceShipped,
  markProduceDelivered,
  confirmMarketplaceReceipt,
  confirmProduceReceipt,
  cancelMarketplacePurchase,
  cancelProducePurchase,
} from '../api/purchaseApi';
import { formatDate } from '../utils/formatters';
import FullScreenSheet from './FullScreenSheet';

type UnifiedOrder = {
  id: string;
  kind: 'marketplace' | 'produce';
  itemName: string;
  counterpartyName: string;
  amount: number;
  status: PurchaseStatus;
  createdAt: string;
};

function toUnified(list: (MarketplacePurchase | ProducePurchase)[], kind: 'marketplace' | 'produce', direction: 'buyer' | 'seller'): UnifiedOrder[] {
  return list.map((p: any) => ({
    id: p.id,
    kind,
    itemName: kind === 'marketplace' ? p.listingName : p.cropName,
    counterpartyName: direction === 'buyer'
      ? (kind === 'marketplace' ? p.sellerName : p.farmerName)
      : p.buyerName,
    amount: p.totalAmount,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

const GREEN = '#1A6B2E';

type DetailKey = 'Earnings' | 'Bookings' | 'Purchases' | 'Sales';

const TILES: { key: DetailKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Bookings', label: 'Bookings', icon: 'calendar-outline' },
  { key: 'Earnings', label: 'Earnings', icon: 'cash-outline' },
  { key: 'Purchases', label: 'Purchases', icon: 'storefront-outline' },
  { key: 'Sales', label: 'Sales', icon: 'arrow-up-circle-outline' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  earnings: EarningsSummary | null;
  onWithdraw: () => void;
  onViewAllTransactions: () => void;
}

// Renders as two layers of FullScreenSheet (grid + per-section detail),
// returned as top-level siblings rather than nested inside a parent
// FullScreenSheet's ScrollView — nesting there would break the detail
// sheets' full-screen positioning, since an absolutely-positioned child
// inside scrollable content is bounded by that content's box, not the
// viewport.
export default function ActivitySubTabs({ visible, onClose, earnings, onWithdraw, onViewAllTransactions }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [activeDetail, setActiveDetail] = useState<DetailKey | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incomingBookings, setIncomingBookings] = useState<Booking[]>([]);
  const [purchases, setPurchases] = useState<UnifiedOrder[]>([]);
  const [sales, setSales] = useState<UnifiedOrder[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [purchasesLoaded, setPurchasesLoaded] = useState(false);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadPurchases = () => {
    setPurchasesLoading(true);
    Promise.all([getMyMarketplacePurchases(), getMyProducePurchases()])
      .then(([mkt, prod]) => {
        const merged = [
          ...toUnified(mkt, 'marketplace', 'buyer'),
          ...toUnified(prod, 'produce', 'buyer'),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPurchases(merged);
        setPurchasesLoaded(true);
      })
      .catch(() => {})
      .finally(() => setPurchasesLoading(false));
  };

  const loadSales = () => {
    setSalesLoading(true);
    Promise.all([getIncomingMarketplacePurchases(), getIncomingProducePurchases()])
      .then(([mkt, prod]) => {
        const merged = [
          ...toUnified(mkt, 'marketplace', 'seller'),
          ...toUnified(prod, 'produce', 'seller'),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSales(merged);
        setSalesLoaded(true);
      })
      .catch(() => {})
      .finally(() => setSalesLoading(false));
  };

  useEffect(() => {
    if (!visible) setActiveDetail(null);
  }, [visible]);

  useEffect(() => {
    if (activeDetail === 'Bookings' && !bookingsLoaded && !bookingsLoading) {
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
    if (activeDetail === 'Purchases' && !purchasesLoaded && !purchasesLoading) {
      loadPurchases();
    }
    if (activeDetail === 'Sales' && !salesLoaded && !salesLoading) {
      loadSales();
    }
  }, [activeDetail]);

  const handleConfirmReceipt = async (order: UnifiedOrder) => {
    setActioningId(order.id);
    try {
      if (order.kind === 'marketplace') await confirmMarketplaceReceipt(order.id);
      else await confirmProduceReceipt(order.id);
      loadPurchases();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to confirm receipt.');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancelPurchase = async (order: UnifiedOrder) => {
    setActioningId(order.id);
    try {
      if (order.kind === 'marketplace') await cancelMarketplacePurchase(order.id);
      else await cancelProducePurchase(order.id);
      loadPurchases();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel order.');
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkShippedOrDelivered = async (order: UnifiedOrder) => {
    setActioningId(order.id);
    try {
      if (order.kind === 'marketplace') await markMarketplaceShipped(order.id);
      else await markProduceDelivered(order.id);
      loadSales();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update order.');
    } finally {
      setActioningId(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'CONFIRMED' || status === 'COMPLETED') return { bg: '#E8F5E9', text: '#16A34A' };
    if (status === 'PAID' || status === 'SHIPPED' || status === 'DELIVERED') return { bg: '#E3F2FD', text: '#1565C0' };
    if (status === 'PENDING' || status === 'PENDING_PAYMENT') return { bg: '#FFF9E6', text: '#FF8F00' };
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
    <View>
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
      <View style={{ gap: 10 }}>
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
    if (purchasesLoading) {
      return <ActivityIndicator color={GREEN} style={{ marginVertical: 32 }} />;
    }
    if (purchases.length === 0) {
      return <EmptyState icon="storefront-outline" message={`No purchases yet.\nBrowse the marketplace to find great deals!`} />;
    }
    return (
      <View style={{ gap: 10 }}>
        {purchases.map(o => {
          const sc = statusColor(o.status);
          const busy = actioningId === o.id;
          return (
            <View key={`${o.kind}-${o.id}`} style={{ backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: '#F0FFF4', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={o.kind === 'produce' ? 'leaf-outline' : 'storefront-outline'} size={22} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {o.itemName}
                  </Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>From: {o.counterpartyName}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(o.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '700' }}>
                    -GHS {o.amount?.toFixed(2)}
                  </Text>
                  <View style={{ backgroundColor: sc.bg, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                    <Text style={{ fontSize: 9, color: sc.text, fontWeight: '700' }}>{o.status}</Text>
                  </View>
                </View>
              </View>
              {(o.status === 'DELIVERED' || o.status === 'PAID') && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {o.status === 'DELIVERED' && (
                    <Pressable
                      disabled={busy}
                      onPress={() => handleConfirmReceipt(o)}
                      style={{ flex: 1, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 9, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Confirm Receipt</Text>}
                    </Pressable>
                  )}
                  {o.status === 'PAID' && (
                    <Pressable
                      disabled={busy}
                      onPress={() => handleCancelPurchase(o)}
                      style={{ flex: 1, borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 9, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>Cancel Order</Text>}
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ── Sales ─────────────────────────────────────────────────────────────────
  const renderSales = () => {
    if (salesLoading) {
      return <ActivityIndicator color={GREEN} style={{ marginVertical: 32 }} />;
    }
    if (sales.length === 0) {
      return <EmptyState icon="arrow-up-circle-outline" message={`No sales yet.\nList your equipment or products to start earning!`} />;
    }
    return (
      <View style={{ gap: 10 }}>
        {sales.map(o => {
          const sc = statusColor(o.status);
          const busy = actioningId === o.id;
          return (
            <View key={`${o.kind}-${o.id}`} style={{ backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={o.kind === 'produce' ? 'leaf-outline' : 'arrow-up-circle-outline'} size={22} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {o.itemName}
                  </Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>To: {o.counterpartyName}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(o.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#16A34A', fontSize: 14, fontWeight: '700' }}>
                    +GHS {o.amount?.toFixed(2)}
                  </Text>
                  <View style={{ backgroundColor: sc.bg, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                    <Text style={{ fontSize: 9, color: sc.text, fontWeight: '700' }}>{o.status}</Text>
                  </View>
                </View>
              </View>
              {o.status === 'PAID' && (
                <Pressable
                  disabled={busy}
                  onPress={() => handleMarkShippedOrDelivered(o)}
                  style={{ marginTop: 12, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 9, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {o.kind === 'produce' ? 'Mark Delivered' : 'Mark Shipped'}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const DETAIL_CONTENT: Record<DetailKey, () => React.ReactNode> = {
    Bookings: renderBookings,
    Earnings: renderEarnings,
    Purchases: renderPurchases,
    Sales: renderSales,
  };

  const DETAIL_ICON: Record<DetailKey, keyof typeof Ionicons.glyphMap> = {
    Bookings: 'calendar-outline',
    Earnings: 'cash-outline',
    Purchases: 'storefront-outline',
    Sales: 'arrow-up-circle-outline',
  };

  return (
    <>
      <FullScreenSheet
        visible={visible && !activeDetail}
        onClose={onClose}
        title="Activity"
        subtitle="Earnings, bookings & transaction history"
        icon="pulse-outline"
      >
        <View style={styles.tileRow}>
          {TILES.map((tile) => (
            <Pressable key={tile.key} style={styles.tile} onPress={() => setActiveDetail(tile.key)}>
              <View style={styles.tileIconCircle}>
                <Ionicons name={tile.icon} size={22} color={GREEN} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
        </View>
      </FullScreenSheet>

      {(Object.keys(DETAIL_CONTENT) as DetailKey[]).map((key) => (
        <FullScreenSheet
          key={key}
          visible={visible && activeDetail === key}
          onClose={() => setActiveDetail(null)}
          title={key}
          icon={DETAIL_ICON[key]}
        >
          {DETAIL_CONTENT[key]()}
        </FullScreenSheet>
      ))}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    tileRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      gap: 8,
    },
    tile: {
      flex: 1,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    tileIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.lightGreen,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 8,
    },
    tileLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: colors.text,
    },
  };
}

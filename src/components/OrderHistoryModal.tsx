import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { MarketplacePurchase, ProducePurchase } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface Props {
  visible: boolean;
  onClose: () => void;
  marketplacePurchases: MarketplacePurchase[];
  producePurchases: ProducePurchase[];
}

interface OrderRow {
  id: string;
  name: string;
  counterparty: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function OrderHistoryModal({ visible, onClose, marketplacePurchases, producePurchases }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const orders: OrderRow[] = [
    ...marketplacePurchases.map((p) => ({
      id: p.id, name: p.listingName, counterparty: p.sellerName,
      amount: p.totalAmount, status: p.status, createdAt: p.createdAt,
    })),
    ...producePurchases.map((p) => ({
      id: p.id, name: p.cropName, counterparty: p.farmerName,
      amount: p.totalAmount, status: p.status, createdAt: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Order History</Text>
              <Text style={styles.subtitle}>{orders.length} order{orders.length === 1 ? '' : 's'}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.secondaryText} />
            </Pressable>
          </View>

          {orders.length === 0 ? (
            <Text style={styles.emptyText}>No orders yet.</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {orders.map((order) => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderIcon}>
                    <Ionicons name="receipt-outline" size={18} color={colors.primaryGreen} />
                  </View>
                  <View style={styles.orderBody}>
                    <Text style={styles.orderName} numberOfLines={1}>{order.name}</Text>
                    <Text style={styles.orderMeta}>{order.counterparty} · {formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderAmount}>{formatCurrency(order.amount)}</Text>
                    <Text style={styles.orderStatus}>{order.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 36, maxHeight: '75%',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    emptyText: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', paddingVertical: 20 },
    list: { flexGrow: 0, flexShrink: 1 },
    orderRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    orderIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    orderBody: { flex: 1 },
    orderName: { fontSize: 14, fontWeight: '700', color: colors.text },
    orderMeta: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    orderRight: { alignItems: 'flex-end' },
    orderAmount: { fontSize: 14, fontWeight: '800', color: colors.primaryGreen },
    orderStatus: { fontSize: 11, color: colors.secondaryText, marginTop: 2, textTransform: 'capitalize' },
  });
}

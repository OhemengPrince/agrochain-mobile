import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import BatchCard from '../../components/BatchCard';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerHomeMain'>;

export default function BuyerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setError(null);
    try {
      const data = await getProduceCatalogue({ size: 5 });
      setBatches(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load produce.');
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

  if (loading) {
    return <LoadingOverlay message="Loading marketplace..." />;
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <View style={styles.container}>
      <FlatList
        data={batches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.banner}>
              <Text style={styles.bannerGreeting}>Hello, {firstName} 👋</Text>
              <Text style={styles.bannerSubtitle}>Discover fresh, traceable produce straight from the farm</Text>
            </LinearGradient>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BuyerQrScanner')}>
                <View style={[styles.actionIconWrap, { backgroundColor: colors.lightAmber }]}>
                  <Ionicons name="qr-code" size={22} color={colors.accentAmber} />
                </View>
                <Text style={styles.actionText}>Scan QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BuyerCatalogue')}>
                <View style={[styles.actionIconWrap, { backgroundColor: colors.lightGreen }]}>
                  <Ionicons name="grid" size={22} color={colors.primaryGreen} />
                </View>
                <Text style={styles.actionText}>Browse Catalogue</Text>
              </TouchableOpacity>
            </View>

            <ErrorMessage message={error} />
            <Text style={styles.sectionTitle}>Recently Listed</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BatchCard
            batch={item}
            showCertification
            onPress={() => navigation.navigate('ProduceDetail', { batchId: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No produce listed yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
  },
  banner: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  bannerGreeting: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    ...cardShadow,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondaryText,
    marginTop: 40,
  },
});

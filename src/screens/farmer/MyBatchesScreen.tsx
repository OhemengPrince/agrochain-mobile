import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FarmerStackParamList, ProduceBatch } from '../../types';
import { getMyBatches } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { buttonShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import BatchCard from '../../components/BatchCard';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerBatchesList'>;

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

function NewBatchButton({ onPress, styles, colors }: { onPress: () => void; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable style={styles.newButton} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Ionicons name="add" size={18} color={colors.white} />
        <Text style={styles.newButtonText}>New Batch</Text>
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

  if (loading) {
    return <LoadingOverlay message="Loading batches..." />;
  }

  return (
    <View style={styles.container}>
      <ErrorMessage message={error} />
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Your Produce</Text>
          <Text style={styles.headerSubtitle}>{batches.length} batch{batches.length === 1 ? '' : 'es'} tracked</Text>
        </View>
        <NewBatchButton onPress={() => navigation.navigate('CreateBatch')} styles={styles} colors={colors} />
      </View>
      <FlatList
        data={batches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BatchCard batch={item} onPress={() => navigation.navigate('BatchDetail', { batchId: item.id })} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={40} color={colors.secondaryText} />
            <Text style={styles.emptyText}>You have no produce batches yet.</Text>
          </View>
        }
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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    newButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...buttonShadow,
    },
    newButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '700',
    },
    list: {
      paddingHorizontal: 14,
      paddingTop: 6,
      paddingBottom: 24,
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
  });
}

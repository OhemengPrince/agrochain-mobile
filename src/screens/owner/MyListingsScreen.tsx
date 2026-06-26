import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Equipment } from '../../types';
import { getMyListings } from '../../api/equipmentApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import EquipmentCard from '../../components/EquipmentCard';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerEquipmentList'>;

export default function MyListingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [listings, setListings] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyListings();
      setListings(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load listings.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadListings();
      setLoading(false);
    })();
  }, [loadListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingOverlay message="Loading your listings..." />;
  }

  return (
    <View style={styles.container}>
      <ErrorMessage message={error} />
      <View style={styles.headerRow}>
        <AppButton title="Add Equipment" onPress={() => navigation.navigate('CreateEquipment')} />
      </View>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <EquipmentCard
            equipment={item}
            onPress={() => navigation.navigate('EditEquipment', { equipmentId: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>You haven't listed any equipment yet.</Text>}
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
      padding: 14,
    },
    list: {
      paddingHorizontal: 14,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      marginTop: 40,
    },
  });
}

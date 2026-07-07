import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  Pressable,
  Animated,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Equipment } from '../../types';
import EquipmentImage from '../../components/EquipmentImage';
import { getMyListings, updateEquipment, deleteEquipment } from '../../api/equipmentApi';
import { formatCurrency } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerEquipmentList'>;

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

function MyEquipmentCard({
  equipment,
  styles,
  colors,
  onToggleAvailability,
  onEdit,
  onDelete,
  toggling,
}: {
  equipment: Equipment;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onToggleAvailability: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  toggling: boolean;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onEdit} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.imageWrap}>
          <EquipmentImage category={equipment.category} imageUrl={equipment.imageUrl} style={styles.image} resizeMode="contain" />
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{formatCurrency(equipment.dailyRate)}/day</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{equipment.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={colors.secondaryText} />
            <Text style={styles.location}>{equipment.district}, {equipment.region}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>
          {equipment.isAvailable ? 'Available' : 'Unavailable'}
        </Text>
        <Switch
          value={equipment.isAvailable}
          onValueChange={onToggleAvailability}
          disabled={toggling}
          trackColor={{ false: colors.border, true: colors.lightGreen }}
          thumbColor={equipment.isAvailable ? colors.primaryGreen : '#9CA3AF'}
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.editButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color={colors.primaryGreen} />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color={colors.errorRed} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function MyListingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [listings, setListings] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      try { await loadListings(); } finally { setLoading(false); }
    })();
  }, [loadListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await loadListings(); } finally { setRefreshing(false); }
  };

  const handleToggleAvailability = useCallback(
    async (equipmentId: string, value: boolean) => {
      setTogglingId(equipmentId);
      setListings((prev) =>
        prev.map((item) => (item.id === equipmentId ? { ...item, isAvailable: value } : item))
      );
      try {
        await updateEquipment(equipmentId, { isAvailable: value });
      } catch (err: any) {
        setListings((prev) =>
          prev.map((item) => (item.id === equipmentId ? { ...item, isAvailable: !value } : item))
        );
        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update availability.');
      } finally {
        setTogglingId(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    (equipmentId: string, name: string) => {
      Alert.alert('Delete Equipment', `Are you sure you want to delete "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEquipment(equipmentId);
              await loadListings();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete equipment.');
            }
          },
        },
      ]);
    },
    [loadListings]
  );

  if (loading) {
    return <LoadingOverlay message="Loading your listings..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>My Equipment</Text>
            <Text style={styles.headerSubtitle}>{listings.length} listed</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('CreateEquipment')}>
            <Ionicons name="add" size={24} color={colors.primaryGreen} />
          </Pressable>
        </View>
      </LinearGradient>

      <ErrorMessage message={error} />

      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={listings}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MyEquipmentCard
            equipment={item}
            styles={styles}
            colors={colors}
            toggling={togglingId === item.id}
            onToggleAvailability={(value) => handleToggleAvailability(item.id, value)}
            onEdit={() => navigation.navigate('EditEquipment', { equipmentId: item.id })}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.emptyTitle}>No equipment yet</Text>
            <Text style={styles.emptySubtitle}>Add your first piece of equipment to start renting it out.</Text>
            <Pressable style={styles.emptyAddButton} onPress={() => navigation.navigate('CreateEquipment')}>
              <Text style={styles.emptyAddButtonText}>Add Equipment</Text>
            </Pressable>
          </View>
        }
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
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerSubtitle: {
      fontSize: 13,
      color: '#FFFFFF',
      opacity: 0.8,
      marginTop: 4,
    },
    addButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },
    list: {
      padding: 14,
      paddingBottom: 120,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      ...cardShadow,
    },
    imageWrap: {
      position: 'relative',
      backgroundColor: '#F0F7F2',
    },
    image: {
      width: '100%',
      height: 140,
      backgroundColor: '#F0F7F2',
    },
    priceBadge: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      backgroundColor: colors.primaryGreen,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    priceBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    body: {
      padding: 14,
      paddingBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    location: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: 12,
      marginHorizontal: 14,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    statusLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primaryGreen,
      paddingVertical: 9,
    },
    editButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    deleteButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.errorRed,
      paddingVertical: 9,
    },
    deleteButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.errorRed,
    },
    emptyState: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: 'center',
    },
    emptyAddButton: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 20,
    },
    emptyAddButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

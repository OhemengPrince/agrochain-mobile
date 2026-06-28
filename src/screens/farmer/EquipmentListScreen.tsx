import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet, TextInput, Text, RefreshControl, TouchableOpacity, Image, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Equipment, EquipmentCategory } from '../../types';
import { searchEquipment } from '../../api/equipmentApi';
import { EQUIPMENT_IMAGES } from '../../constants/equipmentImages';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import StarRating from '../../components/StarRating';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerEquipmentList'>;

const CATEGORIES: { label: string; value: EquipmentCategory | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Tractor', value: 'TRACTOR' },
  { label: 'Harvester', value: 'HARVESTER' },
  { label: 'Irrigation', value: 'IRRIGATION_PUMP' },
  { label: 'Sprayer', value: 'SPRAYER' },
  { label: 'Tiller', value: 'PLOUGH' },
  { label: 'Sheller', value: 'TRAILER' },
];

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

function EquipmentListCard({
  item,
  onPress,
  styles,
  colors,
}: {
  item: Equipment;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}>
      <Pressable style={styles.card} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} onFocus={onFocus} onBlur={onBlur}>
        <View style={styles.imageWrap}>
          <Image source={EQUIPMENT_IMAGES[item.category]} style={styles.image} resizeMode="cover" />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category.replace(/_/g, ' ')}</Text>
          </View>
          <View style={[styles.availabilityBadge, !item.isAvailable && styles.unavailableBadge]}>
            <Text style={styles.availabilityBadgeText}>
              {item.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>GHS {item.dailyRate}/day</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{item.ownerName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.ownerName} numberOfLines={1}>{item.ownerName}</Text>
            <Ionicons name="checkmark-circle" size={14} color={colors.primaryGreen} />
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={12} color={colors.secondaryText} />
              <Text style={styles.detailText}>{item.district}, {item.region}</Text>
            </View>
            {item.averageRating !== undefined && (
              <View style={styles.detailItem}>
                <StarRating rating={item.averageRating} size={12} />
                {item.totalReviews !== undefined && (
                  <Text style={styles.detailText}>({item.totalReviews})</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={onPress} style={styles.viewDetailsRow}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primaryGreen} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookNowButton} onPress={onPress}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function EquipmentListScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [query, setQuery] = useState(route.params?.query ?? '');
  const [category, setCategory] = useState<EquipmentCategory | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEquipment = useCallback(async (searchQuery: string, cat?: EquipmentCategory) => {
    setError(null);
    try {
      const data = await searchEquipment({ query: searchQuery || undefined, category: cat });
      setEquipment(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load equipment.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadEquipment(route.params?.query ?? '', undefined);
      setLoading(false);
    })();
  }, [loadEquipment]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEquipment(query, category);
    setRefreshing(false);
  };

  const handleCategoryPress = (cat: EquipmentCategory | undefined) => {
    setCategory(cat);
    loadEquipment(query, cat);
  };

  const handleClearQuery = () => {
    setQuery('');
    loadEquipment('', category);
  };

  if (loading) {
    return <LoadingOverlay message="Loading equipment..." />;
  }

  const region = equipment[0]?.region ?? 'Ashanti Region';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Find Equipment</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => loadEquipment(query, category)}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{region} • {equipment.length} available</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => loadEquipment(query, category)}
            placeholder="Search tractors, harvesters..."
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearQuery}>
              <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsList}
        style={styles.chipsRow}
      >
        {CATEGORIES.map((item) => {
          const active = item.value === category;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => handleCategoryPress(item.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ErrorMessage message={error} />

      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={equipment}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Equipment Near You</Text>
            <Text style={styles.resultsCount}>{equipment.length} found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <EquipmentListCard
            item={item}
            onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
            styles={styles}
            colors={colors}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No equipment found.</Text>}
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
    backgroundColor: colors.white,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  filterButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 12,
    padding: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  chipsRow: {
    flexGrow: 0,
  },
  chipsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chipActive: {
    backgroundColor: '#1A6B2E',
    borderColor: '#1A6B2E',
    elevation: 4,
    shadowColor: '#1A6B2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  list: {
    paddingBottom: 100,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  resultsCount: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  imageWrap: {
    position: 'relative',
    backgroundColor: '#F0F7F2',
  },
  image: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F0F7F2',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.accentAmber,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  availabilityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#16A34A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  unavailableBadge: {
    backgroundColor: '#DC2626',
  },
  availabilityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  body: {
    padding: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  ownerName: {
    fontSize: 13,
    color: colors.secondaryText,
    flexShrink: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 13,
    color: colors.primaryGreen,
    textDecorationLine: 'underline',
  },
  bookNowButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  bookNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondaryText,
    marginTop: 40,
  },
  });
}

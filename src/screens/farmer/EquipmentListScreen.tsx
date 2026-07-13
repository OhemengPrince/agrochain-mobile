import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Animated,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Equipment } from '../../types';
import { searchEquipment } from '../../api/equipmentApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import StarRating from '../../components/StarRating';
import { getEquipmentImage } from '../../constants/equipmentImages';
import SearchWithSuggestions from '../../components/SearchWithSuggestions';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerEquipmentList'>;

const CATEGORIES = ['All', 'Tractor', 'Harvester', 'Irrigation', 'Sprayer', 'Tiller', 'Sheller'];

type AppliedFilters = {
  region: string;
  district: string;
  minPrice: string;
  maxPrice: string;
};

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
          <Image
            source={item.imageUrl?.startsWith('http') ? { uri: item.imageUrl } : (item.image ?? getEquipmentImage(item.category))}
            resizeMode="cover"
            style={styles.image}
          />
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
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [query, setQuery] = useState(route.params?.query ?? '');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter modal state
  const [filterVisible, setFilterVisible] = useState(false);
  const [pendingRegion, setPendingRegion] = useState('');
  const [pendingDistrict, setPendingDistrict] = useState('');
  const [pendingCategory, setPendingCategory] = useState('All');
  const [pendingMinPrice, setPendingMinPrice] = useState('');
  const [pendingMaxPrice, setPendingMaxPrice] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    region: '', district: '', minPrice: '', maxPrice: '',
  });

  const loadEquipment = useCallback(async (searchQuery: string) => {
    setError(null);
    try {
      const data = await searchEquipment({ query: searchQuery || undefined });
      setAllEquipment(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load equipment.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadEquipment(route.params?.query ?? ''); } finally { setLoading(false); }
    })();
  }, [loadEquipment]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await loadEquipment(query); } finally { setRefreshing(false); }
  };

  // Unique regions/districts from loaded data for quick-select chips in modal
  const uniqueRegions = useMemo(
    () => [...new Set(allEquipment.map((e) => e.region).filter(Boolean))].sort(),
    [allEquipment]
  );

  const uniqueDistricts = useMemo(() => {
    const base = pendingRegion
      ? allEquipment.filter((e) => e.region.toLowerCase().includes(pendingRegion.toLowerCase()))
      : allEquipment;
    return [...new Set(base.map((e) => e.district).filter(Boolean))].sort().slice(0, 10);
  }, [allEquipment, pendingRegion]);

  // Combined client-side filter (category chip + modal filters)
  const equipment = useMemo(() => {
    let list =
      activeCategory === 'All'
        ? allEquipment
        : allEquipment.filter((item) => item.category.toLowerCase() === activeCategory.toLowerCase());

    if (appliedFilters.region) {
      list = list.filter((item) =>
        item.region.toLowerCase().includes(appliedFilters.region.toLowerCase())
      );
    }
    if (appliedFilters.district) {
      list = list.filter((item) =>
        item.district.toLowerCase().includes(appliedFilters.district.toLowerCase())
      );
    }
    const min = parseFloat(appliedFilters.minPrice);
    const max = parseFloat(appliedFilters.maxPrice);
    if (!isNaN(min)) list = list.filter((item) => item.dailyRate >= min);
    if (!isNaN(max)) list = list.filter((item) => item.dailyRate <= max);

    return list;
  }, [allEquipment, activeCategory, appliedFilters]);

  const hasActiveFilters =
    appliedFilters.region !== '' ||
    appliedFilters.district !== '' ||
    appliedFilters.minPrice !== '' ||
    appliedFilters.maxPrice !== '' ||
    activeCategory !== 'All';

  const openFilterModal = () => {
    // Sync pending state with current applied state
    setPendingRegion(appliedFilters.region);
    setPendingDistrict(appliedFilters.district);
    setPendingCategory(activeCategory);
    setPendingMinPrice(appliedFilters.minPrice);
    setPendingMaxPrice(appliedFilters.maxPrice);
    setFilterVisible(true);
  };

  const handleApplyFilters = () => {
    setActiveCategory(pendingCategory);
    setAppliedFilters({
      region: pendingRegion,
      district: pendingDistrict,
      minPrice: pendingMinPrice,
      maxPrice: pendingMaxPrice,
    });
    setFilterVisible(false);
  };

  const handleResetFilters = () => {
    setPendingRegion('');
    setPendingDistrict('');
    setPendingCategory('All');
    setPendingMinPrice('');
    setPendingMaxPrice('');
    setActiveCategory('All');
    setAppliedFilters({ region: '', district: '', minPrice: '', maxPrice: '' });
    setFilterVisible(false);
  };

  if (loading) {
    return <LoadingOverlay message="Loading equipment..." />;
  }

  const region = equipment[0]?.region ?? 'Ghana';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { zIndex: 10 }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Find Equipment</Text>
          <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{region} • {equipment.length} available</Text>

        <SearchWithSuggestions
          data={allEquipment}
          keys={['name', 'category', 'region', 'district', 'ownerName']}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => loadEquipment(query)}
          onSelectSuggestion={(item) => loadEquipment(item.name)}
          placeholder="Search tractors, harvesters..."
          colors={colors}
          containerStyle={styles.searchBarWrapper}
          barHeight={52}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsList}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]} numberOfLines={1}>
                {cat}
              </Text>
            </Pressable>
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

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setFilterVisible(false)}
            activeOpacity={1}
          >
            <View
              style={[styles.modalSheet, { backgroundColor: colors.card }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Filter Equipment</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                {/* Category */}
                <Text style={[styles.filterLabel, { color: colors.secondaryText }]}>Category</Text>
                <View style={styles.filterChipsWrap}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.filterChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        pendingCategory === cat && { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
                      ]}
                      onPress={() => setPendingCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: colors.secondaryText },
                          pendingCategory === cat && { color: colors.white },
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Region */}
                <Text style={[styles.filterLabel, { color: colors.secondaryText, marginTop: 16 }]}>Region</Text>
                <TextInput
                  style={[styles.filterInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  value={pendingRegion}
                  onChangeText={setPendingRegion}
                  placeholder="e.g. Ashanti"
                  placeholderTextColor={colors.secondaryText}
                />
                {uniqueRegions.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {uniqueRegions.map((r) => (
                      <Pressable
                        key={r}
                        style={[
                          styles.smallChip,
                          { borderColor: colors.border, backgroundColor: colors.background },
                          pendingRegion === r && { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
                        ]}
                        onPress={() => setPendingRegion(pendingRegion === r ? '' : r)}
                      >
                        <Text
                          style={[
                            styles.smallChipText,
                            { color: colors.secondaryText },
                            pendingRegion === r && { color: colors.white },
                          ]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {/* District */}
                <Text style={[styles.filterLabel, { color: colors.secondaryText, marginTop: 16 }]}>District</Text>
                <TextInput
                  style={[styles.filterInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  value={pendingDistrict}
                  onChangeText={setPendingDistrict}
                  placeholder="e.g. Kumasi Metropolitan"
                  placeholderTextColor={colors.secondaryText}
                />
                {uniqueDistricts.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {uniqueDistricts.map((d) => (
                      <Pressable
                        key={d}
                        style={[
                          styles.smallChip,
                          { borderColor: colors.border, backgroundColor: colors.background },
                          pendingDistrict === d && { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
                        ]}
                        onPress={() => setPendingDistrict(pendingDistrict === d ? '' : d)}
                      >
                        <Text
                          style={[
                            styles.smallChipText,
                            { color: colors.secondaryText },
                            pendingDistrict === d && { color: colors.white },
                          ]}
                        >
                          {d}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {/* Price Range */}
                <Text style={[styles.filterLabel, { color: colors.secondaryText, marginTop: 16 }]}>
                  Price Range (GHS/day)
                </Text>
                <View style={styles.priceRow}>
                  <TextInput
                    style={[styles.filterInput, { flex: 1, color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    value={pendingMinPrice}
                    onChangeText={setPendingMinPrice}
                    placeholder="Min"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.priceDash, { color: colors.secondaryText }]}>—</Text>
                  <TextInput
                    style={[styles.filterInput, { flex: 1, color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    value={pendingMaxPrice}
                    onChangeText={setPendingMaxPrice}
                    placeholder="Max"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              <View style={[styles.sheetButtons, { borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.resetBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={handleResetFilters}
                >
                  <Text style={[styles.resetBtnText, { color: colors.text }]}>Reset</Text>
                </Pressable>
                <Pressable
                  style={[styles.applyBtn, { backgroundColor: colors.primaryGreen }]}
                  onPress={handleApplyFilters}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </Pressable>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
      backgroundColor: colors.card,
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
    filterDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accentAmber,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
    },
    searchBarWrapper: {
      marginTop: 14,
    },
    chipsList: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 26,
      alignItems: 'flex-start',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: 18,
      height: 40,
      borderRadius: 25,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginRight: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    chipActive: {
      backgroundColor: '#1A6B2E',
      borderColor: '#1A6B2E',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    list: {
      paddingBottom: 120,
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
      width: '100%',
      height: 180,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#F0F7F2',
    },
    image: {
      width: '100%',
      height: 180,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
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
    // Modal styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sheetScroll: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    filterChipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    smallChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      marginRight: 8,
    },
    smallChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    filterInput: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    priceDash: {
      fontSize: 16,
      fontWeight: '600',
    },
    sheetButtons: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    resetBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },
    applyBtn: {
      flex: 2,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

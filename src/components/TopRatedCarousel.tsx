import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { UserRole } from '../types';
import { searchEquipment } from '../api/equipmentApi';
import { USE_MOCK_DATA } from '../config';

const CARD_WIDTH = 140;
const CARD_H_MARGIN = 8;
const AUTO_SLIDE_MS = 3000;

interface TopRatedSeller {
  id: string;
  name: string;
  role: UserRole;
  region: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

const MOCK_SELLERS: TopRatedSeller[] = [
  { id: 'o1', name: 'Nana Yeboah', role: 'EQUIPMENT_OWNER', region: 'Ashanti', rating: 4.8, reviewCount: 29, isVerified: true },
  { id: 'f2', name: 'Akosua Mensah', role: 'FARMER', region: 'Eastern', rating: 4.7, reviewCount: 15, isVerified: true },
  { id: 'o3', name: 'Kofi Adjei', role: 'EQUIPMENT_OWNER', region: 'Western', rating: 4.5, reviewCount: 12, isVerified: true },
  { id: 'f1', name: 'Kwame Asante', role: 'FARMER', region: 'Ashanti', rating: 4.4, reviewCount: 22, isVerified: true },
  { id: 'by1', name: 'Kofi Agyemang', role: 'BUYER', region: 'Greater Accra', rating: 4.3, reviewCount: 8, isVerified: true },
  { id: 'f3', name: 'Yaw Boateng', role: 'FARMER', region: 'Brong-Ahafo', rating: 4.2, reviewCount: 10, isVerified: true },
  { id: 'o2', name: 'Efua Darko', role: 'EQUIPMENT_OWNER', region: 'Greater Accra', rating: 4.1, reviewCount: 6, isVerified: true },
  { id: 'f4', name: 'Abena Owusu', role: 'FARMER', region: 'Central', rating: 4.0, reviewCount: 5, isVerified: true },
  { id: 'g1', name: 'Ama Boateng', role: 'GENERAL', region: 'Greater Accra', rating: 3.9, reviewCount: 3, isVerified: true },
  { id: 'f5', name: 'Kojo Appiah', role: 'FARMER', region: 'Northern', rating: 3.8, reviewCount: 7, isVerified: true },
];

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  FARMER:         { bg: '#E8F5E9', text: '#1A6B2E', label: '🌾 Farmer' },
  EQUIPMENT_OWNER:{ bg: '#E3F2FD', text: '#1565C0', label: '🚜 Owner' },
  BUYER:          { bg: '#FFF3E0', text: '#FF8F00', label: '🛒 Buyer' },
  GENERAL:        { bg: '#F3E5F5', text: '#7B1FA2', label: '👤 General' },
  ADMIN:          { bg: '#F3E5F5', text: '#7B1FA2', label: '⚙️ Admin' },
};

async function loadTopSellers(): Promise<TopRatedSeller[]> {
  if (USE_MOCK_DATA) return MOCK_SELLERS;
  try {
    const equipment = await searchEquipment({});
    const map = new Map<string, { name: string; ratings: number[]; reviews: number[]; region: string }>();
    for (const eq of equipment) {
      if (!eq.averageRating) continue;
      const entry = map.get(eq.ownerId);
      if (entry) {
        entry.ratings.push(eq.averageRating);
        entry.reviews.push(eq.totalReviews ?? 0);
      } else {
        map.set(eq.ownerId, { name: eq.ownerName, ratings: [eq.averageRating], reviews: [eq.totalReviews ?? 0], region: eq.region });
      }
    }
    if (map.size === 0) return MOCK_SELLERS;
    const sellers: TopRatedSeller[] = Array.from(map.entries()).map(([id, d]) => ({
      id,
      name: d.name,
      role: 'EQUIPMENT_OWNER' as UserRole,
      region: d.region,
      rating: Math.round((d.ratings.reduce((s, r) => s + r, 0) / d.ratings.length) * 10) / 10,
      reviewCount: d.reviews.reduce((s, r) => s + r, 0),
      isVerified: true,
    }));
    sellers.sort((a, b) => b.rating - a.rating);
    return sellers.slice(0, 10);
  } catch {
    return MOCK_SELLERS;
  }
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ shimmer, colors }: { shimmer: Animated.Value; colors: ThemeColors }) {
  return (
    <Animated.View style={[sk.card, { backgroundColor: colors.card, opacity: shimmer, marginHorizontal: CARD_H_MARGIN }]}>
      <View style={[sk.avatar, { backgroundColor: colors.border }]} />
      <View style={[sk.line, { backgroundColor: colors.border, width: 88 }]} />
      <View style={[sk.line, { backgroundColor: colors.border, width: 60, marginTop: 7 }]} />
      <View style={[sk.line, { backgroundColor: colors.border, width: 70, marginTop: 7 }]} />
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 12 },
  line: { height: 10, borderRadius: 5 },
});

// ── Seller card ───────────────────────────────────────────────────────────────

function SellerCard({ seller, colors, onPress }: { seller: TopRatedSeller; colors: ThemeColors; onPress: () => void }) {
  const roleConf = ROLE_CONFIG[seller.role] ?? ROLE_CONFIG.GENERAL;

  return (
    <TouchableOpacity
      style={[c.card, { backgroundColor: colors.card, marginHorizontal: CARD_H_MARGIN }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Avatar + verified badge */}
      <View style={c.avatarWrap}>
        <View style={c.avatar}>
          <Text style={c.initials}>{getInitials(seller.name)}</Text>
        </View>
        {seller.isVerified && (
          <View style={c.badge}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={[c.name, { color: colors.text }]} numberOfLines={2}>
        {seller.name}
      </Text>

      {/* Role pill */}
      <View style={[c.rolePill, { backgroundColor: roleConf.bg }]}>
        <Text style={[c.roleText, { color: roleConf.text }]}>{roleConf.label}</Text>
      </View>

      {/* Rating */}
      <View style={c.ratingRow}>
        <Ionicons name="star" size={11} color={colors.accentAmber} />
        <Text style={[c.ratingNum, { color: colors.text }]}>{seller.rating.toFixed(1)}</Text>
        <Text style={[c.reviewCount, { color: colors.secondaryText }]}>({seller.reviewCount})</Text>
      </View>

      {/* Region */}
      <View style={c.regionRow}>
        <Ionicons name="location-outline" size={10} color={colors.secondaryText} />
        <Text style={[c.regionText, { color: colors.secondaryText }]} numberOfLines={1}>
          {seller.region}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A6B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 20, fontWeight: '700', color: '#fff' },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#1A6B2E',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18, marginBottom: 5 },
  rolePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  roleText: { fontSize: 10, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  ratingNum: { fontSize: 11, fontWeight: '700' },
  reviewCount: { fontSize: 10 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  regionText: { fontSize: 10, flexShrink: 1 },
});

// ── Main carousel ─────────────────────────────────────────────────────────────

interface Props {
  navigation: any;
}

export default function TopRatedCarousel({ navigation }: Props) {
  const { colors } = useTheme();
  const [sellers, setSellers] = useState<TopRatedSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<TopRatedSeller>>(null);
  const currentIndexRef = useRef(0);
  const isScrollingRef = useRef(false);
  const shimmer = useRef(new Animated.Value(0.4)).current;

  // Shimmer pulse while loading
  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.9, duration: 650, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, shimmer]);

  // Fetch data
  useEffect(() => {
    loadTopSellers().then((data) => {
      setSellers(data);
      setLoading(false);
    });
  }, []);

  // Auto-slide every 3 s, pause while user is touching
  useEffect(() => {
    if (sellers.length < 2) return;
    const id = setInterval(() => {
      if (isScrollingRef.current) return;
      const next = (currentIndexRef.current + 1) % sellers.length;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [sellers.length]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) {
        currentIndexRef.current = idx;
        setCurrentIndex(idx);
      }
    },
    []
  );

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged: handleViewableItemsChanged,
    },
  ]);

  if (!loading && sellers.length === 0) return null;

  return (
    <View style={t.wrapper}>
      {/* Section header */}
      <View style={t.header}>
        <View style={t.headerLeft}>
          <Ionicons name="star" size={16} color={colors.accentAmber} />
          <View>
            <Text style={[t.title, { color: colors.text }]}>Top Rated</Text>
            <Text style={[t.subtitle, { color: colors.secondaryText }]}>
              Verified sellers with highest ratings
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={[t.seeAll, { color: colors.primaryGreen }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Skeleton or real cards */}
      {loading ? (
        <View style={t.skRow}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} shimmer={shimmer} colors={colors} />
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={sellers}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={t.listContent}
          snapToInterval={CARD_WIDTH + CARD_H_MARGIN * 2}
          snapToAlignment="start"
          decelerationRate="fast"
          onScrollBeginDrag={() => { isScrollingRef.current = true; }}
          onMomentumScrollEnd={() => { isScrollingRef.current = false; }}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <SellerCard
              seller={item}
              colors={colors}
              onPress={() =>
                navigation.navigate('Chat', { name: item.name, role: item.role, otherUserId: item.id })
              }
            />
          )}
        />
      )}

      {/* Pagination dots */}
      {!loading && sellers.length > 1 && (
        <View style={t.dots}>
          {sellers.map((_, i) => (
            <View
              key={i}
              style={[
                t.dot,
                {
                  backgroundColor: i === currentIndex ? colors.primaryGreen : colors.border,
                  width: i === currentIndex ? 14 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const t = StyleSheet.create({
  wrapper: { paddingTop: 16, paddingBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 2 },
  seeAll: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  skRow: { flexDirection: 'row', paddingHorizontal: 8 },
  listContent: { paddingHorizontal: 8, paddingBottom: 4 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    marginBottom: 2,
  },
  dot: { height: 6, borderRadius: 3 },
});

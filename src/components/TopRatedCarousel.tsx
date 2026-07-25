import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Image,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { getTopRatedUsers, getRecentUsers, enrichUsersWithPhotos, TopRatedUser } from '../api/userApi';
import { getFollowStatus } from '../api/followApi';
import FollowButton from './FollowButton';

const CARD_WIDTH = 140;
const CARD_H_MARGIN = 8;
const AUTO_SLIDE_MS = 3000;

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  FARMER:          { bg: '#E8F5E9', text: '#1A6B2E', label: '🌾 Farmer' },
  EQUIPMENT_OWNER: { bg: '#E3F2FD', text: '#1565C0', label: '🚜 Owner' },
  BUYER:           { bg: '#FFF3E0', text: '#FF8F00', label: '🛒 Buyer' },
  GENERAL:         { bg: '#F3E5F5', text: '#7B1FA2', label: '👤 General' },
  ADMIN:           { bg: '#F3E5F5', text: '#7B1FA2', label: '⚙️ Admin' },
};

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function isValidPhotoUrl(url?: string): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard({ shimmer, colors }: { shimmer: Animated.Value; colors: ThemeColors }) {
  return (
    <Animated.View style={[sk.card, { backgroundColor: colors.card, opacity: shimmer, marginHorizontal: CARD_H_MARGIN }]}>
      <View style={[sk.avatar, { backgroundColor: colors.border }]} />
      <View style={[sk.line, { backgroundColor: colors.border, width: 88 }]} />
      <View style={[sk.line, { backgroundColor: colors.border, width: 60, marginTop: 7 }]} />
      <View style={[sk.line, { backgroundColor: colors.border, width: 72, marginTop: 7 }]} />
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
  line:   { height: 10, borderRadius: 5 },
});

// ── Seller card ────────────────────────────────────────────────────────────────

function SellerCard({
  user,
  colors,
  onPress,
  isFollowing,
}: {
  user: TopRatedUser;
  colors: ThemeColors;
  onPress: () => void;
  isFollowing: boolean;
}) {
  const roleConf = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.GENERAL;
  const hasPhoto = isValidPhotoUrl(user.profilePhotoUrl);
  const imgOpacity = useRef(new Animated.Value(0)).current;

  const handleImageLoad = useCallback(() => {
    Animated.timing(imgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [imgOpacity]);

  return (
    <TouchableOpacity
      style={[c.card, { backgroundColor: colors.card, marginHorizontal: CARD_H_MARGIN }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View style={c.avatarWrap}>
        {hasPhoto ? (
          <View style={[c.avatarImgWrap, user.isVerified ? c.avatarBorderVerified : c.avatarBorderDefault]}>
            <View style={c.avatarPlaceholder} />
            <Animated.Image
              source={{ uri: user.profilePhotoUrl! }}
              style={[c.avatarImgInner, { opacity: imgOpacity }]}
              resizeMode="cover"
              onLoad={handleImageLoad}
            />
          </View>
        ) : (
          <View style={[c.avatarCircle, user.isVerified ? c.avatarBorderVerified : c.avatarBorderDefault]}>
            <Text style={c.initials}>{user.fullName?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {user.isVerified && (
          <View style={c.verifiedBadge}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={[c.name, { color: colors.text }]} numberOfLines={2}>
        {user.fullName}
      </Text>

      {/* Role pill */}
      <View style={[c.rolePill, { backgroundColor: roleConf.bg }]}>
        <Text style={[c.roleText, { color: roleConf.text }]}>{roleConf.label}</Text>
      </View>

      {/* Rating */}
      {user.totalReviews > 0 ? (
        <View style={c.ratingRow}>
          <Ionicons name="star" size={11} color={colors.accentAmber} />
          <Text style={[c.ratingNum, { color: colors.text }]}>{user.averageRating.toFixed(1)}</Text>
          <Text style={[c.reviewCount, { color: colors.secondaryText }]}>({user.totalReviews})</Text>
        </View>
      ) : (
        <View style={[c.rolePill, { backgroundColor: '#E8F5E9', marginBottom: 6 }]}>
          <Text style={[c.roleText, { color: '#1A6B2E' }]}>New Member</Text>
        </View>
      )}

      {/* Region */}
      {!!user.region && (
        <View style={c.regionRow}>
          <Ionicons name="location-outline" size={10} color={colors.secondaryText} />
          <Text style={[c.regionText, { color: colors.secondaryText }]} numberOfLines={1}>
            {user.region}
          </Text>
        </View>
      )}

      <View style={{ marginTop: 8 }}>
        <FollowButton userId={user.id} initialIsFollowing={isFollowing} />
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
  avatarWrap:           { position: 'relative', marginBottom: 8 },
  avatarImgWrap:        { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  avatarPlaceholder:    { position: 'absolute', width: 56, height: 56, backgroundColor: '#D1D5DB' },
  avatarImgInner:       { width: 56, height: 56 },
  avatarCircle:         { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A6B2E', alignItems: 'center', justifyContent: 'center' },
  avatarBorderVerified: { borderWidth: 2, borderColor: '#1A6B2E' },
  avatarBorderDefault:  { borderWidth: 1, borderColor: '#E5E7EB' },
  initials:      { fontSize: 20, fontWeight: '700', color: '#fff' },
  verifiedBadge: {
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
  name:        { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18, marginBottom: 5 },
  rolePill:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  roleText:    { fontSize: 10, fontWeight: '600' },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  ratingNum:   { fontSize: 11, fontWeight: '700' },
  reviewCount: { fontSize: 10 },
  regionRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  regionText:  { fontSize: 10, flexShrink: 1 },
});

// ── Navigation helper ──────────────────────────────────────────────────────────

function navigateForRole(navigation: any, user: TopRatedUser) {
  navigation.navigate('PublicProfile', { userId: user.id });
}

// ── Main carousel ──────────────────────────────────────────────────────────────

interface Props {
  navigation: any;
}

export default function TopRatedCarousel({ navigation }: Props) {
  const { colors } = useTheme();
  const [users, setUsers] = useState<TopRatedUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<TopRatedUser>>(null);
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

  // Fetch from backend (or mock); fall back to recent verified users if no rated users yet
  useEffect(() => {
    (async () => {
      try {
        let data = await getTopRatedUsers(10);
        if (data.length === 0) {
          data = await getRecentUsers(10);
        }
        data = await enrichUsersWithPhotos(data);
        console.log(`[TopRated] showing ${data.length} users`);

        // Batch-fetched and awaited before setUsers/setLoading, since
        // FollowButton only reads initialIsFollowing once on mount — if the
        // cards rendered first and this filled in afterward, every button
        // would already be stuck showing "Follow" regardless of real status.
        const statuses = await Promise.all(
          data.map((u) => getFollowStatus(u.id).then((res) => res.data.following ?? false).catch(() => false))
        );
        const map: Record<string, boolean> = {};
        data.forEach((u, i) => { map[u.id] = statuses[i]; });
        setFollowingMap(map);

        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-slide every 3 s, skip while user is touching
  useEffect(() => {
    if (users.length < 2) return;
    const id = setInterval(() => {
      if (isScrollingRef.current) return;
      const next = (currentIndexRef.current + 1) % users.length;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [users.length]);

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

  // Hide section entirely if no data after loading
  if (!loading && users.length === 0) return null;

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
          data={users}
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
              user={item}
              colors={colors}
              onPress={() => navigateForRole(navigation, item)}
              isFollowing={followingMap[item.id] ?? false}
            />
          )}
        />
      )}

      {/* Pagination dots */}
      {!loading && users.length > 1 && (
        <View style={t.dots}>
          {users.map((_, i) => (
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
  wrapper:     { paddingTop: 16, paddingBottom: 4 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  headerLeft:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title:       { fontSize: 15, fontWeight: '700' },
  subtitle:    { fontSize: 11, marginTop: 2 },
  seeAll:      { fontSize: 12, fontWeight: '600', marginTop: 3 },
  skRow:       { flexDirection: 'row', paddingHorizontal: 8 },
  listContent: { paddingHorizontal: 8, paddingBottom: 4 },
  dots:        { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 10, marginBottom: 2 },
  dot:         { height: 6, borderRadius: 3 },
});

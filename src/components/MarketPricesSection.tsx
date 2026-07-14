import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { getMarketPrices, MarketPrice } from '../api/marketApi';

const CROP_IMAGES: Record<string, any> = {
  Maize:     require('../assets/crops/maize.jpg'),
  Cocoa:     require('../assets/crops/cocoa.jpg'),
  Tomato:    require('../assets/crops/tomato.jpg'),
  Cassava:   require('../assets/crops/cassava.jpg'),
  Rice:      require('../assets/crops/rice.jpg'),
  Groundnut: require('../assets/crops/groundnut.jpg'),
};

const CROP_EMOJI: Record<string, string> = {
  Maize: '🌽', Cocoa: '🍫', Tomato: '🍅', Cassava: '🍠', Rice: '🌾', Groundnut: '🥜',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function barPercent(change: number): string {
  const abs = Math.abs(change);
  const pct = Math.min(Math.max(40 + abs * 2, 40), 100);
  return `${Math.round(pct)}%`;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ shimmer, colors }: { shimmer: Animated.Value; colors: ThemeColors }) {
  return (
    <Animated.View style={[sk.card, { backgroundColor: colors.card, opacity: shimmer }]}>
      <View style={[sk.img, { backgroundColor: colors.border }]} />
      <View style={{ padding: 10, gap: 6 }}>
        <View style={[sk.line, { backgroundColor: colors.border, width: 70 }]} />
        <View style={[sk.line, { backgroundColor: colors.border, width: 50 }]} />
        <View style={[sk.line, { backgroundColor: colors.border, width: 100, height: 3 }]} />
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card: { width: 150, borderRadius: 20, overflow: 'hidden', marginRight: 12 },
  img:  { width: 150, height: 90 },
  line: { height: 10, borderRadius: 5 },
});

// ── Price card ────────────────────────────────────────────────────────────────

function PriceCard({ item, colors }: { item: MarketPrice; colors: ThemeColors }) {
  const cropImg = CROP_IMAGES[item.crop] ?? null;
  const emoji = CROP_EMOJI[item.crop] ?? '🌿';
  const isUp = item.trend === 'UP';
  const bw = barPercent(item.change);

  return (
    <View style={[p.card, { backgroundColor: colors.card }]}>
      {/* Image */}
      <View style={p.imgWrap}>
        {cropImg ? (
          <Image source={cropImg} style={p.img} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={isUp ? ['#1A6B2E', '#2E8B4A'] : ['#374151', '#1F2937']}
            style={p.img}
          />
        )}
        {/* Full-image dark scrim for readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.62)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Emoji + crop label at bottom of image */}
        <View style={p.imgLabel} pointerEvents="none">
          <Text style={p.imgEmoji}>{emoji}</Text>
          <Text style={p.imgCropName}>{item.crop}</Text>
        </View>
        {/* Trend badge top-right */}
        <View style={[p.badge, { backgroundColor: isUp ? '#16A34A' : '#DC2626' }]}>
          <Text style={p.badgeText}>{isUp ? '↑' : '↓'} {Math.abs(item.change).toFixed(1)}%</Text>
        </View>
      </View>

      {/* Info */}
      <View style={p.info}>
        <Text style={[p.price, { color: colors.primaryGreen }]}>
          {item.currency} {item.price.toLocaleString()}
        </Text>
        <Text style={[p.unit, { color: colors.secondaryText }]}>{item.unit}</Text>
        {/* Progress bar */}
        <View style={p.barBg}>
          <LinearGradient
            colors={isUp ? ['#16A34A', '#4ADE80'] : ['#DC2626', '#F87171']}
            style={[p.barFill, { width: bw as any }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  card: {
    width: 148,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  imgWrap:    { position: 'relative' },
  img:        { width: 148, height: 106 },
  imgLabel:   { position: 'absolute', bottom: 8, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  imgEmoji:   { fontSize: 18 },
  imgCropName: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  badge:      { position: 'absolute', top: 8, right: 8, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  info:       { padding: 10, paddingTop: 8 },
  price:      { fontSize: 17, fontWeight: '800', marginBottom: 1 },
  unit:       { fontSize: 10, marginBottom: 8 },
  barBg:      { height: 3, borderRadius: 2, backgroundColor: '#F0F0F0', overflow: 'hidden' },
  barFill:    { height: 3, borderRadius: 2 },
});

// ── Alert banner ──────────────────────────────────────────────────────────────

function AlertBanner({ prices }: { prices: MarketPrice[] }) {
  const alertItem = prices.find((item) => Math.abs(item.change) > 8);
  if (!alertItem) return null;
  const isUp = alertItem.trend === 'UP';

  return (
    <LinearGradient
      colors={isUp ? ['#16A34A', '#1A6B2E'] : ['#DC2626', '#991B1B']}
      style={ab.banner}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={ab.iconCircle}>
        <Ionicons name="notifications" size={16} color="#fff" />
      </View>
      <View style={ab.body}>
        <Text style={ab.title}>Price Alert</Text>
        <Text style={ab.msg} numberOfLines={1}>
          {alertItem.crop} {isUp ? 'up' : 'down'} {Math.abs(alertItem.change).toFixed(1)}%
          {isUp ? ' — good time to sell!' : ' — prices falling'}
        </Text>
      </View>
      <TouchableOpacity style={ab.viewBtn} activeOpacity={0.75}>
        <Text style={ab.viewText}>View →</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const ab = StyleSheet.create({
  banner:    { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginHorizontal: 16, marginTop: 12, gap: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  body:      { flex: 1 },
  title:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  msg:       { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 1 },
  viewBtn:   { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  viewText:  { color: '#fff', fontSize: 11, fontWeight: '600' },
});

// ── Main section ──────────────────────────────────────────────────────────────

interface Props {
  refreshKey?: number;
}

export default function MarketPricesSection({ refreshKey = 0 }: Props) {
  const { colors } = useTheme();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const shimmer = useRef(new Animated.Value(0.4)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;

  // Shimmer while loading
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

  // Pulsing live dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dotOpacity]);

  const fetchPrices = useCallback(async () => {
    try {
      const data = await getMarketPrices();
      if (data.length > 0) {
        setPrices(data);
        setStale(false);
      }
    } catch {
      setStale(true);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPrices().finally(() => setLoading(false));
  }, [fetchPrices, refreshKey]);

  const lastUpdated = prices[0]?.lastUpdated;
  const source = prices[0]?.source ?? 'Manual';
  const timeLabel = lastUpdated ? ` · Updated ${formatTime(lastUpdated)}` : '';

  return (
    <View style={s.wrapper}>
      {/* Section header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Animated.View style={[s.liveDot, { opacity: dotOpacity }]} />
          <View>
            <Text style={[s.title, { color: colors.text }]}>Live Market Prices</Text>
            <Text style={[s.subtitle, { color: colors.secondaryText }]}>
              Source: {source}{timeLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={[s.seeAll, { color: colors.primaryGreen }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Stale warning */}
      {stale && prices.length > 0 && (
        <View style={s.staleRow}>
          <Ionicons name="warning-outline" size={13} color={colors.accentAmber} />
          <Text style={[s.staleText, { color: colors.accentAmber }]}>Prices may be outdated</Text>
        </View>
      )}

      {/* Cards */}
      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          scrollEnabled={false}
        >
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} shimmer={shimmer} colors={colors} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        >
          {prices.map((item) => (
            <PriceCard key={item.crop} item={item} colors={colors} />
          ))}
        </ScrollView>
      )}

      {/* Price alert banner */}
      {!loading && prices.length > 0 && <AlertBanner prices={prices} />}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:     { paddingTop: 16, paddingBottom: 4 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  headerLeft:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  liveDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginTop: 5 },
  title:       { fontSize: 15, fontWeight: '700' },
  subtitle:    { fontSize: 11, marginTop: 2 },
  seeAll:      { fontSize: 12, fontWeight: '600', marginTop: 3 },
  staleRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, marginBottom: 8 },
  staleText:   { fontSize: 11 },
  listContent: { paddingHorizontal: 16, paddingBottom: 4 },
});

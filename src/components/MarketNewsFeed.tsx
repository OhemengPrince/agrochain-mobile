import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { fetchGhanaAgricultureNews, NewsItem } from '../services/newsService';

const FALLBACK_NEWS: NewsItem[] = [
  { id: '1', headline: 'Ghana cocoa exports hit record high in Q1 2026', source: 'GhanaWeb', time: '2hrs ago', url: '' },
  { id: '2', headline: 'Government subsidizes fertiliser for smallholder farmers', source: 'Ghana News Agency', time: '5hrs ago', url: '' },
  { id: '3', headline: 'New agricultural equipment scheme launched for Northern Region', source: 'Graphic Online', time: '1 day ago', url: '' },
];

const PLACEHOLDER_ICONS = ['🌾', '🍫', '🌽', '🍅', '🥬', '🚜', '🌱', '🍠'];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Props {
  maxItems?: number;
  onSeeAll?: () => void;
  refreshKey?: number;
}

export default function MarketNewsFeed({ maxItems = 3, onSeeAll, refreshKey = 0 }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const markImageBroken = (id: string) => setBrokenImages((prev) => new Set(prev).add(id));
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    // First mount reads the shared cache; a refreshKey bump (pull-to-
    // refresh on the dashboard) forces a real network check.
    const forceRefresh = !isFirstLoad.current;
    isFirstLoad.current = false;

    fetchGhanaAgricultureNews({ forceRefresh })
      .then((items) => {
        if (!cancelled) {
          const base = items.length > 0 ? items : FALLBACK_NEWS;
          setNews(shuffleArray(base));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNews(shuffleArray(FALLBACK_NEWS));
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const openArticle = (url: string) => { if (url) Linking.openURL(url); };
  const displayedNews = news.slice(0, maxItems);

  return (
    <View>
      {/* ── Agriculture News ── */}
      <View style={[styles.section, styles.newsSection]}>
        <View style={styles.newsTitleRow}>
          <Text style={styles.sectionTitle}>Agriculture News</Text>
          {error ? (
            <Text style={styles.offlineTag}>Offline</Text>
          ) : !loading ? (
            <Text style={styles.liveTag}>Live</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Fetching latest agric news…</Text>
          </View>
        ) : (
          <>
            {displayedNews.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.newsCard}
                onPress={() => openArticle(item.url)}
                activeOpacity={item.url ? 0.75 : 1}
              >
                {item.imageUrl && !brokenImages.has(item.id) ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.newsImage}
                    resizeMode="cover"
                    onError={() => markImageBroken(item.id)}
                  />
                ) : (
                  <LinearGradient
                    colors={['#14532d', '#16a34a', '#4ade80']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.newsImagePlaceholder}
                  >
                    <Text style={styles.placeholderEmoji}>
                      {PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length]}
                    </Text>
                    <Text style={styles.placeholderLabel}>Agriculture News</Text>
                  </LinearGradient>
                )}
                <View style={styles.newsBody}>
                  <Text style={styles.newsHeadline} numberOfLines={3}>{item.headline}</Text>
                  {item.summary ? (
                    <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
                  ) : null}
                  <View style={styles.newsMetaRow}>
                    <Ionicons name="newspaper-outline" size={12} color={colors.primaryGreen} />
                    <Text style={styles.newsSource}>{item.source}</Text>
                    <Text style={styles.newsDot}>•</Text>
                    <Text style={styles.newsTime}>{item.time}</Text>
                    {item.url ? (
                      <Ionicons name="open-outline" size={12} color={colors.secondaryText} style={styles.linkIcon} />
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* See All button */}
            {onSeeAll && news.length > maxItems && (
              <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.8}>
                <Ionicons name="newspaper-outline" size={16} color={colors.primaryGreen} />
                <Text style={styles.seeAllText}>See All Ghana Agric News</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primaryGreen} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: { paddingHorizontal: 16, marginTop: 20 },
    newsSection: { marginBottom: 4 },
    newsTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    offlineTag: {
      fontSize: 11, fontWeight: '700', color: '#DC2626',
      backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    liveTag: {
      fontSize: 11, fontWeight: '700', color: '#16A34A',
      backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 28, justifyContent: 'center' },
    loadingText: { fontSize: 13, color: colors.secondaryText },
    newsCard: {
      backgroundColor: colors.card, borderRadius: 16, marginBottom: 14, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 8, elevation: 3,
    },
    newsImage: { width: '100%', height: 180 },
    newsImagePlaceholder: { width: '100%', height: 130, alignItems: 'center', justifyContent: 'center', gap: 6 },
    placeholderEmoji: { fontSize: 36 },
    placeholderLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
    newsBody: { padding: 14 },
    newsHeadline: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
    newsSummary: { fontSize: 12, color: colors.secondaryText, lineHeight: 17, marginTop: 6 },
    newsMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
    newsSource: { fontSize: 12, fontWeight: '600', color: colors.primaryGreen },
    newsDot: { fontSize: 12, color: colors.secondaryText },
    newsTime: { fontSize: 12, color: colors.secondaryText },
    linkIcon: { marginLeft: 2 },
    seeAllButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 14, marginTop: 2, marginBottom: 6,
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.primaryGreen,
    },
    seeAllText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
  });
}

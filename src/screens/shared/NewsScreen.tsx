import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Pressable,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { fetchGhanaAgricultureNews, searchNews as searchNewsApi, NewsItem, NewsTopicChip } from '../../services/newsService';

const POPULAR_SEARCHES = ['Cocoa Ghana', 'Maize prices', 'Rice harvest', 'Farm equipment', 'Fertiliser'];

const PLACEHOLDER_ICONS: Record<NewsTopicChip, string> = {
  All: '🌍',
  Cocoa: '🍫',
  Maize: '🌽',
  Rice: '🌾',
  Livestock: '🐄',
  Fertilizer: '🧪',
  Equipment: '🚜',
  'Market Prices': '📈',
};

const CHIP_ICONS: Record<NewsTopicChip, string> = PLACEHOLDER_ICONS;

const TOPIC_CHIPS: NewsTopicChip[] = [
  'All', 'Cocoa', 'Maize', 'Rice', 'Livestock', 'Fertilizer', 'Equipment', 'Market Prices',
];

const Logo = require('../../../assets/images/agrochain_logo.png');

export default function NewsScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTopic, setActiveTopic] = useState<NewsTopicChip>('All');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const markImageBroken = (id: string) => setBrokenImages((prev) => new Set(prev).add(id));

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NewsItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchReqId = useRef(0);

  const isSearchActive = searchQuery.trim().length >= 2;

  const searchNews = useCallback(async (query: string) => {
    const reqId = ++searchReqId.current;
    setSearching(true);
    try {
      const results = await searchNewsApi(query);
      if (reqId === searchReqId.current) setSearchResults(results);
    } catch {
      if (reqId === searchReqId.current) setSearchResults([]);
    } finally {
      if (reqId === searchReqId.current) setSearching(false);
    }
  }, []);

  // Debounce — wait 500ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchNews(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchNews]);

  const load = useCallback(async (forceRefresh = false) => {
    setError(false);
    try {
      const items = await fetchGhanaAgricultureNews({ forceRefresh });
      setAllNews(items);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await load(true); } finally { setRefreshing(false); }
  };

  // ── Filter logic: activeTopic === 'All' shows everything ──
  const displayedNews = useMemo(() => {
    if (activeTopic === 'All') return allNews;
    return allNews.filter((item) => item.topic === activeTopic);
  }, [allNews, activeTopic]);

  // Count per topic for the chip badge
  const topicCounts = useMemo(() => {
    const counts: Partial<Record<NewsTopicChip, number>> = {};
    for (const item of allNews) {
      counts[item.topic] = (counts[item.topic] ?? 0) + 1;
    }
    counts['All'] = allNews.length;
    return counts;
  }, [allNews]);

  const openArticle = (url: string, title: string) => {
    if (url) navigation.navigate('NewsArticle', { url, title });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Ghana Agric News</Text>
            <Text style={styles.headerSub}>Live feed • NewsData.io</Text>
          </View>
          {!loading && !error && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{allNews.length} articles</Text>
            </View>
          )}
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.secondaryText} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search agriculture news..."
            placeholderTextColor={colors.secondaryText}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => searchNews(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
            </Pressable>
          )}
          {searching && <ActivityIndicator size="small" color={colors.primaryGreen} style={{ marginLeft: 8 }} />}
        </View>

        {/* Popular search suggestions — shown when focused with an empty query */}
        {searchQuery.length === 0 && searchFocused && (
          <View style={styles.suggestionsWrap}>
            <Text style={styles.suggestionsLabel}>Popular searches:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {POPULAR_SEARCHES.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => setSearchQuery(suggestion)}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionChipText}>🔍 {suggestion}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Topic filter chips — hidden while searching */}
        {searchQuery.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {TOPIC_CHIPS.map((chip) => {
              const active = activeTopic === chip;
              const count = topicCounts[chip] ?? 0;
              return (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setActiveTopic(chip)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipIcon}>{CHIP_ICONS[chip]}</Text>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
                  {count > 0 && (
                    <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                      <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {isSearchActive && (
        <Text style={styles.searchResultsHeader}>
          {searching ? 'Searching...' : `${searchResults.length} results for "${searchQuery}"`}
        </Text>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feed}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryGreen}
          />
        }
      >
        {isSearchActive ? (
          searching ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primaryGreen} />
              <Text style={styles.loadingText}>Searching agriculture news…</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="newspaper-outline" size={48} color={colors.secondaryText} />
              <Text style={styles.emptySearchTitle}>No results found</Text>
              <Text style={styles.emptySearchSubtitle}>
                Try different keywords like 'cocoa', 'maize' or 'farming Ghana'
              </Text>
            </View>
          ) : (
            searchResults.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => openArticle(item.url, item.headline)}
                activeOpacity={item.url ? 0.75 : 1}
              >
                {item.imageUrl && !brokenImages.has(item.id) ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                    onError={() => markImageBroken(item.id)}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.lightGreen, colors.primaryGreenLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardLogoPlaceholder}
                  >
                    <View style={styles.glassBadge}>
                      <BlurView intensity={45} tint="light" style={styles.glassBadgeBlur} />
                      <Image source={Logo} style={styles.cardLogoImage} resizeMode="contain" />
                    </View>
                  </LinearGradient>
                )}

                <View style={styles.cardBody}>
                  <View style={styles.topicPill}>
                    <Text style={styles.topicPillIcon}>{PLACEHOLDER_ICONS[item.topic]}</Text>
                    <Text style={styles.topicPillText}>{item.topic}</Text>
                  </View>

                  <Text style={styles.cardHeadline} numberOfLines={3}>{item.headline}</Text>
                  {item.summary ? (
                    <Text style={styles.cardSummary} numberOfLines={3}>{item.summary}</Text>
                  ) : null}
                  <View style={styles.cardMeta}>
                    <Ionicons name="newspaper-outline" size={12} color={colors.primaryGreen} />
                    <Text style={styles.cardSource}>{item.source}</Text>
                    <Text style={styles.cardDot}>•</Text>
                    <Text style={styles.cardTime}>{item.time}</Text>
                    {item.url ? (
                      <Ionicons
                        name="chevron-forward-outline"
                        size={12}
                        color={colors.secondaryText}
                        style={{ marginLeft: 4 }}
                      />
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Fetching Ghana agriculture news…</Text>
            <Text style={styles.loadingSubText}>Cocoa • Maize • Rice • Livestock • Equipment</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.errorText}>Could not load news. Pull down to retry.</Text>
          </View>
        ) : displayedNews.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.placeholderEmoji}>{PLACEHOLDER_ICONS[activeTopic]}</Text>
            <Text style={styles.errorText}>
              No {activeTopic === 'All' ? '' : activeTopic + ' '}articles found right now.
            </Text>
            <TouchableOpacity onPress={() => setActiveTopic('All')} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Show all topics</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedNews.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => openArticle(item.url, item.headline)}
              activeOpacity={item.url ? 0.75 : 1}
            >
              {item.imageUrl && !brokenImages.has(item.id) ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() => markImageBroken(item.id)}
                />
              ) : (
                <LinearGradient
                  colors={[colors.lightGreen, colors.primaryGreenLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardLogoPlaceholder}
                >
                  <View style={styles.glassBadge}>
                    <BlurView intensity={45} tint="light" style={styles.glassBadgeBlur} />
                    <Image source={Logo} style={styles.cardLogoImage} resizeMode="contain" />
                  </View>
                </LinearGradient>
              )}

              <View style={styles.cardBody}>
                {/* Topic pill */}
                <View style={styles.topicPill}>
                  <Text style={styles.topicPillIcon}>{PLACEHOLDER_ICONS[item.topic]}</Text>
                  <Text style={styles.topicPillText}>{item.topic}</Text>
                </View>

                <Text style={styles.cardHeadline} numberOfLines={3}>{item.headline}</Text>
                {item.summary ? (
                  <Text style={styles.cardSummary} numberOfLines={3}>{item.summary}</Text>
                ) : null}
                <View style={styles.cardMeta}>
                  <Ionicons name="newspaper-outline" size={12} color={colors.primaryGreen} />
                  <Text style={styles.cardSource}>{item.source}</Text>
                  <Text style={styles.cardDot}>•</Text>
                  <Text style={styles.cardTime}>{item.time}</Text>
                  {item.url ? (
                    <Ionicons
                      name="chevron-forward-outline"
                      size={12}
                      color={colors.secondaryText}
                      style={{ marginLeft: 4 }}
                    />
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 52,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 5,
      marginTop: 4,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
    liveText: { fontSize: 12, fontWeight: '700', color: colors.white },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginTop: 14,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      elevation: 2,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },
    suggestionsWrap: { marginTop: 12 },
    suggestionsLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 8 },
    suggestionChip: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    suggestionChipText: { color: colors.white, fontSize: 12, fontWeight: '600' },
    searchResultsHeader: {
      color: colors.secondaryText,
      fontSize: 12,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: -4,
    },
    emptySearchTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.secondaryText,
      marginTop: 12,
    },
    emptySearchSubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      opacity: 0.7,
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 20,
    },
    chipsRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingRight: 4 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    chipActive: { backgroundColor: colors.card },
    chipIcon: { fontSize: 13 },
    chipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
    chipTextActive: { color: colors.primaryGreen },
    chipBadge: {
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: 'center',
    },
    chipBadgeActive: { backgroundColor: `${colors.primaryGreen}20` },
    chipBadgeText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    chipBadgeTextActive: { color: colors.primaryGreen },
    feed: { padding: 16, gap: 14, paddingBottom: 120 },
    centerBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '600', color: colors.secondaryText },
    loadingSubText: { fontSize: 12, color: colors.secondaryText, opacity: 0.7 },
    errorText: { fontSize: 14, color: colors.secondaryText, textAlign: 'center' },
    placeholderEmoji: { fontSize: 48 },
    resetBtn: {
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.primaryGreen,
      borderRadius: 20,
    },
    resetBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.09,
      shadowRadius: 8,
      elevation: 3,
    },
    cardImage: { width: '100%', height: 200 },
    cardLogoPlaceholder: {
      width: '100%',
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glassBadge: {
      width: 84,
      height: 84,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glassBadgeBlur: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 42,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.6)',
      backgroundColor: 'rgba(255,255,255,0.18)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
    cardLogoImage: {
      width: 62,
      height: 62,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
    cardBody: { padding: 16 },
    topicPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: colors.lightGreen,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 10,
    },
    topicPillIcon: { fontSize: 11 },
    topicPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    cardHeadline: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 22,
    },
    cardSummary: {
      fontSize: 13,
      color: colors.secondaryText,
      lineHeight: 18,
      marginTop: 6,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 12,
    },
    cardSource: { fontSize: 12, fontWeight: '600', color: colors.primaryGreen },
    cardDot: { fontSize: 12, color: colors.secondaryText },
    cardTime: { fontSize: 12, color: colors.secondaryText },
  });
}

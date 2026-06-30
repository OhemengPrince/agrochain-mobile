import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { fetchGhanaAgricultureNews, NewsItem } from '../../services/newsService';

const PLACEHOLDER_ICONS = ['🌾', '🌽', '🍠', '🍅', '🐄', '🚜', '🌱', '🥬', '🥜', '🍚'];

const TOPIC_CHIPS = ['All', 'Crops', 'Livestock', 'Markets', 'Policy', 'Climate'];

export default function NewsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTopic, setActiveTopic] = useState('All');

  const load = useCallback(async () => {
    setError(false);
    try {
      const items = await fetchGhanaAgricultureNews();
      setAllNews(items);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openArticle = (url: string) => { if (url) Linking.openURL(url); };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Ghana Agric News</Text>
            <Text style={styles.headerSub}>Live updates from The Guardian</Text>
          </View>
          {!loading && !error && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}
        </View>

        {/* Topic filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {TOPIC_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, activeTopic === chip && styles.chipActive]}
              onPress={() => setActiveTopic(chip)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, activeTopic === chip && styles.chipTextActive]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feed}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryGreen} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Fetching Ghana agriculture news…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.errorText}>Could not load news. Pull to retry.</Text>
          </View>
        ) : allNews.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>No articles found right now.</Text>
          </View>
        ) : (
          allNews.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => openArticle(item.url)}
              activeOpacity={item.url ? 0.75 : 1}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={['#14532d', '#16a34a', '#4ade80']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardImagePlaceholder}
                >
                  <Text style={styles.placeholderEmoji}>
                    {PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length]}
                  </Text>
                </LinearGradient>
              )}

              <View style={styles.cardBody}>
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
                      name="open-outline"
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
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#4ade80',
    },
    liveText: { fontSize: 12, fontWeight: '700', color: colors.white },
    chipsRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingRight: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    chipActive: { backgroundColor: colors.white },
    chipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
    chipTextActive: { color: colors.primaryGreen },
    feed: { padding: 16, gap: 14, paddingBottom: 120 },
    centerBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
    loadingText: { fontSize: 14, color: colors.secondaryText },
    errorText: { fontSize: 14, color: colors.secondaryText, textAlign: 'center' },
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
    cardImagePlaceholder: {
      width: '100%',
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderEmoji: { fontSize: 48 },
    cardBody: { padding: 16 },
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

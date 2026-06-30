import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { fetchGhanaAgricultureNews, NewsItem } from '../services/newsService';

interface MarketPrice {
  emoji: string;
  crop: string;
  price: string;
  unit: string;
  changePercent: number;
}

const MARKET_PRICES: MarketPrice[] = [
  { emoji: '🌽', crop: 'Maize', price: 'GHS 350', unit: '/bag', changePercent: 5 },
  { emoji: '🍫', crop: 'Cocoa', price: 'GHS 2,400', unit: '/ton', changePercent: -2 },
  { emoji: '🍅', crop: 'Tomato', price: 'GHS 180', unit: '/crate', changePercent: 12 },
  { emoji: '🍠', crop: 'Cassava', price: 'GHS 120', unit: '/bag', changePercent: 3 },
  { emoji: '🌾', crop: 'Rice', price: 'GHS 420', unit: '/bag', changePercent: -1 },
  { emoji: '🥜', crop: 'Groundnut', price: 'GHS 280', unit: '/bag', changePercent: 8 },
];

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: '1',
    headline: 'Ghana cocoa exports hit record high in Q1 2026',
    source: 'GhanaWeb',
    time: '2hrs ago',
    url: '',
  },
  {
    id: '2',
    headline: 'Government subsidizes fertiliser for smallholder farmers',
    source: 'Ghana News Agency',
    time: '5hrs ago',
    url: '',
  },
  {
    id: '3',
    headline: 'New agricultural equipment scheme launched for Northern Region',
    source: 'Graphic Online',
    time: '1 day ago',
    url: '',
  },
];

export default function MarketNewsFeed() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchGhanaAgricultureNews()
      .then((items) => {
        if (!cancelled) {
          setNews(items.length > 0 ? items : FALLBACK_NEWS);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNews(FALLBACK_NEWS);
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const openArticle = (url: string) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Prices</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.priceRow}>
          {MARKET_PRICES.map((item) => {
            const isUp = item.changePercent >= 0;
            return (
              <View key={item.crop} style={styles.priceCard}>
                <Text style={styles.priceEmoji}>{item.emoji}</Text>
                <Text style={styles.priceCrop}>{item.crop}</Text>
                <Text style={styles.priceValue}>
                  {item.price}
                  <Text style={styles.priceUnit}>{item.unit}</Text>
                </Text>
                <View style={styles.priceChangeRow}>
                  <Ionicons
                    name={isUp ? 'arrow-up' : 'arrow-down'}
                    size={11}
                    color={isUp ? '#16A34A' : '#DC2626'}
                  />
                  <Text style={[styles.priceChangeText, { color: isUp ? '#16A34A' : '#DC2626' }]}>
                    {Math.abs(item.changePercent)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.section, styles.newsSection]}>
        <View style={styles.newsTitleRow}>
          <Text style={styles.sectionTitle}>Agriculture News</Text>
          {error && (
            <Text style={styles.offlineTag}>Offline</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Loading latest news...</Text>
          </View>
        ) : (
          news.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.newsCard}
              onPress={() => openArticle(item.url)}
              activeOpacity={item.url ? 0.7 : 1}
            >
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
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingHorizontal: 16,
      marginTop: 20,
    },
    newsSection: {
      marginBottom: 4,
    },
    newsTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    offlineTag: {
      fontSize: 11,
      fontWeight: '600',
      color: '#DC2626',
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    priceRow: {
      gap: 12,
      paddingRight: 4,
    },
    priceCard: {
      width: 110,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    priceEmoji: {
      fontSize: 22,
    },
    priceCrop: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    priceValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primaryGreen,
      marginTop: 4,
    },
    priceUnit: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.secondaryText,
    },
    priceChangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 4,
    },
    priceChangeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 24,
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    newsCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    newsHeadline: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 19,
    },
    newsSummary: {
      fontSize: 12,
      color: colors.secondaryText,
      lineHeight: 17,
      marginTop: 5,
    },
    newsMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 8,
    },
    newsSource: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    newsDot: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    newsTime: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    linkIcon: {
      marginLeft: 2,
    },
  });
}

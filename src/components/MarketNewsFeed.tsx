import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

interface MarketPrice {
  emoji: string;
  crop: string;
  price: string;
  unit: string;
  changePercent: number;
}

interface NewsItem {
  headline: string;
  source: string;
  time: string;
}

const MARKET_PRICES: MarketPrice[] = [
  { emoji: '🌽', crop: 'Maize', price: 'GHS 350', unit: '/bag', changePercent: 5 },
  { emoji: '🍫', crop: 'Cocoa', price: 'GHS 2,400', unit: '/ton', changePercent: -2 },
  { emoji: '🍅', crop: 'Tomato', price: 'GHS 180', unit: '/crate', changePercent: 12 },
  { emoji: '🍠', crop: 'Cassava', price: 'GHS 120', unit: '/bag', changePercent: 3 },
  { emoji: '🌾', crop: 'Rice', price: 'GHS 420', unit: '/bag', changePercent: -1 },
  { emoji: '🥜', crop: 'Groundnut', price: 'GHS 280', unit: '/bag', changePercent: 8 },
];

const NEWS_ITEMS: NewsItem[] = [
  {
    headline: 'Ghana cocoa exports hit record high in Q1 2026',
    source: 'GhanaWeb',
    time: '2hrs ago',
  },
  {
    headline: 'Government subsidizes fertiliser for smallholder farmers',
    source: 'Ghana News Agency',
    time: '5hrs ago',
  },
  {
    headline: 'New agricultural equipment scheme launched for Northern Region',
    source: 'Graphic Online',
    time: '1 day ago',
  },
];

export default function MarketNewsFeed() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
        <Text style={styles.sectionTitle}>Agriculture News</Text>
        {NEWS_ITEMS.map((item) => (
          <View key={item.headline} style={styles.newsCard}>
            <Text style={styles.newsHeadline}>{item.headline}</Text>
            <View style={styles.newsMetaRow}>
              <Text style={styles.newsSource}>{item.source}</Text>
              <Text style={styles.newsDot}>•</Text>
              <Text style={styles.newsTime}>{item.time}</Text>
            </View>
          </View>
        ))}
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
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
    newsMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
  });
}

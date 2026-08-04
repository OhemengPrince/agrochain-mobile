import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { Equipment, ProduceBatch, MarketplaceListing, User } from '../../types';
import { globalSearch, SearchResults } from '../../api/searchApi';
import UserAvatar from '../../components/UserAvatar';
import EquipmentImage from '../../components/EquipmentImage';
import { formatCurrency, getCropEmoji } from '../../utils/formatters';

const RECENT_KEY = 'global_search_recent';
const POPULAR = [
  'Maize', 'Cocoa', 'Tractor', 'Cassava',
  'Rice', 'Fertilizer', 'Irrigation', 'Livestock',
  'Harvester', 'Seedlings',
];

export default function GlobalSearchScreen({ navigation }: { navigation: any }) {
  const { colors, isDarkMode } = useTheme();
  const s = createStyles(colors, isDarkMode);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((val) => {
      if (val) setRecentSearches(JSON.parse(val));
    });
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const saveRecent = async (term: string) => {
    const updated = [term, ...recentSearches.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const removeRecent = async (term: string) => {
    const updated = recentSearches.filter((r) => r !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setResults(res);
        saveRecent(query.trim());
      } catch {
        setResults({ people: [], equipment: [], produce: [], marketplace: [], totalResults: 0 });
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = query.trim().length < 2;
  const hasResults = results && (
    results.people.length + results.equipment.length + results.produce.length + results.marketplace.length > 0
  );

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Search header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={s.inputWrap}>
          <Ionicons name="search-outline" size={17} color={colors.secondaryText} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search AgroChain..."
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
            keyboardType="default"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults(null); }} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={colors.secondaryText} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={s.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Empty state */}
        {isEmpty && (
          <>
            {recentSearches.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>Recent Searches</Text>
                  <Pressable onPress={clearAllRecent} style={{ marginLeft: 'auto' }}>
                    <Text style={s.clearAll}>Clear all</Text>
                  </Pressable>
                </View>
                {recentSearches.map((term) => (
                  <Pressable key={term} style={s.recentRow} onPress={() => setQuery(term)}>
                    <Ionicons name="time-outline" size={15} color={colors.secondaryText} style={{ marginRight: 10 }} />
                    <Text style={s.recentTerm} numberOfLines={1}>{term}</Text>
                    <Pressable onPress={() => removeRecent(term)} hitSlop={8} style={{ padding: 4 }}>
                      <Ionicons name="close" size={13} color={colors.secondaryText} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={s.section}>
              <Text style={s.sectionTitle}>Popular Searches</Text>
              <View style={s.chipRow}>
                {POPULAR.map((term) => (
                  <Pressable key={term} style={s.popularChip} onPress={() => setQuery(term)}>
                    <Text style={s.popularChipText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Loading skeletons */}
        {loading && (
          <View style={s.skeletonWrap}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={s.skeletonRow}>
                <View style={s.skeletonAvatar} />
                <View style={s.skeletonLines}>
                  <View style={[s.skeletonLine, { width: '70%' }]} />
                  <View style={[s.skeletonLine, { width: '45%', marginTop: 7 }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Results */}
        {!loading && results && (
          <>
            {/* People */}
            {results.people.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Ionicons name="people-outline" size={15} color={colors.primaryGreen} style={{ marginRight: 6 }} />
                  <Text style={s.sectionTitle}>People</Text>
                  <Text style={s.sectionCount}>{results.people.length}</Text>
                </View>
                {results.people.map((person) => (
                  <Pressable
                    key={person.id}
                    style={s.resultRow}
                    onPress={() => navigation.navigate('PublicProfile', { userId: person.id })}
                  >
                    <UserAvatar user={person} size={42} />
                    <View style={s.resultBody}>
                      <View style={s.resultNameRow}>
                        <Text style={s.resultName} numberOfLines={1}>{person.fullName}</Text>
                        {person.isVerified && (
                          <Ionicons name="checkmark-circle" size={14} color={colors.primaryGreen} style={{ marginLeft: 5 }} />
                        )}
                      </View>
                      <View style={s.metaRow}>
                        <View style={s.roleBadge}>
                          <Text style={s.roleBadgeText}>{person.role.replace(/_/g, ' ')}</Text>
                        </View>
                        {person.district && (
                          <Text style={s.resultSub} numberOfLines={1}> • {person.district}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Equipment */}
            {results.equipment.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Ionicons name="construct-outline" size={15} color={colors.primaryGreen} style={{ marginRight: 6 }} />
                  <Text style={s.sectionTitle}>Equipment</Text>
                  <Text style={s.sectionCount}>{results.equipment.length}</Text>
                </View>
                {results.equipment.map((item) => (
                  <Pressable
                    key={item.id}
                    style={s.resultRow}
                    onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
                  >
                    <EquipmentImage
                      category={item.category}
                      imageUrl={item.imageUrl}
                      style={s.resultThumb}
                      resizeMode="cover"
                    />
                    <View style={s.resultBody}>
                      <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={[s.resultPrice, { color: colors.primaryGreen }]}>
                        GHS {item.dailyRate}/day
                      </Text>
                      <Text style={s.resultSub} numberOfLines={1}>{item.ownerName} • {item.district}</Text>
                    </View>
                    <View style={[s.availBadge, !item.isAvailable && s.unavailBadge]}>
                      <Text style={s.availBadgeText}>{item.isAvailable ? 'Available' : 'Unavailable'}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Produce */}
            {results.produce.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Ionicons name="leaf-outline" size={15} color={colors.primaryGreen} style={{ marginRight: 6 }} />
                  <Text style={s.sectionTitle}>Produce</Text>
                  <Text style={s.sectionCount}>{results.produce.length}</Text>
                </View>
                {results.produce.map((batch) => (
                  <View key={batch.id} style={s.resultRow}>
                    <View style={[s.emojiCircle, { backgroundColor: colors.lightGreen }]}>
                      <Text style={s.emojiText}>{getCropEmoji(batch.cropName)}</Text>
                    </View>
                    <View style={s.resultBody}>
                      <Text style={s.resultName} numberOfLines={1}>{batch.cropName}</Text>
                      <Text style={s.resultSub} numberOfLines={1}>
                        {batch.quantityKg} kg • {batch.farmerName}
                      </Text>
                    </View>
                    {batch.status === 'READY_FOR_SALE' && (
                      <View style={s.readyBadge}>
                        <Text style={s.readyBadgeText}>READY</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Marketplace */}
            {results.marketplace.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Ionicons name="storefront-outline" size={15} color={colors.primaryGreen} style={{ marginRight: 6 }} />
                  <Text style={s.sectionTitle}>Marketplace</Text>
                  <Text style={s.sectionCount}>{results.marketplace.length}</Text>
                </View>
                {results.marketplace.map((listing) => (
                  <Pressable
                    key={listing.id}
                    style={s.resultRow}
                    onPress={() => navigation.navigate('MarketplaceListingDetail', { listingId: listing.id })}
                  >
                    <View style={[s.emojiCircle, { backgroundColor: colors.lightGreen }]}>
                      <Text style={s.emojiText}>{getCropEmoji(listing.name)}</Text>
                    </View>
                    <View style={s.resultBody}>
                      <Text style={s.resultName} numberOfLines={1}>{listing.name}</Text>
                      <Text style={[s.resultPrice, { color: colors.primaryGreen }]}>
                        {formatCurrency(listing.price)}
                      </Text>
                      <Text style={s.resultSub} numberOfLines={1}>{listing.sellerName}</Text>
                    </View>
                    <View style={s.catBadge}>
                      <Text style={s.catBadgeText}>{listing.category}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* No results */}
            {!hasResults && (
              <View style={s.noResults}>
                <Text style={s.noResultsTitle}>No results found for '{query}'</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    body: {
      flex: 1,
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sectionCount: {
      fontSize: 12,
      color: colors.secondaryText,
      marginLeft: 6,
      fontWeight: '600',
    },
    clearAll: {
      fontSize: 13,
      color: colors.primaryGreen,
      fontWeight: '600',
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    recentTerm: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    popularChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    popularChipText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },
    skeletonWrap: {
      padding: 16,
      paddingTop: 20,
      gap: 16,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    skeletonAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.border,
    },
    skeletonLines: {
      flex: 1,
    },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.border,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    resultThumb: {
      width: 58,
      height: 58,
      borderRadius: 10,
    },
    emojiCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: {
      fontSize: 22,
    },
    resultBody: {
      flex: 1,
      gap: 2,
    },
    resultNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    resultName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    resultPrice: {
      fontSize: 13,
      fontWeight: '600',
    },
    resultSub: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    roleBadge: {
      backgroundColor: colors.lightGreen,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    availBadge: {
      backgroundColor: 'rgba(46,139,69,0.1)',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    unavailBadge: {
      backgroundColor: 'rgba(239,68,68,0.1)',
    },
    availBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    readyBadge: {
      backgroundColor: 'rgba(46,139,69,0.12)',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    readyBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    catBadge: {
      backgroundColor: colors.inputBackground,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    catBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    noResults: {
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 32,
      gap: 12,
    },
    noResultsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
  });
}

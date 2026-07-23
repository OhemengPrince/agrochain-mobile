import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getNotifications } from '../../api/notificationApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GeneralStackParamList, AppNotification } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import { formatDate } from '../../utils/formatters';
import MarketNewsFeed from '../../components/MarketNewsFeed';
import MarketPricesSection from '../../components/MarketPricesSection';
import WeatherWidget from '../../components/WeatherWidget';
import UserAvatar from '../../components/UserAvatar';

type Props = NativeStackScreenProps<GeneralStackParamList, 'GeneralHomeMain'>;

const QUICK_ACCESS: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
}[] = [
  { key: 'marketplace', label: 'Marketplace', icon: 'storefront', gradient: ['#1A6B2E', '#2E8B4A'] },
  { key: 'browse', label: 'Browse Equipment', icon: 'construct', gradient: ['#1565C0', '#0D47A1'] },
  { key: 'myListings', label: 'My Listings', icon: 'list', gradient: ['#FF8F00', '#E65100'] },
];

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

function QuickAccessButton({
  label,
  icon,
  gradient,
  onPress,
  styles,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Animated.View style={[styles.quickActionWrap, { transform: [{ scale }], opacity }]}>
      <Pressable style={styles.quickActionButton} onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient colors={gradient} style={styles.quickActionIconWrap}>
          <Ionicons name={icon} size={22} color={colors.white} />
        </LinearGradient>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const NOTIFICATION_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  BOOKING: 'checkmark-circle',
  PAYMENT: 'cash',
  BATCH: 'leaf',
  SYSTEM: 'information-circle',
  NEW_EQUIPMENT: 'construct-outline',
  NEW_LISTING: 'storefront-outline',
  NEW_PRODUCE: 'leaf-outline',
  PRICE_CHANGE: 'pricetag-outline',
  BOOKING_ACCEPTED: 'checkmark-circle-outline',
  NEW_FOLLOWER: 'person-add-outline',
  NEW_ORDER: 'cart-outline',
  ORDER_SHIPPED: 'cube-outline',
  ORDER_COMPLETED: 'checkmark-done-outline',
  ORDER_CANCELLED: 'close-circle-outline',
  PAYMENT_RELEASED: 'wallet-outline',
};

function notificationColor(type: AppNotification['type'], colors: ThemeColors): string {
  switch (type) {
    case 'BOOKING':
      return colors.primaryGreen;
    case 'PAYMENT':
      return colors.accentAmber;
    case 'BATCH':
      return '#2563EB';
    default:
      return colors.secondaryText;
  }
}

function dedupeNotifications(notifications: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  const result: AppNotification[] = [];
  for (const n of notifications) {
    const key = `${n.type}|${n.title}|${n.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(n);
  }
  return result;
}

export default function GeneralHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [refreshing, setRefreshing] = useState(false);
  const [marketKey, setMarketKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchNotifications = async () => {
        try {
          const notifs = await getNotifications();
          console.log('[GeneralHome] notifications OK:', notifs.length, 'items');
          setUnreadCount(notifs.filter(n => !n.isRead).length);
          setNotifications(notifs);
        } catch (err: any) {
          console.log('[GeneralHome] notifications FAILED:', err?.message ?? err);
        }
      };
      fetchNotifications();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setMarketKey((k) => k + 1);
    setRefreshing(false);
  };

  const goToMarketplace = (searchQuery?: string) => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralMarket', { screen: 'MarketplaceList', params: { query: searchQuery } });
  };

  const goToMyListings = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralMarket', { screen: 'MyMarketplaceListings' });
  };

  const goToList = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralList', { screen: 'CreateListing' });
  };

  const goToBrowse = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralBrowse');
  };

  const handleQuickAccess = (key: string) => {
    if (key === 'marketplace') {
      goToMarketplace();
    } else if (key === 'list') {
      goToList();
    } else if (key === 'browse') {
      goToBrowse();
    } else if (key === 'myListings') {
      goToMyListings();
    }
  };

  const recentActivity = dedupeNotifications(notifications)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => (navigation.getParent() as any)?.navigate('GeneralProfile')}>
            <View>
              <UserAvatar user={user} size={44} borderWidth={2} borderColor="rgba(255,255,255,0.9)" />
              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.appName}>Agrochain</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => (navigation.getParent() as any)?.navigate('GeneralNotifications')}>
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications-outline" size={22} color={colors.white} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3B30', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#1A6B2E' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('ChatRooms' as any)}>
              <Ionicons name="chatbubble-outline" size={21} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.searchBarPill} onPress={() => navigation.navigate('GlobalSearch' as any)}>
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
            <Text style={styles.searchPlaceholderText}>Search...</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.listItemBannerWrap}>
          <Pressable onPress={goToList}>
            <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={styles.listItemBanner}>
              <Ionicons name="add-circle" size={28} color="#FFFFFF" />
              <Text style={styles.listItemBannerText}>List an Item</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsRow}
          >
            {QUICK_ACCESS.map((action) => (
              <QuickAccessButton
                key={action.key}
                label={action.label}
                icon={action.icon}
                gradient={action.gradient}
                onPress={() => handleQuickAccess(action.key)}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>

        <WeatherWidget />

        <MarketPricesSection refreshKey={marketKey} />

        <MarketNewsFeed
          maxItems={3}
          refreshKey={marketKey}
          onSeeAll={() => (navigation.getParent() as any)?.navigate('GeneralNews')}
        />

        {recentActivity.length > 0 && (
          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>My Recent Activity</Text>
            {recentActivity.map((item) => {
              const color = notificationColor(item.type, colors);
              return (
                <View key={String(item.id)} style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: `${color}1A` }]}>
                    <Ionicons name={NOTIFICATION_ICON[item.type]} size={18} color={color} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityText} numberOfLines={2}>{item.title} — {item.message}</Text>
                  </View>
                  <Text style={styles.activityTime}>{formatDate(item.createdAt)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    appName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 0.3,
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.accentAmber,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
    },
    searchBarPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 46,
      borderRadius: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
    },
    searchPlaceholderText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.20)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listItemBannerWrap: {
      paddingHorizontal: 20,
      marginTop: 16,
    },
    listItemBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 16,
      height: 58,
      shadowColor: '#1A6B2E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    listItemBannerText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    quickActionsSection: {
      backgroundColor: colors.card,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: 16,
      ...cardShadow,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 20,
    },
    lastSection: {
      marginBottom: 24,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
    },
    activityIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    activityBody: {
      flex: 1,
    },
    activityText: {
      fontSize: 13,
      color: colors.text,
    },
    activityTime: {
      fontSize: 11,
      color: colors.secondaryText,
      marginLeft: 8,
    },
    quickActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 14,
      paddingRight: 4,
    },
    quickActionWrap: {
      width: 88,
    },
    quickActionButton: {
      height: 85,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    quickActionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      marginTop: 6,
      textAlign: 'center',
    },
  });
}

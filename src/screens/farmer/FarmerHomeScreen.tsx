import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  RefreshControl,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Equipment, ProduceBatch, Booking, AppNotification } from '../../types';
import { searchEquipment } from '../../api/equipmentApi';
import { getMyBatches } from '../../api/produceApi';
import { getMyBookings } from '../../api/bookingApi';
import { getNotifications } from '../../api/notificationApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import { formatCategory, formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import EquipmentImage from '../../components/EquipmentImage';
import StarRating from '../../components/StarRating';
import MarketNewsFeed from '../../components/MarketNewsFeed';
import MarketPricesSection from '../../components/MarketPricesSection';
import WeatherWidget from '../../components/WeatherWidget';
import UserAvatar from '../../components/UserAvatar';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerHomeMain'>;

const BANNER_SLIDES = [
  {
    image: require('../../assets/equipment/tractor.jpg'),
    title: 'Need a Tractor?',
    subtitle: 'Find equipment near you in minutes',
  },
  {
    image: require('../../assets/equipment/sprayer.jpg'),
    title: 'Need a Sprayer?',
    subtitle: 'Keep your crops healthy with ease',
  },
  {
    image: require('../../assets/equipment/tiller.jpg'),
    title: 'Need a Tiller?',
    subtitle: 'Prepare your fields in no time',
  },
];

const QUICK_ACTIONS: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
}[] = [
  { key: 'rent', label: 'Rent Equipment', icon: 'construct', gradient: ['#1A6B2E', '#2E8B4A'] },
  { key: 'harvest', label: 'Log Harvest', icon: 'leaf', gradient: ['#FF8F00', '#E65100'] },
  { key: 'bookings', label: 'My Bookings', icon: 'calendar', gradient: ['#1565C0', '#0D47A1'] },
  { key: 'alerts', label: 'Alerts', icon: 'notifications', gradient: ['#6A1B9A', '#4A148C'] },
  { key: 'list', label: 'List Item', icon: 'add-circle-outline', gradient: ['#FF8F00', '#FFB300'] },
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

function QuickActionButton({
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

function EquipmentMiniCard({
  item,
  onPress,
  styles,
  colors,
}: {
  item: Equipment;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();

  return (
    <Animated.View style={[styles.equipmentCard, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} onFocus={onFocus} onBlur={onBlur}>
        <View style={styles.equipmentImageWrap}>
          <EquipmentImage category={item.category} imageUrl={item.imageUrl} style={styles.equipmentImage} resizeMode="cover" />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{formatCategory(item.category)}</Text>
          </View>
        </View>
        <View style={styles.equipmentBody}>
          <Text style={styles.equipmentName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.equipmentOwner} numberOfLines={1}>{item.ownerName}</Text>
          {item.averageRating !== undefined && <StarRating rating={item.averageRating} size={12} />}
          <View style={styles.equipmentFooter}>
            <Text style={styles.equipmentPrice}>GHS {item.dailyRate}/day</Text>
            <TouchableOpacity style={styles.bookButton} onPress={onPress}>
              <Text style={styles.bookButtonText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const NOTIFICATION_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  BOOKING: 'checkmark-circle',
  PAYMENT: 'cash',
  BATCH: 'leaf',
  SYSTEM: 'information-circle',
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

export default function FarmerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketKey, setMarketKey] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerWidth = Dimensions.get('window').width - 32;

  const loadData = useCallback(async () => {
    console.log('[FarmerHome] loading dashboard data...');
    const [equipmentRes, batchesRes, bookingsRes, notificationsRes] = await Promise.allSettled([
      searchEquipment({}),
      getMyBatches(),
      getMyBookings(),
      getNotifications(),
    ]);

    if (equipmentRes.status === 'fulfilled') {
      console.log('[FarmerHome] equipment OK:', equipmentRes.value.length, 'items');
      setEquipment(equipmentRes.value);
    } else {
      console.log('[FarmerHome] equipment FAILED:', equipmentRes.reason?.message ?? equipmentRes.reason);
    }

    if (batchesRes.status === 'fulfilled') {
      console.log('[FarmerHome] batches OK:', batchesRes.value.length, 'items');
      setBatches(batchesRes.value);
    } else {
      console.log('[FarmerHome] batches FAILED:', batchesRes.reason?.message ?? batchesRes.reason);
    }

    if (bookingsRes.status === 'fulfilled') {
      console.log('[FarmerHome] bookings OK:', bookingsRes.value.length, 'items');
      setBookings(bookingsRes.value);
    } else {
      console.log('[FarmerHome] bookings FAILED:', bookingsRes.reason?.message ?? bookingsRes.reason);
    }

    if (notificationsRes.status === 'fulfilled') {
      console.log('[FarmerHome] notifications OK:', notificationsRes.value.length, 'items');
      setNotifications(notificationsRes.value);
    } else {
      console.log('[FarmerHome] notifications FAILED:', notificationsRes.reason?.message ?? notificationsRes.reason);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % BANNER_SLIDES.length;
        bannerScrollRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [bannerWidth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMarketKey((k) => k + 1);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading your farm dashboard..." />;
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'Farmer';
  const locationLabel = user?.district && user?.region ? `${user.district}, ${user.region}` : 'Ghana';

  const recentActivity = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const goToEquipmentTab = (searchQuery?: string) => {
    const parent = navigation.getParent() as any;
    parent?.navigate('FarmerEquipment', { screen: 'FarmerEquipmentList', params: { query: searchQuery } });
  };

  const handleQuickAction = (key: string) => {
    const parent = navigation.getParent() as any;
    if (key === 'rent') {
      goToEquipmentTab();
    } else if (key === 'harvest') {
      parent?.navigate('FarmerBatches', { screen: 'CreateBatch' });
    } else if (key === 'bookings') {
      parent?.navigate('FarmerBookings');
    } else if (key === 'alerts') {
      navigation.navigate('FarmerNotifications');
    } else if (key === 'list') {
      parent?.navigate('FarmerMarket', { screen: 'MarketplaceList' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('ChatRooms')}>
                <Ionicons name="chatbubbles-outline" size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('FarmerNotifications')}>
                <Ionicons name="notifications" size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bellButton} onPress={() => (navigation.getParent() as any)?.navigate('FarmerProfile')}>
                <UserAvatar user={user} size={28} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText}> {locationLabel}</Text>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => goToEquipmentTab(query)}
              placeholder="Search equipment, produce..."
              placeholderTextColor={colors.secondaryText}
              returnKeyType="search"
            />
          </View>
        </LinearGradient>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsRow}
          >
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.key}
                label={action.label}
                icon={action.icon}
                gradient={action.gradient}
                onPress={() => handleQuickAction(action.key)}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>

        <WeatherWidget />

        <View style={styles.section}>
          <View style={styles.bannerWrapper}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={{ width: bannerWidth }}
            >
              {BANNER_SLIDES.map((slide, i) => (
                <ImageBackground
                  key={i}
                  source={slide.image}
                  style={[styles.banner, { width: bannerWidth }]}
                  imageStyle={styles.bannerImage}
                >
                  <View style={styles.bannerOverlay} />
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>{slide.title}</Text>
                    <Text style={styles.bannerSubtitle}>{slide.subtitle}</Text>
                  </View>
                  <TouchableOpacity style={styles.bannerButton} onPress={() => goToEquipmentTab()}>
                    <Text style={styles.bannerButtonText}>Browse Now</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primaryGreen} />
                  </TouchableOpacity>
                </ImageBackground>
              ))}
            </ScrollView>
            <View style={styles.bannerDots}>
              {BANNER_SLIDES.map((_, i) => (
                <View key={i} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Equipment Near You</Text>
            <TouchableOpacity onPress={() => goToEquipmentTab()}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentRow}>
            {equipment.slice(0, 6).map((item) => (
              <EquipmentMiniCard
                key={String(item.id)}
                item={item}
                onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>

        <MarketPricesSection refreshKey={marketKey} />

        <MarketNewsFeed
          maxItems={3}
          onSeeAll={() => (navigation.getParent() as any)?.navigate('FarmerNews')}
        />

        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>My Recent Activity</Text>
          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity yet.</Text>
          ) : (
            recentActivity.map((item) => {
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
            })
          )}
        </View>
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
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 36,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.white,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.20)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    locationText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      height: 46,
      paddingHorizontal: 14,
      marginTop: 16,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    quickActionsSection: {
      backgroundColor: colors.card,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: -20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    quickActionsRow: {
      flexDirection: 'row',
      marginTop: 14,
      gap: 12,
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
    section: {
      paddingHorizontal: 16,
      marginTop: 20,
    },
    lastSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    banner: {
      height: 120,
      borderRadius: 16,
      overflow: 'hidden',
      padding: 16,
      justifyContent: 'space-between',
    },
    bannerImage: {
      borderRadius: 16,
    },
    bannerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10,40,15,0.55)',
    },
    bannerContent: {
      alignSelf: 'flex-start',
    },
    bannerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.white,
    },
    bannerSubtitle: {
      fontSize: 13,
      color: colors.white,
      marginTop: 4,
    },
    bannerWrapper: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    bannerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      alignSelf: 'flex-end',
      backgroundColor: colors.white,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    bannerButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    bannerDots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingTop: 8,
    },
    bannerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    bannerDotActive: {
      width: 18,
      backgroundColor: colors.primaryGreen,
    },
    equipmentRow: {
      gap: 14,
    },
    equipmentCard: {
      width: 180,
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      ...cardShadow,
    },
    equipmentImageWrap: {
      position: 'relative',
    },
    equipmentImage: {
      width: '100%',
      height: 110,
    },
    categoryBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: colors.accentAmber,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    equipmentBody: {
      padding: 10,
    },
    equipmentName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    equipmentOwner: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 1,
      marginBottom: 4,
    },
    equipmentFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    equipmentPrice: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    bookButton: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    bookButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
      ...cardShadow,
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
    emptyText: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 10,
    },
  });
}

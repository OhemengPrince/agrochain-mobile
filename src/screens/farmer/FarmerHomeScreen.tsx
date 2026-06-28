import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  RefreshControl,
  Animated,
  Pressable,
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
import StarRating from '../../components/StarRating';
import MarketNewsFeed from '../../components/MarketNewsFeed';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerHomeMain'>;

const EQUIPMENT_IMAGES = [
  require('../../assets/equipment/tractor.jpg'),
  require('../../assets/equipment/harvester.jpg'),
  require('../../assets/equipment/irrigation.jpg'),
  require('../../assets/equipment/sprayer.jpg'),
  require('../../assets/equipment/tiller.jpg'),
  require('../../assets/equipment/sheller.jpg'),
];

const TRACTOR_IMAGE = require('../../assets/equipment/tractor.jpg');

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
  image,
  onPress,
  styles,
  colors,
}: {
  item: Equipment;
  image: any;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const { scale, opacity, onPressIn, onPressOut, onFocus, onBlur } = usePressAnimation();

  return (
    <Animated.View style={[styles.equipmentCard, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} onFocus={onFocus} onBlur={onBlur}>
        <View style={styles.equipmentImageWrap}>
          <Image source={image} style={styles.equipmentImage} resizeMode="cover" />
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

  const loadData = useCallback(async () => {
    const [equipmentData, batchesData, bookingsData, notificationsData] = await Promise.all([
      searchEquipment({}),
      getMyBatches(),
      getMyBookings(),
      getNotifications(),
    ]);
    setEquipment(equipmentData);
    setBatches(batchesData);
    setBookings(bookingsData);
    setNotifications(notificationsData);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingOverlay message="Loading your farm dashboard..." />;
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'Farmer';
  const locationLabel = user?.district && user?.region ? `${user.district}, ${user.region}` : 'Ghana';

  const activeRentals = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
  const readyToSell = batches.filter((b) => b.status === 'READY_FOR_SALE').length;
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
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
            <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('FarmerNotifications')}>
              <Ionicons name="notifications" size={20} color={colors.primaryGreen} />
            </TouchableOpacity>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsRow}
          contentContainerStyle={styles.statsRowContent}
        >
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconCircle}>
                <Ionicons name="construct" size={20} color={colors.primaryGreen} />
              </View>
              <Text style={styles.statValue}>{activeRentals}</Text>
            </View>
            <Text style={styles.statLabel}>Active Rentals</Text>
            <View style={[styles.statAccentBar, { backgroundColor: colors.primaryGreen }]} />
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconCircle}>
                <Ionicons name="leaf" size={20} color={colors.primaryGreen} />
              </View>
              <Text style={styles.statValue}>{batches.length}</Text>
            </View>
            <Text style={styles.statLabel}>My Batches</Text>
            <View style={[styles.statAccentBar, { backgroundColor: colors.primaryGreen }]} />
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconCircle}>
                <Ionicons name="star" size={20} color={colors.accentAmber} />
              </View>
              <Text style={[styles.statValue, styles.statValueAmber]}>4.8</Text>
            </View>
            <Text style={styles.statLabel}>My Rating</Text>
            <View style={[styles.statAccentBar, { backgroundColor: colors.accentAmber }]} />
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconCircle}>
                <Ionicons name="cube" size={20} color={colors.primaryGreen} />
              </View>
              <Text style={styles.statValue}>{readyToSell}</Text>
            </View>
            <Text style={styles.statLabel}>Ready to Sell</Text>
            <View style={[styles.statAccentBar, { backgroundColor: colors.primaryGreen }]} />
          </View>
        </ScrollView>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
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
          </View>
        </View>

        <View style={styles.section}>
          <ImageBackground source={TRACTOR_IMAGE} style={styles.banner} imageStyle={styles.bannerImage}>
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Need a Tractor?</Text>
              <Text style={styles.bannerSubtitle}>Find equipment near you in minutes</Text>
            </View>
            <TouchableOpacity style={styles.bannerButton} onPress={() => goToEquipmentTab()}>
              <Text style={styles.bannerButtonText}>Browse Now</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primaryGreen} />
            </TouchableOpacity>
          </ImageBackground>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Equipment Near You</Text>
            <TouchableOpacity onPress={() => goToEquipmentTab()}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentRow}>
            {equipment.slice(0, 6).map((item, index) => (
              <EquipmentMiniCard
                key={item.id}
                item={item}
                image={EQUIPMENT_IMAGES[index % EQUIPMENT_IMAGES.length]}
                onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>

        <MarketNewsFeed />

        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>My Recent Activity</Text>
          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity yet.</Text>
          ) : (
            recentActivity.map((item) => {
              const color = notificationColor(item.type, colors);
              return (
                <View key={item.id} style={styles.activityRow}>
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
    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.white,
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
      backgroundColor: colors.white,
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
    statsRow: {
      marginTop: -20,
    },
    statsRowContent: {
      paddingHorizontal: 16,
      gap: 12,
    },
    statCard: {
      width: 130,
      height: 90,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    statValueAmber: {
      color: colors.accentAmber,
    },
    statLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 8,
    },
    statAccentBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
    },
    quickActionsSection: {
      backgroundColor: colors.card,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: 16,
    },
    quickActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    quickActionWrap: {
      width: '23%',
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

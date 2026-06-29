import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Booking, Equipment } from '../../types';
import EquipmentImage from '../../components/EquipmentImage';
import { getMyListings } from '../../api/equipmentApi';
import { getIncomingBookings } from '../../api/bookingApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileDropdownMenu from '../../components/ProfileDropdownMenu';
import ProfileTabs from '../../components/ProfileTabs';
import ProfileStatCard from '../../components/ProfileStatCard';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerProfileMain'>;

const TABS = ['About', 'Activity', 'Reviews'];

// Illustrative placeholder data — this app has no backend model for
// reviews received by an equipment owner, so this section is static demo content.
const RATING_BREAKDOWN: { stars: number; percentage: number; count: number }[] = [
  { stars: 5, percentage: 78, count: 14 },
  { stars: 4, percentage: 55, count: 6 },
  { stars: 3, percentage: 15, count: 1 },
  { stars: 2, percentage: 0, count: 0 },
  { stars: 1, percentage: 0, count: 0 },
];

const SAMPLE_REVIEWS = [
  {
    id: 'r1',
    reviewer: 'Kwame Asante',
    date: '2026-05-20',
    rating: 5,
    comment: 'Tractor was well maintained and ready exactly on time. Will rent again.',
  },
  {
    id: 'r2',
    reviewer: 'Akosua Mensah',
    date: '2026-04-18',
    rating: 4,
    comment: 'Good equipment, owner was responsive throughout the booking.',
  },
];

const BIO_TEXT = 'Equipment owner with 5 tractors and harvesters serving farmers across Ashanti Region 🚜';

function PressableScale({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number, duration: number) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.97, 0.95, 100)}
        onPressOut={() => animateTo(1, 1, 150)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function isBookingActive(booking: Booking): boolean {
  if (booking.status !== 'CONFIRMED') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(booking.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(booking.endDate);
  end.setHours(0, 0, 0, 0);
  return start <= today && today <= end;
}

export default function OwnerProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [listings, setListings] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0]);

  const logoutScale = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    const [listingsData, bookingsData] = await Promise.all([getMyListings(), getIncomingBookings()]);
    setListings(listingsData);
    setBookings(bookingsData);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, `${feature} is coming soon.`);
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const openPersonalInfo = () => {
    setDropdownVisible(false);
    setPersonalInfoVisible(true);
  };

  const handleLogoutPressIn = () => {
    Animated.spring(logoutScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };

  const handleLogoutPressOut = () => {
    Animated.spring(logoutScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleAddEquipment = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('OwnerEquipment', { screen: 'CreateEquipment' });
  };

  const handleManageEquipment = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('OwnerEquipment', { screen: 'OwnerEquipmentList' });
  };

  const handleEditEquipment = (equipmentId: string) => {
    const parent = navigation.getParent() as any;
    parent?.navigate('OwnerEquipment', { screen: 'EditEquipment', params: { equipmentId } });
  };

  if (loading || !user) {
    return <LoadingOverlay message="Loading profile..." />;
  }

  const initial = user.fullName.charAt(0).toUpperCase();
  const locationLabel = user.district && user.region ? `${user.district}, ${user.region} Region` : 'Ghana';
  const memberSince = formatDate(user.createdAt);
  const avatarSource = avatarUri ?? user.profileImageUrl;

  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const activeBookings = bookings.filter(isBookingActive);

  const totalEarnings = completedBookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + b.totalCost, 0);

  const now = new Date();
  const thisMonthEarnings = completedBookings
    .filter((b) => b.paymentStatus === 'PAID')
    .filter((b) => {
      const created = new Date(b.createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    })
    .reduce((sum, b) => sum + b.totalCost, 0);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#0B3D1E', '#1A6B2E', '#2E8B4A', '#6FCF7E']} style={styles.hero}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.settingsIconButton} onPress={() => setDropdownVisible(true)}>
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarWrap}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handlePickAvatar}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <BlurView intensity={45} tint="light" style={styles.glassCard}>
            <Text style={styles.name}>{user.fullName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>EQUIPMENT OWNER</Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.locationText}>{locationLabel}</Text>
            </View>

            <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
          </BlurView>
        </LinearGradient>

        <View style={styles.statsOverlapRow}>
          <ProfileStatCard icon="construct" iconColor="#1A6B2E" value={`${bookings.length}`} label="Rentals" />
          <ProfileStatCard icon="star" iconColor="#FF8F00" value="4.7" label="Rating" />
          <ProfileStatCard icon="cash" iconColor="#1A6B2E" value={formatCurrency(totalEarnings)} label="Earnings" />
        </View>

        <View style={styles.tabsWrap}>
          <ProfileTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === 'About' && (
          <View style={styles.premiumCardWrap}>
            <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
              <Pressable style={styles.bioToggleRow} onPress={() => setBioExpanded((prev) => !prev)}>
                <Text style={styles.bioToggleLabel}>Bio</Text>
                <Ionicons
                  name={bioExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.primaryGreen}
                />
              </Pressable>
              {bioExpanded && <Text style={styles.bioText}>{BIO_TEXT}</Text>}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user.phoneNumber}</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {activeTab === 'Activity' && (
          <>
            <View style={styles.premiumCardWrap}>
              <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
                <View style={styles.premiumHeaderRow}>
                  <View style={styles.premiumIconCircle}>
                    <Ionicons name="construct-outline" size={18} color={colors.primaryGreen} />
                  </View>
                  <Text style={styles.premiumHeaderText}>My Equipment</Text>
                  <TouchableOpacity onPress={handleManageEquipment} style={styles.seeAllWrap}>
                    <View style={styles.seeAllRow}>
                      <Text style={styles.seeAllText}>Manage</Text>
                      <Ionicons name="chevron-forward" size={12} color={colors.accentAmber} />
                    </View>
                  </TouchableOpacity>
                </View>

                {listings.length === 0 ? (
                  <Text style={styles.emptyText}>You haven't listed any equipment yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentScroll}>
                    {listings.map((item) => (
                      <PressableScale
                        key={item.id}
                        style={styles.miniEquipmentCard}
                        onPress={() => handleEditEquipment(item.id)}
                      >
                        <EquipmentImage category={item.category} style={styles.miniEquipmentImage} resizeMode="contain" />
                        <Text style={styles.miniEquipmentName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.miniEquipmentStatusRow}>
                          <View
                            style={[
                              styles.miniEquipmentDot,
                              { backgroundColor: item.isAvailable ? '#16A34A' : '#DC2626' },
                            ]}
                          />
                          <Text style={styles.miniEquipmentRate}>{formatCurrency(item.dailyRate)}/day</Text>
                        </View>
                      </PressableScale>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity style={styles.addEquipmentButton} onPress={handleAddEquipment}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primaryGreen} />
                  <Text style={styles.addEquipmentButtonText}>Add Equipment</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={styles.premiumCardWrap}>
              <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
                <View style={styles.premiumHeaderRow}>
                  <View style={styles.premiumIconCircle}>
                    <Ionicons name="cash-outline" size={18} color={colors.primaryGreen} />
                  </View>
                  <Text style={styles.premiumHeaderText}>Earnings Summary</Text>
                </View>
                <View style={styles.earningsGrid}>
                  <View style={styles.earningsBox}>
                    <Text style={styles.earningsValueGreen}>{formatCurrency(thisMonthEarnings)}</Text>
                    <Text style={styles.earningsLabel}>This Month</Text>
                  </View>
                  <View style={styles.earningsBox}>
                    <Text style={styles.earningsValueGreen}>{formatCurrency(totalEarnings)}</Text>
                    <Text style={styles.earningsLabel}>Total Earned</Text>
                  </View>
                  <View style={styles.earningsBox}>
                    <Text style={styles.earningsValueGray}>{completedBookings.length} rentals</Text>
                    <Text style={styles.earningsLabel}>Completed</Text>
                  </View>
                  <View style={styles.earningsBox}>
                    <Text style={styles.earningsValueAmber}>{pendingBookings.length + activeBookings.length} rentals</Text>
                    <Text style={styles.earningsLabel}>Pending</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </>
        )}

        {activeTab === 'Reviews' && (
          <View style={styles.premiumCardWrap}>
            <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
              <View style={styles.premiumHeaderRow}>
                <View style={[styles.premiumIconCircle, styles.premiumIconCircleAmber]}>
                  <Ionicons name="star-outline" size={18} color={colors.accentAmber} />
                </View>
                <Text style={styles.premiumHeaderText}>Reviews & Ratings</Text>
                <TouchableOpacity onPress={() => showComingSoon('All reviews')} style={styles.seeAllWrap}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ratingOverviewBlock}>
                <Text style={styles.ratingBigNumber}>4.7</Text>
                <View style={styles.ratingStarsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={16} color={colors.accentAmber} />
                  ))}
                </View>
                <Text style={styles.ratingCountText}>21 reviews</Text>
              </View>

              <View style={styles.ratingBarsWrap}>
                {RATING_BREAKDOWN.map((row) => (
                  <View key={row.stars} style={styles.ratingBarRow}>
                    <Text style={styles.ratingBarLabel}>{row.stars}★</Text>
                    <View style={styles.ratingBarTrack}>
                      <LinearGradient
                        colors={['#FF8F00', '#FFB300']}
                        style={[styles.ratingBarFill, { width: `${row.percentage}%` }]}
                      />
                    </View>
                    <Text style={styles.ratingBarCount}>{row.count}</Text>
                  </View>
                ))}
              </View>

              {SAMPLE_REVIEWS.map((review) => (
                <PressableScale key={review.id} style={styles.reviewCardOuter}>
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewHeaderRow}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{review.reviewer.charAt(0)}</Text>
                      </View>
                      <Text style={styles.reviewerName}>{review.reviewer}</Text>
                      <Text style={styles.reviewDate}>{formatDate(review.date)}</Text>
                    </View>
                    <View style={styles.reviewStarsRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={12}
                          color={i < review.rating ? colors.accentAmber : colors.border}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
                </PressableScale>
              ))}
            </LinearGradient>
          </View>
        )}

        <View style={styles.logoutGlowWrap}>
          <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleLogout}
              onPressIn={handleLogoutPressIn}
              onPressOut={handleLogoutPressOut}
              disabled={loggingOut}
            >
              <LinearGradient colors={['#DC2626', '#991B1B']} style={styles.logoutButton}>
                {loggingOut ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.logoutIconCircle}>
                      <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={styles.logoutArrow} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      <ProfileDropdownMenu
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        onPersonalInfo={openPersonalInfo}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={setNotificationsEnabled}
        onChangePassword={() => showComingSoon('Change Password')}
        onRateApp={() => showComingSoon('Rate the App')}
        onContactSupport={() => showComingSoon('Contact Support')}
        extraItems={[
          { icon: 'business-outline', label: 'Bank Details', onPress: () => showComingSoon('Bank Details') },
          { icon: 'bar-chart-outline', label: 'Earnings Report', onPress: () => showComingSoon('Earnings Report') },
        ]}
      />

      <Modal
        visible={personalInfoVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPersonalInfoVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHandle} />
            <Text style={styles.infoModalTitle}>Personal Information</Text>

            {[
              { label: 'Email', value: user.email },
              { label: 'Phone', value: user.phoneNumber },
              { label: 'Location', value: locationLabel },
              { label: 'Member Since', value: memberSince },
            ].map((item) => (
              <View key={item.label} style={styles.infoModalRow}>
                <Text style={styles.infoModalLabel}>{item.label}</Text>
                <Text style={styles.infoModalValue}>{item.value}</Text>
              </View>
            ))}

            <Pressable style={styles.infoModalCloseButton} onPress={() => setPersonalInfoVisible(false)}>
              <Text style={styles.infoModalCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    hero: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 36,
      alignItems: 'center',
    },
    headerTopRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    settingsIconButton: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    avatarWrap: {
      marginTop: 8,
      position: 'relative',
    },
    avatar: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
      backgroundColor: '#1A6B2E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 44,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    cameraButton: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryGreen,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    glassCard: {
      marginTop: 16,
      width: '100%',
      borderRadius: 24,
      paddingVertical: 18,
      paddingHorizontal: 20,
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    name: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    roleBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 3,
      marginTop: 8,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 10,
    },
    locationText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.9)',
    },
    memberSinceText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 6,
    },
    statsOverlapRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: -24,
      marginHorizontal: 16,
    },
    tabsWrap: {
      marginHorizontal: 16,
      marginTop: 20,
    },
    bioToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.lightGreen,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    bioToggleLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    bioText: {
      fontSize: 13,
      color: colors.secondaryText,
      lineHeight: 20,
      marginTop: 10,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      marginTop: 10,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    premiumCardWrap: {
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: 'rgba(26,107,46,0.15)',
      backgroundColor: colors.card,
      overflow: 'hidden',
      shadowColor: '#1A6B2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    premiumCardGradient: {
      padding: 16,
    },
    premiumHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    premiumIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumIconCircleAmber: {
      backgroundColor: colors.lightAmber,
    },
    premiumHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryGreen,
      flex: 1,
    },
    seeAllWrap: {
      paddingHorizontal: 2,
    },
    seeAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentAmber,
    },
    emptyText: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    equipmentScroll: {
      gap: 12,
      paddingBottom: 4,
    },
    miniEquipmentCard: {
      width: 110,
    },
    miniEquipmentImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: '#F0F7F2',
    },
    miniEquipmentName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginTop: 6,
    },
    miniEquipmentStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    miniEquipmentDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    miniEquipmentRate: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    addEquipmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      marginTop: 14,
    },
    addEquipmentButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    earningsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    earningsBox: {
      width: '48%',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    earningsValueGreen: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    earningsValueGray: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    earningsValueAmber: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accentAmber,
    },
    earningsLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
      textAlign: 'center',
    },
    ratingOverviewBlock: {
      alignItems: 'center',
      marginBottom: 16,
    },
    ratingBigNumber: {
      fontSize: 56,
      fontWeight: '800',
      color: '#FF8F00',
      textShadowColor: 'rgba(255,143,0,0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    ratingStarsRow: {
      flexDirection: 'row',
      gap: 2,
      marginTop: 4,
    },
    ratingCountText: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
    },
    ratingBarsWrap: {
      gap: 6,
      marginBottom: 8,
    },
    ratingBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ratingBarLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      width: 22,
    },
    ratingBarTrack: {
      flex: 1,
      height: 8,
      borderRadius: 10,
      backgroundColor: '#F0F0F0',
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: 8,
      borderRadius: 10,
    },
    ratingBarCount: {
      fontSize: 12,
      color: colors.secondaryText,
      width: 18,
      textAlign: 'right',
    },
    reviewCardOuter: {
      marginTop: 12,
    },
    reviewCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    reviewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reviewAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewAvatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    reviewerName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    reviewDate: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    reviewStarsRow: {
      flexDirection: 'row',
      gap: 2,
      marginTop: 6,
    },
    reviewComment: {
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.secondaryText,
      marginTop: 6,
      lineHeight: 18,
    },
    logoutGlowWrap: {
      marginHorizontal: 16,
      marginTop: 24,
      paddingBottom: 40,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 58,
      borderRadius: 20,
      paddingHorizontal: 16,
    },
    logoutIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      left: 12,
    },
    logoutButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    logoutArrow: {
      position: 'absolute',
      right: 16,
    },
    infoModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    infoModalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 48,
    },
    infoModalHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#E0E0E0',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    infoModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    infoModalRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    infoModalLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 4,
    },
    infoModalValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    infoModalCloseButton: {
      marginTop: 24,
      backgroundColor: '#1A6B2E',
      borderRadius: 16,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoModalCloseButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

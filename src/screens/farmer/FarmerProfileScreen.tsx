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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FarmerStackParamList, Booking, ProduceBatch } from '../../types';
import { getMyBookings } from '../../api/bookingApi';
import { getMyBatches } from '../../api/produceApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileDropdownMenu from '../../components/ProfileDropdownMenu';
import PersonalInfoSheet from '../../components/PersonalInfoSheet';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerProfileMain'>;

// Illustrative placeholder data — this app has no backend model for
// reviews received by a farmer, so this section is static demo content.
const RATING_BREAKDOWN: { stars: number; percentage: number; count: number }[] = [
  { stars: 5, percentage: 80, count: 10 },
  { stars: 4, percentage: 60, count: 5 },
  { stars: 3, percentage: 20, count: 2 },
  { stars: 2, percentage: 5, count: 0 },
  { stars: 1, percentage: 0, count: 0 },
];

const SAMPLE_REVIEWS = [
  {
    id: 'r1',
    reviewer: 'Nana Yeboah',
    date: '2026-05-12',
    rating: 5,
    comment: 'Returned the tractor on time and in great condition. Easy to work with!',
  },
  {
    id: 'r2',
    reviewer: 'Efua Darko',
    date: '2026-04-02',
    rating: 4,
    comment: 'Good communication throughout the rental period.',
  },
];

const BIO_TEXT = 'Smallholder farmer from Kumasi specializing in maize and cassava farming';

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

export default function FarmerProfileScreen(_props: Props) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);

  const logoutScale = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    const [bookingsData, batchesData] = await Promise.all([getMyBookings(), getMyBatches()]);
    setBookings(bookingsData);
    setBatches(batchesData);
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

  if (loading || !user) {
    return <LoadingOverlay message="Loading profile..." />;
  }

  const initial = user.fullName.charAt(0).toUpperCase();
  const locationLabel = user.district && user.region ? `${user.district}, ${user.region} Region` : 'Ghana';
  const memberSince = formatDate(user.createdAt);
  const avatarSource = avatarUri ?? user.profileImageUrl;

  const totalSpent = bookings.reduce((sum, b) => sum + b.totalCost, 0);
  const totalSold = batches
    .filter((b) => b.status === 'SOLD' && b.pricePerKg !== undefined)
    .reduce((sum, b) => sum + b.quantityKg * (b.pricePerKg ?? 0), 0);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.settingsIconButton} onPress={() => setDropdownVisible(true)}>
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarWrap}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handlePickAvatar}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{user.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>FARMER</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>

          <View style={styles.bioRow}>
            <Text style={styles.bioText}>{BIO_TEXT}</Text>
            <TouchableOpacity onPress={() => showComingSoon('Edit bio')} hitSlop={8}>
              <Ionicons name="pencil-outline" size={12} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <PressableScale style={styles.statCard}>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Rentals</Text>
          </PressableScale>
          <PressableScale style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueAmber]}>4.8 ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </PressableScale>
          <PressableScale style={styles.statCard}>
            <Text style={styles.statValue}>{batches.length}</Text>
            <Text style={styles.statLabel}>Batches</Text>
          </PressableScale>
        </View>

        <View style={styles.premiumCardWrap}>
          <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
            <View style={styles.premiumHeaderRow}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="leaf" size={18} color={colors.primaryGreen} />
              </View>
              <Text style={styles.premiumHeaderText}>Farming Activity</Text>
            </View>
            <View style={styles.activityGrid}>
              <PressableScale style={styles.activityBoxOuter}>
                <LinearGradient colors={['#F0F7F2', '#E8F5E9']} style={styles.activityBox}>
                  <Text style={styles.activityValueGreen}>{bookings.length} times</Text>
                  <Text style={styles.activityLabel}>Equipment Rented</Text>
                </LinearGradient>
              </PressableScale>
              <PressableScale style={styles.activityBoxOuter}>
                <LinearGradient colors={['#FFF8E1', '#FFF3CD']} style={styles.activityBox}>
                  <Text style={styles.activityValueAmber}>{formatCurrency(totalSpent)}</Text>
                  <Text style={styles.activityLabel}>Total Spent</Text>
                </LinearGradient>
              </PressableScale>
              <PressableScale style={styles.activityBoxOuter}>
                <LinearGradient colors={['#F0F7F2', '#E8F5E9']} style={styles.activityBox}>
                  <Text style={styles.activityValueGreen}>{batches.length} batches</Text>
                  <Text style={styles.activityLabel}>Produce Logged</Text>
                </LinearGradient>
              </PressableScale>
              <PressableScale style={styles.activityBoxOuter}>
                <LinearGradient colors={['#F0F7F2', '#E8F5E9']} style={styles.activityBox}>
                  <Text style={styles.activityValueGreen}>{formatCurrency(totalSold)}</Text>
                  <Text style={styles.activityLabel}>Total Earned</Text>
                </LinearGradient>
              </PressableScale>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.premiumCardWrap}>
          <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
            <View style={styles.premiumHeaderRow}>
              <View style={[styles.premiumIconCircle, styles.premiumIconCircleAmber]}>
                <Ionicons name="star" size={18} color={colors.accentAmber} />
              </View>
              <Text style={styles.premiumHeaderText}>Reviews & Ratings</Text>
              <TouchableOpacity onPress={() => showComingSoon('All reviews')} style={styles.seeAllWrap}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ratingOverviewBlock}>
              <Text style={styles.ratingBigNumber}>4.8</Text>
              <View style={styles.ratingStarsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons key={i} name="star" size={16} color={colors.accentAmber} />
                ))}
              </View>
              <Text style={styles.ratingCountText}>17 reviews</Text>
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
          { icon: 'ribbon-outline', label: 'My Certifications', onPress: () => showComingSoon('My Certifications') },
          { icon: 'bar-chart-outline', label: 'Season Report', onPress: () => showComingSoon('Season Report') },
        ]}
      />

      <PersonalInfoSheet
        visible={personalInfoVisible}
        onClose={() => setPersonalInfoVisible(false)}
        onEdit={() => showComingSoon('Edit profile')}
        email={user.email}
        phone={user.phoneNumber}
        location={locationLabel}
        memberSince={memberSince}
      />
    </View>
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
      paddingTop: 16,
      paddingBottom: 28,
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
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
      backgroundColor: '#1A6B2E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 36,
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
    name: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 10,
    },
    roleBadge: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 3,
      marginTop: 6,
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
      color: 'rgba(255,255,255,0.85)',
    },
    bioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 10,
      maxWidth: 280,
    },
    bioText: {
      fontSize: 13,
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      flexShrink: 1,
    },
    memberSinceText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 8,
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: -20,
      marginHorizontal: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    statValueAmber: {
      color: colors.accentAmber,
    },
    statLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    premiumCardWrap: {
      marginHorizontal: 16,
      marginTop: 20,
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
    activityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    activityBoxOuter: {
      width: '48%',
    },
    activityBox: {
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(26,107,46,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    activityValueGreen: {
      fontSize: 20,
      fontWeight: '800',
      color: '#1A6B2E',
    },
    activityValueAmber: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FF8F00',
    },
    activityLabel: {
      fontSize: 12,
      color: '#6B7280',
      marginTop: 4,
      textAlign: 'center',
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentAmber,
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
  });
}

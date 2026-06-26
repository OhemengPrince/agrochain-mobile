import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
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

export default function FarmerProfileScreen(_props: Props) {
  const { user, logout } = useAuth();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
            <TouchableOpacity
              style={styles.settingsIconButton}
              onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
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
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{user.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>FARMER</Text>
          </View>
          <Text style={styles.locationText}>📍 {locationLabel}</Text>
          <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Rentals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueAmber]}>4.8 ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{batches.length}</Text>
            <Text style={styles.statLabel}>Batches</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="person" size={16} color={colors.primaryGreen} />
              <Text style={styles.cardHeaderText}>Personal Information</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => showComingSoon('Edit profile')}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📧 Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📱 Phone</Text>
            <Text style={styles.infoValue}>{user.phoneNumber}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 Location</Text>
            <Text style={styles.infoValue}>{locationLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>🎂 Member Since</Text>
            <Text style={styles.infoValue}>{memberSince}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="leaf" size={16} color={colors.primaryGreen} />
            <Text style={styles.cardHeaderText}>Farming Activity</Text>
          </View>
          <View style={styles.activityGrid}>
            <View style={styles.activityBox}>
              <Text style={styles.activityValueGreen}>{bookings.length} times</Text>
              <Text style={styles.activityLabel}>Equipment Rented</Text>
            </View>
            <View style={styles.activityBox}>
              <Text style={styles.activityValueAmber}>{formatCurrency(totalSpent)}</Text>
              <Text style={styles.activityLabel}>Total Spent</Text>
            </View>
            <View style={styles.activityBox}>
              <Text style={styles.activityValueGreen}>{batches.length} batches</Text>
              <Text style={styles.activityLabel}>Produce Logged</Text>
            </View>
            <View style={styles.activityBox}>
              <Text style={styles.activityValueGreen}>{formatCurrency(totalSold)}</Text>
              <Text style={styles.activityLabel}>Total Sold</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="star" size={16} color={colors.accentAmber} />
              <Text style={styles.cardHeaderText}>Reviews & Ratings</Text>
            </View>
            <TouchableOpacity onPress={() => showComingSoon('All reviews')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingOverviewRow}>
            <Text style={styles.ratingBigNumber}>4.8</Text>
            <View style={styles.ratingBarsWrap}>
              {RATING_BREAKDOWN.map((row) => (
                <View key={row.stars} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{row.stars}★</Text>
                  <View style={styles.ratingBarTrack}>
                    <View
                      style={[
                        styles.ratingBarFill,
                        {
                          width: `${row.percentage}%`,
                          backgroundColor: row.percentage >= 50 ? colors.primaryGreen : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingBarCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {SAMPLE_REVIEWS.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeaderRow}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{review.reviewer.charAt(0)}</Text>
                </View>
                <View style={styles.reviewHeaderText}>
                  <Text style={styles.reviewerName}>{review.reviewer}</Text>
                  <Text style={styles.reviewDate}>{formatDate(review.date)}</Text>
                </View>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </Text>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, styles.settingsCard]}>
          <View style={[styles.cardHeaderLeft, styles.settingsCardHeader]}>
            <Ionicons name="settings" size={16} color={colors.primaryGreen} />
            <Text style={styles.cardHeaderText}>Settings</Text>
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="moon" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Dark Mode</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: colors.primaryGreen }} />
          </View>
          <View style={styles.settingsDivider} />

          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="notifications" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: colors.primaryGreen }}
            />
          </View>
          <View style={styles.settingsDivider} />

          <TouchableOpacity style={styles.settingsRow} onPress={() => showComingSoon('Change Password')}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="lock-closed" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />

          <TouchableOpacity style={styles.settingsRow} onPress={() => showComingSoon('Language')}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="globe" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Language</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>English</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </View>
          </TouchableOpacity>
          <View style={styles.settingsDivider} />

          <TouchableOpacity style={styles.settingsRow} onPress={() => showComingSoon('Rate the App')}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="star" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Rate the App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />

          <TouchableOpacity style={styles.settingsRow} onPress={() => showComingSoon('Contact Support')}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="call" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={[styles.settingsRow, styles.settingsRowLast]}
            onPress={() => showComingSoon('Privacy Policy')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="document-text" size={16} color={colors.primaryGreen} />
              </View>
              <Text style={styles.settingsLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
      height: 220,
      paddingHorizontal: 20,
      paddingTop: 16,
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
      backgroundColor: colors.accentAmber,
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
    locationText: {
      fontSize: 13,
      color: '#FFFFFF',
      marginTop: 8,
    },
    memberSinceText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
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
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      margin: 16,
      marginTop: 0,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    cardHeaderText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    editButton: {
      borderWidth: 1,
      borderColor: colors.primaryGreen,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    editButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    infoRowLast: {
      paddingBottom: 0,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
    },
    activityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    activityBox: {
      width: '48%',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    activityValueGreen: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    activityValueAmber: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.accentAmber,
    },
    activityLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
      textAlign: 'center',
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    ratingOverviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    ratingBigNumber: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.accentAmber,
    },
    ratingBarsWrap: {
      flex: 1,
      gap: 4,
    },
    ratingBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ratingBarLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      width: 22,
    },
    ratingBarTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: 6,
      borderRadius: 3,
    },
    ratingBarCount: {
      fontSize: 11,
      color: colors.secondaryText,
      width: 18,
      textAlign: 'right',
    },
    reviewCard: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 12,
      marginTop: 4,
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
    reviewHeaderText: {
      flex: 1,
    },
    reviewerName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    reviewDate: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    reviewStars: {
      fontSize: 12,
      color: colors.accentAmber,
    },
    reviewComment: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 6,
      lineHeight: 18,
    },
    settingsCard: {
      padding: 8,
    },
    settingsCardHeader: {
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    settingsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 54,
      paddingHorizontal: 16,
    },
    settingsRowLast: {
      height: 54,
    },
    settingsRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingsRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    settingsIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsLabel: {
      fontSize: 14,
      color: colors.text,
    },
    settingsValue: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    settingsDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 16,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#DC2626',
      borderRadius: 16,
      height: 54,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 32,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

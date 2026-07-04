import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
  Animated,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Booking, ProduceBatch } from '../../types';
import { getMyBookings } from '../../api/bookingApi';
import { getMyBatches } from '../../api/produceApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileDropdownMenu from '../../components/ProfileDropdownMenu';
import ProfileTabs from '../../components/ProfileTabs';
import ActiveIndicator from '../../components/ActiveIndicator';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerProfileMain'>;

const TABS = ['About', 'Activity', 'Reviews'];

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
const SPECIALTY = 'Maize & Cassava';

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

export default function FarmerProfileScreen({ navigation }: Props) {
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
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [aboutText, setAboutText] = useState(BIO_TEXT);
  const [aboutEditVisible, setAboutEditVisible] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#062B14', '#0F4C24', '#1A6B2E', '#2E8B4A', '#7ED957']} style={styles.hero}>
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.7 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
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
              <Text style={styles.roleBadgeText}>FARMER</Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.locationText}>{locationLabel}</Text>
            </View>

            <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
          </BlurView>
        </LinearGradient>

        <View style={styles.tabsWrap}>
          <View style={styles.tabsHandle} />
          <ProfileTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === 'About' && (
          <View style={styles.premiumCardWrap}>
            <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
              <Text style={styles.aboutHeading}>About {user.fullName}</Text>
              <Text style={styles.aboutParagraph} numberOfLines={bioExpanded ? undefined : 2}>
                {aboutText}
              </Text>
              <Pressable onPress={() => setBioExpanded((prev) => !prev)}>
                <Text style={styles.readMoreText}>{bioExpanded ? 'Read Less' : 'Read More'}</Text>
              </Pressable>
              <TouchableOpacity
                style={styles.addDescriptionRow}
                onPress={() => { setAboutDraft(aboutText === BIO_TEXT ? '' : aboutText); setAboutEditVisible(true); }}
              >
                <View style={styles.aboutEditButton}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.addDescriptionText}>
                  {aboutText === BIO_TEXT ? 'Add a description about yourself' : 'Edit description'}
                </Text>
              </TouchableOpacity>

              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{initial}</Text>
                </View>
                <View style={styles.contactMiddle}>
                  <Text style={styles.contactName}>{user.fullName}</Text>
                  <Text style={styles.contactRole}>Farmer</Text>
                </View>
                <View style={styles.contactActions}>
                  <View>
                    <Pressable
                      style={styles.contactActionCircle}
                      onPress={() => navigation.navigate('Chat', { name: user.fullName, role: 'Farmer' })}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={colors.primaryGreen} />
                    </Pressable>
                    <View style={{ position: 'absolute', top: -4, right: -4 }}>
                      <ActiveIndicator size={8} />
                    </View>
                  </View>
                  <Pressable style={styles.contactActionCircle} onPress={() => showComingSoon('Calling')}>
                    <Ionicons name="call-outline" size={16} color={colors.primaryGreen} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.specsRow}>
                <View style={styles.specBox}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primaryGreen} />
                  <Text style={styles.specValue}>{memberSince}</Text>
                  <Text style={styles.specLabel}>Member Since</Text>
                </View>
                <View style={styles.specBox}>
                  <Ionicons name="leaf-outline" size={16} color={colors.primaryGreen} />
                  <Text style={styles.specValue}>{SPECIALTY}</Text>
                  <Text style={styles.specLabel}>Specialty</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {activeTab === 'Activity' && (
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
        )}

        {activeTab === 'Reviews' && (
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
        )}

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
        onLogout={handleLogout}
        loggingOut={loggingOut}
        extraItems={[
          { icon: 'ribbon-outline', label: 'My Certifications', onPress: () => showComingSoon('My Certifications') },
          { icon: 'bar-chart-outline', label: 'Season Report', onPress: () => showComingSoon('Season Report') },
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

      <Modal
        visible={aboutEditVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setAboutEditVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHandle} />
            <Text style={styles.infoModalTitle}>Edit About</Text>
            <TextInput
              style={styles.aboutTextInput}
              value={aboutDraft}
              onChangeText={setAboutDraft}
              multiline
              placeholder="Write something about yourself..."
              placeholderTextColor={colors.secondaryText}
              autoFocus
            />
            <View style={styles.aboutModalButtons}>
              <Pressable style={styles.aboutModalCancelButton} onPress={() => setAboutEditVisible(false)}>
                <Text style={styles.aboutModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.aboutModalSaveButton}
                onPress={() => { setAboutText(aboutDraft.trim() || BIO_TEXT); setAboutEditVisible(false); }}
              >
                <Text style={styles.aboutModalSaveText}>Save</Text>
              </Pressable>
            </View>
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
      alignItems: 'center',
    },
    tabsHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accentAmber,
      marginBottom: 10,
    },
    aboutHeading: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    aboutEditButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addDescriptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addDescriptionText: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: '600',
      flex: 1,
    },
    aboutParagraph: {
      fontSize: 13,
      color: colors.secondaryText,
      lineHeight: 20,
    },
    readMoreText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentAmber,
      marginTop: 4,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      padding: 12,
      marginTop: 16,
      gap: 10,
    },
    contactAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactAvatarText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    contactMiddle: {
      flex: 1,
    },
    contactName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    contactRole: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 1,
    },
    contactActions: {
      flexDirection: 'row',
      gap: 8,
    },
    contactActionCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    specsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    specBox: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    specValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginTop: 6,
    },
    specLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
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
    aboutTextInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 100,
      maxHeight: 200,
      textAlignVertical: 'top',
      marginTop: 8,
    },
    aboutModalButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    aboutModalCancelButton: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aboutModalCancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    aboutModalSaveButton: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#1A6B2E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aboutModalSaveText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}

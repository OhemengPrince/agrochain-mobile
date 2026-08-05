import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Animated,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch, MarketplacePurchase, ProducePurchase, UserReview } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { getMyMarketplacePurchases, getMyProducePurchases } from '../../api/purchaseApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatDate, formatCurrency } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileSettingsList, { SettingsSection } from '../../components/ProfileSettingsList';
import ProfileTabs from '../../components/ProfileTabs';
import ActiveIndicator from '../../components/ActiveIndicator';
import UserAvatar from '../../components/UserAvatar';
import FloatToast from '../../components/FloatToast';
import { uploadImage } from '../../api/fileApi';
import { updatePhotoUrl, getUserReviews, getUserAverageRating } from '../../api/userApi';
import { useFocusEffect } from '@react-navigation/native';
import { getEarnings, EarningsSummary } from '../../api/earningsApi';
import { getFollowCounts } from '../../api/followApi';
import ActivitySubTabs from '../../components/ActivitySubTabs';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import RateAppModal from '../../components/RateAppModal';
import ContactSupportModal from '../../components/ContactSupportModal';
import MyCertificationsModal from '../../components/MyCertificationsModal';
import SeasonReportModal, { ReportStat } from '../../components/SeasonReportModal';
import ExportPreferencesModal from '../../components/ExportPreferencesModal';
import { filterByDateRange } from '../../utils/pdfReport';
import { getExportPreferences } from '../../utils/storage';
import { useReportPreview } from '../../hooks/useReportPreview';
import ReportPreviewModal from '../../components/ReportPreviewModal';
import { useHideTabBarWhen } from '../../hooks/useHideTabBarWhen';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerProfileMain'>;

const TABS = ['About', 'Activity', 'Reviews', 'Settings'];

function computeRatingBreakdown(reviews: UserReview[]): { stars: number; percentage: number; count: number }[] {
  const counts = [5, 4, 3, 2, 1].map((stars) => reviews.filter((r) => r.rating === stars).length);
  const max = Math.max(...counts, 1);
  return [5, 4, 3, 2, 1].map((stars, i) => ({
    stars,
    percentage: Math.round((counts[i] / max) * 100),
    count: counts[i],
  }));
}

const BIO_TEXT = 'Verified agri-buyer sourcing quality produce from Ghanaian farmers for export markets 🌍';
const SPECIALTY = 'Export Produce';

export default function BuyerProfileScreen({ navigation }: Props) {
  const { user, logout, updateUser } = useAuth();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastKey, setToastKey] = useState(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastKey((k) => k + 1);
  };

  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [aboutText, setAboutText] = useState(BIO_TEXT);
  const [aboutEditVisible, setAboutEditVisible] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [rateAppVisible, setRateAppVisible] = useState(false);
  const [contactSupportVisible, setContactSupportVisible] = useState(false);
  const [certificationsVisible, setCertificationsVisible] = useState(false);
  const [seasonReportVisible, setSeasonReportVisible] = useState(false);
  const [exportPreferencesVisible, setExportPreferencesVisible] = useState(false);
  const [marketplacePurchases, setMarketplacePurchases] = useState<MarketplacePurchase[]>([]);
  const [producePurchases, setProducePurchases] = useState<ProducePurchase[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getEarnings().then(r => setEarnings(r.data)).catch(() => {});
      if (user?.id) {
        getFollowCounts(user.id)
          .then(r => { setFollowerCount(r.data.followerCount); setFollowingCount(r.data.followingCount); })
          .catch(() => {});
        getUserReviews(user.id).then(setReviews).catch(() => {});
        getUserAverageRating(user.id)
          .then(r => { setAverageRating(r.averageRating); setTotalReviews(r.totalReviews); })
          .catch(() => {});
      }
    }, [user?.id])
  );

  const loadData = useCallback(async () => {
    const [data, mpPurchases, producePurchasesData] = await Promise.all([
      getProduceCatalogue({}),
      getMyMarketplacePurchases().catch(() => []),
      getMyProducePurchases().catch(() => []),
    ]);
    setBatches(data);
    setMarketplacePurchases(mpPurchases);
    setProducePurchases(producePurchasesData);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const reportPreview = useReportPreview();

  useHideTabBarWhen(
    navigation,
    changePasswordVisible ||
      rateAppVisible ||
      contactSupportVisible ||
      certificationsVisible ||
      seasonReportVisible ||
      exportPreferencesVisible ||
      !!reportPreview.report
  );

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, `${feature} is coming soon.`);
  };

  const handleShareApp = () => {
    Share.share({
      message: 'Join me on AgroChain — buy, sell and rent farm equipment across Ghana. Download the app today!',
    }).catch(() => {});
  };

  const handleGeneratePdfReport = async () => {
    const prefs = await getExportPreferences();
    const mp = filterByDateRange(marketplacePurchases, (p) => p.createdAt, prefs.dateRange);
    const pp = filterByDateRange(producePurchases, (p) => p.createdAt, prefs.dateRange);

    const toRow = (label: string, dateStr: string, amount: number) => ({
      label: prefs.includeDates ? `${label} (${formatDate(dateStr)})` : label,
      value: prefs.includePrices ? formatCurrency(amount) : '—',
    });

    reportPreview.showReportPreview(
      'Purchase History Report',
      `${user!.fullName} — ${mp.length + pp.length} order(s)`,
      [
        { title: 'Marketplace Purchases', rows: mp.map((p) => toRow(p.listingName, p.createdAt, p.totalAmount)) },
        { title: 'Produce Purchases', rows: pp.map((p) => toRow(p.cropName, p.createdAt, p.totalAmount)) },
      ]
    );
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
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    setAvatarUploading(true);
    try {
      const url = await uploadImage(localUri);
      await updatePhotoUrl(url);
      await updateUser({ profilePhotoUrl: url });
      showToast('Profile photo updated!', 'success');
    } catch {
      showToast('Failed to update photo. Try again.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const goToMyListings = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('BuyerMarket', { screen: 'MyMarketplaceListings' });
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

  // Real, distinct sellers this buyer has actually purchased from — derived
  // from actual purchase records, not just everyone with a listing in the
  // catalogue (which includes farmers this buyer has never bought from).
  const purchaseSellerNames = new Set<string>([
    ...marketplacePurchases.map((p) => p.sellerName),
    ...producePurchases.map((p) => p.farmerName),
  ]);
  const totalPurchases = marketplacePurchases.length + producePurchases.length;
  const totalSpent = marketplacePurchases.reduce((sum, p) => sum + p.totalAmount, 0)
    + producePurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const seasonReportStats: ReportStat[] = [
    { icon: 'cart-outline', label: 'Total Purchases', value: String(totalPurchases) },
    { icon: 'people-outline', label: 'Suppliers Purchased From', value: String(purchaseSellerNames.size) },
    { icon: 'storefront-outline', label: 'Marketplace Orders', value: String(marketplacePurchases.length) },
    { icon: 'leaf-outline', label: 'Produce Orders', value: String(producePurchases.length) },
    { icon: 'trending-up-outline', label: 'Total Spent', value: formatCurrency(totalSpent) },
  ];

  const styles = createStyles(colors);
  const hasPhotoUrl = !!user?.profilePhotoUrl?.startsWith?.('http');

  const settingsSections: SettingsSection[] = [
    {
      title: 'Profile',
      items: [
        { icon: 'person-outline', label: 'About', onPress: () => setActiveTab('About') },
        { icon: 'pulse-outline', label: 'Activity', onPress: () => setActiveTab('Activity') },
        { icon: 'star-outline', label: 'Reviews', onPress: () => setActiveTab('Reviews') },
      ],
    },
    {
      title: 'AgroChain Pro',
      items: [
        { icon: 'diamond-outline', label: 'Subscribe', badge: 'NEW', onPress: () => showComingSoon('Subscriptions') },
        { icon: 'card-outline', label: 'Payment Methods', onPress: () => showComingSoon('Payment Methods') },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'build-outline', label: 'Account Settings', onPress: () => navigation.navigate('Settings') },
        { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => setChangePasswordVisible(true) },
      ],
    },
    {
      title: 'Shopping',
      items: [
        { icon: 'pricetags-outline', label: 'My Listings', onPress: goToMyListings },
        { icon: 'ribbon-outline', label: 'My Certifications', onPress: () => setCertificationsVisible(true) },
        { icon: 'bar-chart-outline', label: 'Season Report', onPress: () => setSeasonReportVisible(true) },
        { icon: 'globe-outline', label: 'Export Preferences', onPress: () => setExportPreferencesVisible(true) },
        { icon: 'document-outline', label: 'My PDF Reports', onPress: handleGeneratePdfReport },
      ],
    },
    {
      title: 'App',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          right: <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: colors.primaryGreen }} />,
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          right: <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: colors.primaryGreen }} />,
        },
        { icon: 'star-outline', label: 'Rate the App', onPress: () => setRateAppVisible(true) },
        { icon: 'headset-outline', label: 'Contact Support', onPress: () => setContactSupportVisible(true) },
        { icon: 'share-social-outline', label: 'Share AgroChain', onPress: handleShareApp },
        {
          icon: 'log-out-outline',
          label: 'Log Out',
          destructive: true,
          onPress: handleLogout,
          right: loggingOut ? <ActivityIndicator size="small" color={colors.errorRed} /> : undefined,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          {hasPhotoUrl && (
            <Image source={{ uri: user!.profilePhotoUrl! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <LinearGradient
            colors={hasPhotoUrl
              ? ['rgba(4,14,8,0.20)', 'rgba(7,26,13,0.55)', 'rgba(7,26,13,0.92)']
              : ['#071A0D', '#0D3318', '#1A6B2E']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.heroBubble1} pointerEvents="none" />
          <View style={styles.heroBubble2} pointerEvents="none" />

          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.settingsIconButton} onPress={handlePickAvatar} disabled={avatarUploading}>
                {avatarUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera-outline" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroSpacer} />

          <View style={styles.nameBlock}>
            <Text style={styles.name}>{user.fullName}</Text>
            {user.isVerified && (
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={13} color="#4ADE80" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>🛒 AGRI-BUYER</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{locationLabel}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>Since {memberSince}</Text>
          </View>

          <View style={styles.statsStrip}>
            <Pressable
              style={styles.statItem}
              onPress={() => user?.id && navigation.navigate('FollowList', { userId: user.id, type: 'followers', userName: user.fullName })}
            >
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable
              style={styles.statItem}
              onPress={() => user?.id && navigation.navigate('FollowList', { userId: user.id, type: 'following', userName: user.fullName })}
            >
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8 ⭐</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabsWrap}>
          <View style={styles.tabsHandle} />
          <ProfileTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === 'About' && (
          <View style={styles.premiumCardWrap}>
            <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
              <Text style={styles.aboutHeading}>About {user.fullName}</Text>
              {!aboutEditVisible ? (
                <>
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
                </>
              ) : (
                <View style={styles.aboutEditorBox}>
                  <Text style={styles.aboutEditorLabel}>Describe yourself in 1–2 sentences</Text>
                  <TextInput
                    style={styles.aboutTextInput}
                    value={aboutDraft}
                    onChangeText={setAboutDraft}
                    multiline
                    placeholder="e.g. Verified agri-buyer sourcing quality produce..."
                    placeholderTextColor={colors.secondaryText}
                    autoFocus
                    maxLength={300}
                  />
                  <Text style={styles.aboutCharCount}>{aboutDraft.length}/300</Text>
                  <View style={styles.aboutModalButtons}>
                    <Pressable style={styles.aboutModalCancelButton} onPress={() => setAboutEditVisible(false)}>
                      <Text style={styles.aboutModalCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.aboutModalSaveButton}
                      onPress={() => { if (aboutDraft.trim()) setAboutText(aboutDraft.trim()); setAboutEditVisible(false); }}
                    >
                      <Text style={styles.aboutModalSaveText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{initial}</Text>
                </View>
                <View style={styles.contactMiddle}>
                  <Text style={styles.contactName}>{user.fullName}</Text>
                  <Text style={styles.contactRole}>Agri-Buyer</Text>
                </View>
              </View>

              <View style={styles.specsRow}>
                <View style={styles.specBox}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primaryGreen} />
                  <Text style={styles.specValue}>{memberSince}</Text>
                  <Text style={styles.specLabel}>Member Since</Text>
                </View>
                <View style={styles.specBox}>
                  <Ionicons name="cart-outline" size={16} color={colors.primaryGreen} />
                  <Text style={styles.specValue}>{SPECIALTY}</Text>
                  <Text style={styles.specLabel}>Specialty</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {activeTab === 'Activity' && (
          <ActivitySubTabs
            earnings={earnings}
            onWithdraw={() => navigation.navigate('Withdrawal')}
            onViewAllTransactions={() => navigation.navigate('TransactionHistory')}
          />
        )}


        {activeTab === 'Reviews' && (
          <View style={styles.premiumCardWrap}>
            <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
              <View style={styles.premiumHeaderRow}>
                <View style={[styles.premiumIconCircle, styles.premiumIconCircleAmber]}>
                  <Ionicons name="star-outline" size={18} color={colors.accentAmber} />
                </View>
                <Text style={styles.premiumHeaderText}>Reviews & Ratings</Text>
              </View>

              {reviews.length === 0 ? (
                <Text style={styles.emptyText}>No reviews yet.</Text>
              ) : (
                <>
                  <View style={styles.ratingOverviewBlock}>
                    <Text style={styles.ratingBigNumber}>{averageRating.toFixed(1)}</Text>
                    <View style={styles.ratingStarsRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={16}
                          color={i < Math.round(averageRating) ? colors.accentAmber : colors.border}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingCountText}>{totalReviews} review{totalReviews === 1 ? '' : 's'}</Text>
                  </View>

                  <View style={styles.ratingBarsWrap}>
                    {computeRatingBreakdown(reviews).map((row) => (
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

                  {reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCardOuter}>
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewHeaderRow}>
                          <View style={styles.reviewAvatar}>
                            <Text style={styles.reviewAvatarText}>{review.reviewerName.charAt(0)}</Text>
                          </View>
                          <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
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
                        {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </LinearGradient>
          </View>
        )}

        {activeTab === 'Settings' && <ProfileSettingsList sections={settingsSections} />}

      </ScrollView>
      </KeyboardAvoidingView>

      <FloatToast message={toastMsg} type={toastType} toastKey={toastKey} />

      <ChangePasswordModal visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)} />
      <RateAppModal visible={rateAppVisible} onClose={() => setRateAppVisible(false)} />
      <ContactSupportModal visible={contactSupportVisible} onClose={() => setContactSupportVisible(false)} />
      <MyCertificationsModal visible={certificationsVisible} onClose={() => setCertificationsVisible(false)} />
      <ExportPreferencesModal visible={exportPreferencesVisible} onClose={() => setExportPreferencesVisible(false)} />
      <ReportPreviewModal
        report={reportPreview.report}
        downloading={reportPreview.downloading}
        onClose={reportPreview.closeReportPreview}
        onDownload={reportPreview.confirmDownload}
      />
      <SeasonReportModal
        visible={seasonReportVisible}
        onClose={() => setSeasonReportVisible(false)}
        title="Season Report"
        periodLabel={`As of ${formatDate(new Date().toISOString())}`}
        stats={seasonReportStats}
      />

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
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 28,
      alignItems: 'center',
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      overflow: 'hidden',
      minHeight: 380,
    },
    heroBubble1: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: 'rgba(255,255,255,0.04)',
      top: -80,
      right: -70,
    },
    heroBubble2: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.03)',
      bottom: 10,
      left: -55,
    },
    headerTopRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    settingsIconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    heroSpacer: {
      height: 56,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#1A6B2E',
      borderWidth: 2.5,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameBlock: {
      alignItems: 'center',
      marginBottom: 10,
    },
    name: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
      textAlign: 'center',
      marginBottom: 8,
    },
    verifiedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(74,222,128,0.15)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
    },
    verifiedText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#4ADE80',
    },
    rolePill: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },
    rolePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1.5,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 20,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    metaText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.72)',
    },
    metaDot: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.35)',
    },
    statsStrip: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 12,
      width: '100%',
      justifyContent: 'space-around',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    statLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.65)',
      marginTop: 3,
    },
    statDivider: {
      width: 1,
      height: 34,
      backgroundColor: 'rgba(255,255,255,0.18)',
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
    aboutEditorBox: {
      marginTop: 8,
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
    },
    aboutEditorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondaryText,
      marginBottom: 8,
    },
    aboutCharCount: {
      fontSize: 11,
      color: colors.secondaryText,
      textAlign: 'right',
      marginTop: 4,
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
      gap: 16,
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
    subscriptionCardWrap: {
      borderColor: 'rgba(255,143,0,0.35)',
      shadowColor: '#FF8F00',
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
    subscriptionHeaderText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accentAmber,
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
    purchaseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    purchaseEmoji: {
      fontSize: 24,
    },
    purchaseBody: {
      flex: 1,
    },
    purchaseCrop: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    purchaseQuantity: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondaryText,
    },
    purchaseMeta: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    purchaseAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    purchaseDivider: {
      height: 1,
      backgroundColor: colors.divider,
    },
    suppliersScroll: {
      gap: 12,
      paddingBottom: 4,
    },
    supplierCard: {
      width: 110,
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
    },
    supplierAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    supplierAvatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    supplierNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 8,
      maxWidth: '100%',
    },
    supplierName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    supplierCrop: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
    },
    supplierRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 4,
    },
    supplierRating: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    planName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.accentAmber,
    },
    benefitsList: {
      marginTop: 12,
      gap: 8,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    benefitText: {
      fontSize: 13,
      color: colors.text,
    },
    expiryText: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 12,
    },
    upgradeButton: {
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    upgradeButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
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
    earningsBalanceRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    earningsPendingBox: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#FFF9E6', borderRadius: 12 },
    earningsAvailBox: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#E8F5E9', borderRadius: 12 },
    earningsPendingLabel: { color: '#FF8F00', fontSize: 11, marginBottom: 4 },
    earningsPendingValue: { color: '#FF8F00', fontSize: 18, fontWeight: '700' },
    earningsAvailLabel: { color: '#1A6B2E', fontSize: 11, marginBottom: 4 },
    earningsAvailValue: { color: '#1A6B2E', fontSize: 18, fontWeight: '700' },
    earningsSubLabel: { color: '#9CA3AF', fontSize: 10, marginTop: 2 },
    earningsSummary: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12, marginBottom: 14 },
    earningsSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    earningsSummaryKey: { fontSize: 12, color: colors.secondaryText },
    earningsSummaryVal: { fontSize: 12, fontWeight: '600', color: colors.text },
    withdrawBtn: { backgroundColor: '#1A6B2E', borderRadius: 12, padding: 14, alignItems: 'center' },
    withdrawBtnDisabled: { backgroundColor: '#E5E7EB' },
    withdrawBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    withdrawBtnTextDisabled: { color: '#9CA3AF' },
    withdrawMinText: { color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginTop: 6 },
  });
}

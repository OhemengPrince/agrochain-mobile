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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileDropdownMenu from '../../components/ProfileDropdownMenu';
import ProfileTabs from '../../components/ProfileTabs';
import ActiveIndicator from '../../components/ActiveIndicator';
import UserAvatar from '../../components/UserAvatar';
import FloatToast from '../../components/FloatToast';
import { uploadImage } from '../../api/fileApi';
import { updatePhotoUrl } from '../../api/userApi';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerProfileMain'>;

const TABS = ['About', 'Activity', 'Reviews'];

// Illustrative placeholder data — this app has no backend model for produce
// purchases/orders made by a buyer, so this section is static demo content.
const RECENT_PURCHASES = [
  { id: 'p1', emoji: '🌽', crop: 'Maize', quantity: '500kg', farmer: 'Kwame Asante', date: '2026-03-15', amount: 'GHS 1,750' },
  { id: 'p2', emoji: '🍠', crop: 'Cassava', quantity: '300kg', farmer: 'Abena Owusu', date: '2026-03-02', amount: 'GHS 900' },
  { id: 'p3', emoji: '🍫', crop: 'Cocoa', quantity: '200kg', farmer: 'Kofi Mensah', date: '2026-02-20', amount: 'GHS 4,800' },
];

const BIO_TEXT = 'Verified agri-buyer sourcing quality produce from Ghanaian farmers for export markets 🌍';
const SPECIALTY = 'Export Produce';

interface Supplier {
  farmerName: string;
  cropName: string;
}

export default function BuyerProfileScreen({ navigation }: Props) {
  const { user, logout, updateUser } = useAuth();
  const { colors } = useTheme();
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

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [aboutText, setAboutText] = useState(BIO_TEXT);
  const [aboutEditVisible, setAboutEditVisible] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');

  const loadData = useCallback(async () => {
    const data = await getProduceCatalogue({});
    setBatches(data);
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

  const suppliers: Supplier[] = [];
  const seenFarmers = new Set<string>();
  for (const batch of batches) {
    if (!seenFarmers.has(batch.farmerName)) {
      seenFarmers.add(batch.farmerName);
      suppliers.push({ farmerName: batch.farmerName, cropName: batch.cropName });
    }
  }

  const styles = createStyles(colors);
  const hasPhotoUrl = !!user?.profilePhotoUrl?.startsWith?.('http');

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
              <TouchableOpacity style={styles.settingsIconButton} onPress={() => setDropdownVisible(true)}>
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
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
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{RECENT_PURCHASES.length}</Text>
              <Text style={styles.statLabel}>Purchases</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{suppliers.length}</Text>
              <Text style={styles.statLabel}>Suppliers</Text>
            </View>
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
                <View style={styles.contactActions}>
                  <View>
                    <Pressable style={styles.contactActionCircle} onPress={() => navigation.navigate('ChatRooms')}>
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
                  <Ionicons name="cart-outline" size={16} color={colors.primaryGreen} />
                  <Text style={styles.specValue}>{SPECIALTY}</Text>
                  <Text style={styles.specLabel}>Specialty</Text>
                </View>
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
                    <Ionicons name="cart-outline" size={18} color={colors.primaryGreen} />
                  </View>
                  <Text style={styles.premiumHeaderText}>Recent Purchases</Text>
                  <TouchableOpacity onPress={() => showComingSoon('All purchases')} style={styles.seeAllWrap}>
                    <View style={styles.seeAllRow}>
                      <Text style={styles.seeAllText}>See All</Text>
                      <Ionicons name="chevron-forward" size={12} color={colors.accentAmber} />
                    </View>
                  </TouchableOpacity>
                </View>

                {RECENT_PURCHASES.map((purchase, index) => (
                  <View key={purchase.id}>
                    <View style={styles.purchaseRow}>
                      <Text style={styles.purchaseEmoji}>{purchase.emoji}</Text>
                      <View style={styles.purchaseBody}>
                        <Text style={styles.purchaseCrop}>
                          {purchase.crop} <Text style={styles.purchaseQuantity}>· {purchase.quantity}</Text>
                        </Text>
                        <Text style={styles.purchaseMeta}>
                          {purchase.farmer} · {formatDate(purchase.date)}
                        </Text>
                      </View>
                      <Text style={styles.purchaseAmount}>{purchase.amount}</Text>
                    </View>
                    {index < RECENT_PURCHASES.length - 1 && <View style={styles.purchaseDivider} />}
                  </View>
                ))}
              </LinearGradient>
            </View>

            <View style={styles.premiumCardWrap}>
              <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
                <View style={styles.premiumHeaderRow}>
                  <View style={styles.premiumIconCircle}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryGreen} />
                  </View>
                  <Text style={styles.premiumHeaderText}>My Suppliers</Text>
                </View>

                {suppliers.length === 0 ? (
                  <Text style={styles.emptyText}>No suppliers yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suppliersScroll}>
                    {suppliers.slice(0, 8).map((supplier) => (
                      <View key={supplier.farmerName} style={styles.supplierCard}>
                        <View style={styles.supplierAvatar}>
                          <Text style={styles.supplierAvatarText}>{supplier.farmerName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.supplierNameRow}>
                          <Text style={styles.supplierName} numberOfLines={1}>{supplier.farmerName}</Text>
                          <Ionicons name="checkmark-circle" size={12} color={colors.primaryGreen} />
                        </View>
                        <Text style={styles.supplierCrop} numberOfLines={1}>{supplier.cropName}</Text>
                        <View style={styles.supplierRatingRow}>
                          <Ionicons name="star" size={11} color={colors.accentAmber} />
                          <Text style={styles.supplierRating}>4.8</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </LinearGradient>
            </View>

            <View style={[styles.premiumCardWrap, styles.subscriptionCardWrap]}>
              <LinearGradient colors={['rgba(255,143,0,0.04)', 'rgba(255,143,0,0.09)']} style={styles.premiumCardGradient}>
                <View style={styles.premiumHeaderRow}>
                  <View style={[styles.premiumIconCircle, styles.premiumIconCircleAmber]}>
                    <Ionicons name="star-outline" size={18} color={colors.accentAmber} />
                  </View>
                  <Text style={styles.subscriptionHeaderText}>Subscription Status</Text>
                </View>

                <View style={styles.planRow}>
                  <Text style={styles.planName}>Pro Buyer</Text>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primaryGreen} />
                </View>

                <View style={styles.benefitsList}>
                  {[
                    'Unlimited catalogue access',
                    'PDF compliance reports',
                    'Priority farmer contact',
                    'Market price alerts',
                  ].map((benefit) => (
                    <View key={benefit} style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primaryGreen} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.expiryText}>Valid until Dec 2026</Text>

                <TouchableOpacity onPress={() => showComingSoon('Upgrade plan')}>
                  <LinearGradient colors={[colors.accentAmber, '#E65100']} style={styles.upgradeButton}>
                    <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                  </LinearGradient>
                </TouchableOpacity>
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
              </View>
              <Text style={styles.emptyText}>No reviews yet.</Text>
            </LinearGradient>
          </View>
        )}

      </ScrollView>
      </KeyboardAvoidingView>

      <FloatToast message={toastMsg} type={toastType} toastKey={toastKey} />

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
          { icon: 'document-outline', label: 'My PDF Reports', onPress: () => showComingSoon('My PDF Reports') },
          { icon: 'globe-outline', label: 'Export Preferences', onPress: () => showComingSoon('Export Preferences') },
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

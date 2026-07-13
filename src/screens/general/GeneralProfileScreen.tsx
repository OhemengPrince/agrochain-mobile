import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
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
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GeneralStackParamList, MarketplaceListing } from '../../types';
import { getMyMarketplaceListings } from '../../api/produceApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileDropdownMenu from '../../components/ProfileDropdownMenu';
import PersonalInfoSheet from '../../components/PersonalInfoSheet';
import ProfileTabs from '../../components/ProfileTabs';
import ActiveIndicator from '../../components/ActiveIndicator';
import UserAvatar from '../../components/UserAvatar';
import FloatToast from '../../components/FloatToast';
import { uploadImage } from '../../api/fileApi';
import { updatePhotoUrl } from '../../api/userApi';

type Props = NativeStackScreenProps<GeneralStackParamList, 'GeneralProfileMain'>;

const TABS = ['About', 'Activity', 'Reviews'];

const BIO_TEXT = 'General AgroChain user buying and selling agricultural items';
const SPECIALTY = 'General Trading';

export default function GeneralProfileScreen({ navigation }: Props) {
  const { user, logout, updateUser } = useAuth();
  const { colors } = useTheme();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
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
    const data = await getMyMarketplaceListings();
    setListings(data);
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

  const goToMyListings = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate('GeneralMarket', { screen: 'MyMarketplaceListings' });
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
      await updateUser({ profileImageUrl: url });
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

  const activeListings = listings.filter((l) => l.status === 'ACTIVE').length;
  const totalInquiries = listings.reduce((sum, l) => sum + l.inquiriesCount, 0);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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
            <UserAvatar user={user} size={130} uploading={avatarUploading} borderWidth={3} borderColor="#fff" />
            <TouchableOpacity style={styles.cameraButton} onPress={handlePickAvatar} disabled={avatarUploading}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <BlurView intensity={45} tint="light" style={styles.glassCard}>
            <Text style={styles.name}>{user.fullName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>GENERAL USER</Text>
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
                    placeholder="e.g. General AgroChain user buying and selling..."
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
                  <Text style={styles.contactRole}>General User</Text>
                </View>
                <View style={styles.contactActions}>
                  <View>
                    <Pressable style={styles.contactActionCircle} onPress={() => navigation.navigate('Chat', { name: user.fullName, role: 'General User' })}>
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
                  <Ionicons name="pricetag-outline" size={16} color={colors.primaryGreen} />
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
                  <Ionicons name="pricetags-outline" size={18} color={colors.primaryGreen} />
                </View>
                <Text style={styles.premiumHeaderText}>My Listings</Text>
                <TouchableOpacity onPress={goToMyListings} style={styles.seeAllWrap}>
                  <View style={styles.seeAllRow}>
                    <Text style={styles.seeAllText}>See All</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.accentAmber} />
                  </View>
                </TouchableOpacity>
              </View>

              {listings.length === 0 ? (
                <Text style={styles.emptyText}>No listings yet.</Text>
              ) : (
                listings.slice(0, 3).map((listing, index) => (
                  <View key={listing.id}>
                    <View style={styles.listingRow}>
                      <View style={styles.listingIconCircle}>
                        <Ionicons name="cube-outline" size={18} color={colors.primaryGreen} />
                      </View>
                      <View style={styles.listingBody}>
                        <Text style={styles.listingName} numberOfLines={1}>{listing.name}</Text>
                        <Text style={styles.listingMeta}>{listing.status} · {formatDate(listing.createdAt)}</Text>
                      </View>
                      <Text style={styles.listingPrice}>GHS {listing.price}</Text>
                    </View>
                    {index < Math.min(listings.length, 3) - 1 && <View style={styles.listingDivider} />}
                  </View>
                ))
              )}
            </LinearGradient>
          </View>
        )}

        {activeTab === 'Reviews' && (
          <View style={styles.premiumCardWrap}>
            <LinearGradient colors={['rgba(26,107,46,0.03)', 'rgba(26,107,46,0.08)']} style={styles.premiumCardGradient}>
              <View style={styles.premiumHeaderRow}>
                <View style={styles.premiumIconCircle}>
                  <Ionicons name="star-outline" size={18} color={colors.primaryGreen} />
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
          {
            icon: 'ribbon-outline',
            label: 'My Listings',
            onPress: goToMyListings,
          },
          { icon: 'bar-chart-outline', label: 'Order History', onPress: () => showComingSoon('Order History') },
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
    listingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    listingIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listingBody: {
      flex: 1,
    },
    listingName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    listingMeta: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    listingPrice: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    listingDivider: {
      height: 1,
      backgroundColor: colors.divider,
    },
    aboutModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    aboutModalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 48,
    },
    aboutModalHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#E0E0E0',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    aboutModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
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

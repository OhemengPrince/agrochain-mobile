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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

type Props = NativeStackScreenProps<GeneralStackParamList, 'GeneralProfileMain'>;

const BIO_TEXT = 'General AgroChain user buying and selling agricultural items';

export default function GeneralProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const logoutScale = useRef(new Animated.Value(1)).current;

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const activeListings = listings.filter((l) => l.status === 'ACTIVE').length;
  const totalInquiries = listings.reduce((sum, l) => sum + l.inquiriesCount, 0);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#6A1B9A', '#8E24AA']} style={styles.header}>
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

          <Text style={styles.name}>{user.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>GENERAL USER</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>

          <Pressable style={styles.bioToggleRow} onPress={() => setBioExpanded((prev) => !prev)}>
            <Text style={styles.bioToggleLabel}>Bio</Text>
            <Ionicons
              name={bioExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#FFFFFF"
            />
          </Pressable>
          {bioExpanded && <Text style={styles.bioText}>{BIO_TEXT}</Text>}

          <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
        </LinearGradient>

        <View style={styles.premiumCardWrap}>
          <LinearGradient colors={['rgba(106,27,154,0.03)', 'rgba(106,27,154,0.08)']} style={styles.premiumCardGradient}>
            <View style={styles.premiumHeaderRow}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="pricetags-outline" size={18} color="#6A1B9A" />
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
                      <Ionicons name="cube-outline" size={18} color="#6A1B9A" />
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
    header: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 28,
      minHeight: 280,
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
      backgroundColor: '#6A1B9A',
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
      backgroundColor: '#6A1B9A',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 10,
    },
    roleBadge: {
      backgroundColor: '#4A148C',
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
    bioToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    bioToggleLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    bioText: {
      fontSize: 13,
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      maxWidth: 280,
      marginTop: 10,
    },
    memberSinceText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 8,
    },
    premiumCardWrap: {
      marginHorizontal: 16,
      marginTop: 20,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: 'rgba(106,27,154,0.15)',
      backgroundColor: colors.card,
      overflow: 'hidden',
      shadowColor: '#6A1B9A',
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
      backgroundColor: 'rgba(106,27,154,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#6A1B9A',
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
      backgroundColor: 'rgba(106,27,154,0.12)',
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
      color: '#6A1B9A',
    },
    listingDivider: {
      height: 1,
      backgroundColor: colors.divider,
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

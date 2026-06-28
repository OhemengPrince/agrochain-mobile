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
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getProduceCatalogue } from '../../api/produceApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProfileDropdownMenu from '../../components/ProfileDropdownMenu';
import PersonalInfoSheet from '../../components/PersonalInfoSheet';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerProfileMain'>;

// Illustrative placeholder data — this app has no backend model for produce
// purchases/orders made by a buyer, so this section is static demo content.
const RECENT_PURCHASES = [
  { id: 'p1', emoji: '🌽', crop: 'Maize', quantity: '500kg', farmer: 'Kwame Asante', date: '2026-03-15', amount: 'GHS 1,750' },
  { id: 'p2', emoji: '🍠', crop: 'Cassava', quantity: '300kg', farmer: 'Abena Owusu', date: '2026-03-02', amount: 'GHS 900' },
  { id: 'p3', emoji: '🍫', crop: 'Cocoa', quantity: '200kg', farmer: 'Kofi Mensah', date: '2026-02-20', amount: 'GHS 4,800' },
];

const BIO_TEXT = 'Verified agri-buyer sourcing quality produce from Ghanaian farmers for export markets 🌍';

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

interface Supplier {
  farmerName: string;
  cropName: string;
}

export default function BuyerProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);

  const logoutScale = useRef(new Animated.Value(1)).current;

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

  const suppliers: Supplier[] = [];
  const seenFarmers = new Set<string>();
  for (const batch of batches) {
    if (!seenFarmers.has(batch.farmerName)) {
      seenFarmers.add(batch.farmerName);
      suppliers.push({ farmerName: batch.farmerName, cropName: batch.cropName });
    }
  }

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={styles.header}>
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
            <Text style={styles.roleBadgeText}>AGRI-BUYER</Text>
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
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Purchases</Text>
          </PressableScale>
          <PressableScale style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueAmber]}>4.9 ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </PressableScale>
          <PressableScale style={styles.statCard}>
            <Text style={styles.statValue}>{suppliers.length || 8}</Text>
            <Text style={styles.statLabel}>Suppliers</Text>
          </PressableScale>
        </View>

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
          { icon: 'document-outline', label: 'My PDF Reports', onPress: () => showComingSoon('My PDF Reports') },
          { icon: 'globe-outline', label: 'Export Preferences', onPress: () => showComingSoon('Export Preferences') },
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
      width: 100,
      height: 100,
      borderRadius: 50,
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
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 10,
    },
    roleBadge: {
      backgroundColor: '#FF8F00',
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

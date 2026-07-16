import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MarketplaceStackParamList, MarketplaceListing, MarketplaceCategory } from '../../types';
import { getMarketplaceListingById } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { formatCurrency, formatDate, getCropEmoji } from '../../utils/formatters';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import FollowButton from '../../components/FollowButton';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MarketplaceListingDetail'>;

// Illustrative rating — there is no real rating data for marketplace sellers
// in this app yet, so this is a fixed demo value, consistent with how other
// screens (e.g. FarmerProfileScreen) present illustrative rating numbers.
const ILLUSTRATIVE_RATING = 4.7;

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  PRODUCE: 'PRODUCE',
  EQUIPMENT: 'EQUIPMENT',
  SEEDS: 'SEEDS',
  TOOLS: 'TOOLS',
  OTHER: 'OTHER',
};

const CATEGORY_ICONS: Record<Exclude<MarketplaceCategory, 'PRODUCE'>, keyof typeof Ionicons.glyphMap> = {
  EQUIPMENT: 'construct-outline',
  SEEDS: 'leaf-outline',
  TOOLS: 'hammer-outline',
  OTHER: 'cube-outline',
};

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
  };
}

function AnimatedIconButton({
  icon,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}>
      <Pressable
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Ionicons name={icon} size={20} color={color} />
      </Pressable>
    </Animated.View>
  );
}

function priceTypeLabel(listing: MarketplaceListing): string {
  if (listing.priceType === 'PER_DAY') return '/day';
  if (listing.priceType === 'NEGOTIABLE') return 'Negotiable';
  return '';
}

function contactPreferenceLabel(listing: MarketplaceListing): string {
  switch (listing.contactPreference) {
    case 'CALL':
      return 'a phone call';
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'IN_APP':
      return 'an in-app message';
    default:
      return 'a message';
  }
}

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { listingId } = route.params;
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMarketplaceListingById(listingId);
        setListing(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load listing.');
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  const handleShare = () => {
    if (!listing) return;
    Share.share({
      message: `Check out "${listing.name}" on AgroChain Marketplace — ${formatCurrency(listing.price)}${
        listing.priceType === 'PER_DAY' ? '/day' : ''
      }, listed by ${listing.sellerName} in ${listing.district}, ${listing.region}.`,
    }).catch(() => {});
  };

  const handleContactSeller = () => {
    if (!listing) return;
    navigation.navigate('Chat', { name: listing.sellerName, role: 'Seller', otherUserId: listing.sellerId });
  };

  const handleMakeOffer = () => {
    Alert.alert('Coming soon', 'Making an offer is not available yet.');
  };

  const contactButton = usePressAnimation();
  const offerButton = usePressAnimation();

  if (loading) {
    return <LoadingOverlay message="Loading listing..." />;
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Listing not found.'} />
      </SafeAreaView>
    );
  }

  const sellerInitial = listing.sellerName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.lightGreen }]}>
            {listing.category === 'PRODUCE' ? (
              <Text style={styles.heroEmoji}>{getCropEmoji(listing.name)}</Text>
            ) : (
              <Ionicons
                name={CATEGORY_ICONS[listing.category]}
                size={64}
                color={colors.primaryGreen}
              />
            )}
          </View>

          <View style={styles.floatingButton}>
            <AnimatedIconButton icon="arrow-back" color={colors.primaryGreen} onPress={() => navigation.goBack()} />
          </View>
          <View style={[styles.floatingButton, styles.shareButton]}>
            <AnimatedIconButton icon="share-outline" color={colors.primaryGreen} onPress={handleShare} />
          </View>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{listing.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[listing.category]}</Text>
            </View>
          </View>

          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{sellerInitial}</Text>
            </View>
            <View style={styles.sellerMiddle}>
              <Text style={styles.sellerName}>{listing.sellerName}</Text>
              <View style={styles.sellerMetaRow}>
                <Ionicons name="star" size={13} color={colors.accentAmber} />
                <Text style={styles.sellerMetaText}>{ILLUSTRATIVE_RATING.toFixed(1)} (illustrative)</Text>
              </View>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primaryGreen} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <FollowButton userId={listing.sellerId} />
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formatCurrency(listing.price)}</Text>
            {priceTypeLabel(listing) ? (
              <Text style={styles.priceTypeText}>{priceTypeLabel(listing)}</Text>
            ) : null}
          </View>

          <View style={styles.locationBlockRow}>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.secondaryText} />
              <Text style={styles.locationText}>{listing.district}, {listing.region}</Text>
            </View>
            <Pressable
              style={styles.viewMapBtn}
              onPress={() => navigation.navigate('Map', {
                title: listing.name,
                subtitle: listing.sellerName,
                district: listing.district,
                region: listing.region,
              })}
            >
              <Ionicons name="map" size={13} color={colors.primaryGreen} />
              <Text style={styles.viewMapText}>View on Map</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Description</Text>
            <Text style={styles.descriptionText}>{listing.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{CATEGORY_LABELS[listing.category]}</Text>
              </View>
              {listing.quantity ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{listing.quantity}</Text>
                </View>
              ) : null}
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Posted</Text>
                <Text style={styles.detailValue}>{formatDate(listing.createdAt)}</Text>
              </View>
            </View>
          </View>

          <ErrorMessage message={error} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Animated.View
          style={[
            styles.offerButtonWrap,
            { transform: [{ scale: offerButton.scale }], opacity: offerButton.opacity },
          ]}
        >
          <Pressable
            style={styles.offerButton}
            onPress={handleMakeOffer}
            onPressIn={offerButton.onPressIn}
            onPressOut={offerButton.onPressOut}
          >
            <Text style={styles.offerButtonText}>Make Offer</Text>
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.contactButtonWrap,
            { transform: [{ scale: contactButton.scale }], opacity: contactButton.opacity },
          ]}
        >
          <Pressable
            onPress={handleContactSeller}
            onPressIn={contactButton.onPressIn}
            onPressOut={contactButton.onPressOut}
          >
            <LinearGradient colors={[colors.primaryGreenLight, colors.primaryGreen]} style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Contact Seller</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    heroWrap: {
      width: '100%',
      height: 280,
      position: 'relative',
    },
    heroPlaceholder: {
      width: '100%',
      height: 280,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroEmoji: {
      fontSize: 96,
    },
    floatingButton: {
      position: 'absolute',
      top: 50,
      left: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      overflow: 'hidden',
    },
    shareButton: {
      left: undefined,
      right: 16,
    },
    contentCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -20,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    categoryBadge: {
      backgroundColor: colors.accentAmber,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    sellerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      padding: 14,
      marginTop: 16,
    },
    sellerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sellerAvatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
    sellerMiddle: {
      flex: 1,
      marginLeft: 12,
    },
    sellerName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    sellerMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    sellerMetaText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.lightGreen,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    verifiedBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 18,
    },
    priceText: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    priceTypeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    locationBlockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    locationText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    viewMapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewMapText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    section: {
      marginTop: 20,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primaryGreen,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 22,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    detailBox: {
      flexGrow: 1,
      minWidth: '30%',
      borderRadius: 14,
      backgroundColor: colors.inputBackground,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    offerButtonWrap: {
      flex: 1,
    },
    offerButton: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      backgroundColor: colors.card,
    },
    offerButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    contactButtonWrap: {
      flex: 1.3,
    },
    contactButton: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.white,
    },
  });
}

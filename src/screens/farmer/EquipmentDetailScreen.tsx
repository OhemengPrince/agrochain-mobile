import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Equipment, EquipmentCategory } from '../../types';
import { getEquipmentById } from '../../api/equipmentApi';
import { createBooking } from '../../api/bookingApi';
import { daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import StarRating from '../../components/StarRating';

type Props = NativeStackScreenProps<FarmerStackParamList, 'EquipmentDetail'>;

const EQUIPMENT_IMAGES: Record<EquipmentCategory, any> = {
  TRACTOR: require('../../assets/equipment/tractor.jpg'),
  HARVESTER: require('../../assets/equipment/harvester.jpg'),
  IRRIGATION_PUMP: require('../../assets/equipment/irrigation.jpg'),
  SPRAYER: require('../../assets/equipment/sprayer.jpg'),
  PLOUGH: require('../../assets/equipment/tiller.jpg'),
  TRAILER: require('../../assets/equipment/sheller.jpg'),
  OTHER: require('../../assets/equipment/tractor.jpg'),
};

const FEATURES = ['Well Maintained', 'Fuel Included', 'Operator Available', 'GPS Equipped'];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayPlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  style?: any;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function EquipmentDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { equipmentId } = route.params;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const startDate = todayPlusDays(1);
  const endDate = todayPlusDays(2);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEquipmentById(equipmentId);
        setEquipment(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load equipment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId]);

  const handleBook = async () => {
    setError(null);
    setBooking(true);
    try {
      const result = await createBooking({
        equipmentId,
        startDate,
        endDate,
      });
      navigation.navigate('BookingDetail', { bookingId: result.id });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create booking.');
    } finally {
      setBooking(false);
    }
  };

  const comingSoon = () => Alert.alert('Coming soon', 'This feature is not available yet.');

  const bookBar = useBookBarAnimation();

  if (loading) {
    return <LoadingOverlay message="Loading equipment..." />;
  }

  if (!equipment) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Equipment not found.'} />
      </SafeAreaView>
    );
  }

  const ratingValue = equipment.averageRating ?? 4.5;
  const total = equipment.dailyRate * daysBetween(startDate, endDate);
  const ownerInitial = equipment.ownerName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          <Image source={EQUIPMENT_IMAGES[equipment.category]} style={styles.heroImage} resizeMode="cover" />

          <View style={[styles.floatingButton, styles.backButton]}>
            <AnimatedIconButton
              icon="arrow-back"
              color={colors.primaryGreen}
              onPress={() => navigation.goBack()}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.topRightRow}>
            <View style={styles.floatingButton}>
              <AnimatedIconButton
                icon={saved ? 'heart' : 'heart-outline'}
                color={saved ? '#DC2626' : colors.primaryGreen}
                onPress={() => setSaved((prev) => !prev)}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.floatingButton}>
              <AnimatedIconButton
                icon="share-social-outline"
                color={colors.primaryGreen}
                onPress={comingSoon}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          >
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{equipment.category.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.heroName}>{equipment.name}</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{ownerInitial}</Text>
            </View>
            <View style={styles.ownerMiddle}>
              <Text style={styles.ownerName}>{equipment.ownerName}</Text>
              <View style={styles.verifiedRow}>
                <Text style={styles.verifiedText}>Verified Owner</Text>
                <Ionicons name="checkmark-circle" size={13} color={colors.primaryGreen} />
              </View>
              <StarRating rating={ratingValue} size={14} />
            </View>
            <View style={styles.ownerActions}>
              <OwnerActionButton icon="call" colors={colors} onPress={comingSoon} />
              <OwnerActionButton icon="chatbubble-outline" colors={colors} onPress={comingSoon} />
            </View>
          </View>

          <View style={styles.specsRow}>
            <View style={styles.specBox}>
              <Text style={styles.specEmoji}>💰</Text>
              <Text style={styles.specValueGreen}>GHS {equipment.dailyRate}</Text>
              <Text style={styles.specLabel}>Per Day</Text>
            </View>
            <View style={styles.specBox}>
              <Ionicons
                name={equipment.isAvailable ? 'checkmark-circle' : 'close-circle-outline'}
                size={20}
                color={equipment.isAvailable ? '#16A34A' : '#DC2626'}
              />
              <Text style={equipment.isAvailable ? styles.specValueGreen : styles.specValueRed}>
                {equipment.isAvailable ? 'Available' : 'Unavailable'}
              </Text>
              <Text style={styles.specLabel}>Status</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specEmoji}>⭐</Text>
              <Text style={styles.specValueAmber}>{ratingValue.toFixed(1)}</Text>
              <Text style={styles.specLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationTopRow}>
              <View style={styles.locationLeft}>
                <Ionicons name="location" size={16} color={colors.primaryGreen} />
                <Text style={styles.locationText}>
                  {equipment.district}, {equipment.region} Region
                </Text>
              </View>
              <Pressable onPress={comingSoon} style={styles.viewMapRow}>
                <Text style={styles.viewMapText}>View on Map</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primaryGreen} />
              </Pressable>
            </View>
            <Text style={styles.distanceText}>12.5 km from you</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>About this Equipment</Text>
            <Text style={styles.descriptionText}>{equipment.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Features & Specs</Text>
            <View style={styles.chipsRow}>
              {FEATURES.map((feature) => (
                <View key={feature} style={styles.chip}>
                  <Text style={styles.chipText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Availability</Text>
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day, index) => {
                const isWeekend = index === 5 || index === 6;
                return (
                  <View
                    key={day}
                    style={[styles.dayCell, isWeekend ? styles.dayCellAmber : styles.dayCellGreen]}
                  >
                    <Text style={styles.dayCellLabel}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Select Dates</Text>
            <View style={styles.datesRow}>
              <Pressable style={styles.dateBox} onPress={comingSoon}>
                <Ionicons name="calendar-outline" size={18} color={colors.primaryGreen} />
                <View style={styles.dateBoxTextWrap}>
                  <Text style={styles.dateBoxLabel}>Start Date</Text>
                  <Text style={styles.dateBoxValue}>{formatDisplayDate(startDate)}</Text>
                </View>
              </Pressable>
              <Pressable style={styles.dateBox} onPress={comingSoon}>
                <Ionicons name="calendar-outline" size={18} color={colors.primaryGreen} />
                <View style={styles.dateBoxTextWrap}>
                  <Text style={styles.dateBoxLabel}>End Date</Text>
                  <Text style={styles.dateBoxValue}>{formatDisplayDate(endDate)}</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.totalText}>Total: GHS {total}</Text>
          </View>

          <ErrorMessage message={error} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomPrice}>GHS {equipment.dailyRate}</Text>
            <Text style={styles.bottomPriceUnit}>/day</Text>
          </View>
        </View>
        <Animated.View
          style={[styles.bookButtonWrap, { transform: [{ scale: bookBar.scale }], opacity: bookBar.opacity }]}
        >
          <Pressable
            onPress={handleBook}
            onPressIn={bookBar.onPressIn}
            onPressOut={bookBar.onPressOut}
            disabled={booking || !equipment.isAvailable}
          >
            <LinearGradient
              colors={['#2E8B4A', '#1A6B2E']}
              style={[styles.bookButton, (booking || !equipment.isAvailable) && styles.bookButtonDisabled]}
            >
              <Text style={styles.bookButtonText}>
                {booking ? 'Booking...' : equipment.isAvailable ? 'Book Now' : 'Unavailable'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function useBookBarAnimation() {
  return usePressAnimation();
}

function OwnerActionButton({
  icon,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity, marginLeft: 8 }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.primaryGreen,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={16} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    heroWrap: {
      width: '100%',
      height: 280,
      position: 'relative',
    },
    heroImage: {
      width: '100%',
      height: 280,
    },
    floatingButton: {
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
    backButton: {
      position: 'absolute',
      top: 50,
      left: 16,
    },
    topRightRow: {
      position: 'absolute',
      top: 50,
      right: 16,
      flexDirection: 'row',
      gap: 10,
    },
    heroGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 40,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentAmber,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 8,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    heroName: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.white,
    },
    contentCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -20,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    ownerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.divider,
      padding: 14,
    },
    ownerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ownerAvatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.white,
    },
    ownerMiddle: {
      flex: 1,
      marginLeft: 12,
    },
    ownerName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    verifiedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      marginBottom: 4,
    },
    verifiedText: {
      fontSize: 12,
      color: colors.primaryGreen,
    },
    ownerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    specsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    specBox: {
      flex: 1,
      borderRadius: 14,
      backgroundColor: colors.inputBackground,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    specEmoji: {
      fontSize: 18,
      marginBottom: 4,
    },
    specValueGreen: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    specValueRed: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.errorRed,
    },
    specValueAmber: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.accentAmber,
    },
    specLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
    },
    locationCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    locationTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    locationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    locationText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    viewMapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewMapText: {
      fontSize: 12,
      color: colors.primaryGreen,
      fontWeight: '600',
    },
    distanceText: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 6,
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
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: colors.lightGreen,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    chipText: {
      fontSize: 12,
      color: colors.primaryGreen,
      fontWeight: '600',
    },
    weekRow: {
      flexDirection: 'row',
      gap: 6,
    },
    dayCell: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCellGreen: {
      backgroundColor: colors.lightGreen,
    },
    dayCellAmber: {
      backgroundColor: colors.lightAmber,
    },
    dayCellLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    datesRow: {
      flexDirection: 'row',
      gap: 10,
    },
    dateBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    dateBoxTextWrap: {
      flex: 1,
    },
    dateBoxLabel: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    dateBoxValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },
    totalText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primaryGreen,
      marginTop: 14,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    bottomPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    bottomPrice: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    bottomPriceUnit: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    bookButtonWrap: {
      width: '55%',
    },
    bookButton: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookButtonDisabled: {
      opacity: 0.5,
    },
    bookButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
  });
}

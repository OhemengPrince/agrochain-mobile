import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  FarmerStackParamList,
  OwnerStackParamList,
  Booking,
  Equipment,
} from '../../types';
import {
  getBookingById,
  getMyBookings,
  getIncomingBookings,
  confirmBooking,
  cancelBooking,
  completeBooking,
  submitReview,
} from '../../api/bookingApi';
import { getEquipmentById } from '../../api/equipmentApi';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate, daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import EquipmentImage from '../../components/EquipmentImage';

type Props = NativeStackScreenProps<FarmerStackParamList | OwnerStackParamList, 'BookingDetail'>;

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

interface PressableScaleProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}

function PressableScale({ onPress, style, children }: PressableScaleProps) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}>
      <Pressable style={style} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

type GlassVariant = 'primary' | 'danger' | 'message' | 'amber' | 'outline' | 'ghost';

const GLASS_VARIANTS: Record<GlassVariant, {
  gradient: [string, string];
  border: string;
  shadow: string;
  iconColor: string;
  textColor: string;
}> = {
  primary: {
    gradient: ['#1A6B2E', '#2E8B4A'],
    border: 'rgba(78,175,100,0.45)',
    shadow: '#1A6B2E',
    iconColor: '#fff',
    textColor: '#fff',
  },
  danger: {
    gradient: ['#DC2626', '#B91C1C'],
    border: 'rgba(248,113,113,0.4)',
    shadow: '#DC2626',
    iconColor: '#fff',
    textColor: '#fff',
  },
  message: {
    gradient: ['#1565C0', '#0D47A1'],
    border: 'rgba(96,165,250,0.4)',
    shadow: '#1565C0',
    iconColor: '#fff',
    textColor: '#fff',
  },
  amber: {
    gradient: ['#D97706', '#B45309'],
    border: 'rgba(251,191,36,0.4)',
    shadow: '#D97706',
    iconColor: '#fff',
    textColor: '#fff',
  },
  outline: {
    gradient: ['rgba(220,38,38,0.07)', 'rgba(220,38,38,0.04)'],
    border: 'rgba(220,38,38,0.5)',
    shadow: 'transparent',
    iconColor: '#DC2626',
    textColor: '#DC2626',
  },
  ghost: {
    gradient: ['rgba(26,107,46,0.08)', 'rgba(46,139,74,0.05)'],
    border: 'rgba(26,107,46,0.4)',
    shadow: 'transparent',
    iconColor: '#1A6B2E',
    textColor: '#1A6B2E',
  },
};

function GlassButton({
  onPress,
  label,
  icon,
  variant = 'primary',
  loading = false,
  fullWidth = true,
}: {
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: GlassVariant;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  const v = GLASS_VARIANTS[variant];
  const hasShadow = v.shadow !== 'transparent';
  return (
    <Animated.View style={[
      {
        transform: [{ scale }],
        borderRadius: 18,
        marginBottom: 12,
        ...(hasShadow ? {
          shadowColor: v.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 14,
          elevation: 8,
        } : {}),
      },
      fullWidth && { alignSelf: 'stretch' },
    ]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ borderRadius: 18, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={v.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 58,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: v.border,
            paddingHorizontal: 24,
            gap: 10,
          }}
        >
          {/* Glass sheen top highlight */}
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 28,
            backgroundColor: 'rgba(255,255,255,0.09)',
            borderTopLeftRadius: 17,
            borderTopRightRadius: 17,
          }} />
          {loading
            ? <ActivityIndicator size="small" color={v.iconColor} />
            : <Ionicons name={icon} size={20} color={v.iconColor} />
          }
          <Text style={{
            fontSize: 15,
            fontWeight: '700',
            color: v.textColor,
            letterSpacing: 0.3,
          }}>
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

type DerivedStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

function deriveStatus(booking: Booking): DerivedStatus {
  if (booking.status === 'CONFIRMED') {
    const today = new Date();
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    if (start <= today && today <= end) {
      return 'ACTIVE';
    }
    return 'CONFIRMED';
  }
  return booking.status;
}

function getBookingRef(booking: Booking): string {
  return `#BK-${String(booking.id).slice(-6).toUpperCase()}`;
}

export default function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isOwner = user?.role === 'EQUIPMENT_OWNER';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadBooking = async () => {
    setError(null);
    try {
      let found: Booking | null = null;
      try {
        found = await getBookingById(bookingId);
      } catch {
        // fallback to list if single-booking endpoint not available
        const list = isOwner ? await getIncomingBookings() : await getMyBookings();
        found = list.find((b) => b.id === bookingId) ?? null;
      }
      setBooking(found);
      if (found?.reviewed) setReviewSubmitted(true);
      if (found?.equipmentId) {
        try {
          const eq = await getEquipmentById(found.equipmentId);
          setEquipment(eq);
        } catch {
          setEquipment(null);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load booking.');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadBooking(); } finally { setLoading(false); }
    })();
  }, [bookingId]);

  const runAction = async (action: (id: string) => Promise<Booking>) => {
    setError(null);
    setActionLoading(true);
    try {
      const updated = await action(bookingId);
      setBooking(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlaceholder = (message: string) => {
    Alert.alert('Coming soon', message);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Add a rating', 'Please select a star rating before submitting.');
      return;
    }
    setReviewLoading(true);
    try {
      await submitReview({ bookingId, rating, comment: comment.trim() || undefined });
      setReviewModalVisible(false);
      setReviewSubmitted(true);
      setBooking(prev => prev ? { ...prev, reviewed: true } : prev);
      Alert.alert('Thank you!', 'Your review has been submitted.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading booking..." />;
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Booking not found.'} />
      </SafeAreaView>
    );
  }

  const derivedStatus = deriveStatus(booking);
  const bookingRef = getBookingRef(booking);
  const counterpartLabel = isOwner ? 'Farmer' : 'Owner';
  const counterpartName = isOwner ? booking.farmerName : booking.ownerName;
  const durationDays = daysBetween(booking.startDate, booking.endDate);

  const serviceFee = Math.round(booking.totalCost * 0.05 * 100) / 100;
  const rentalCost = Math.round((booking.totalCost - serviceFee) * 100) / 100;

  const paymentBadge = getPaymentBadgeMeta(booking.paymentStatus, colors);
  const statusBanner = getStatusBannerMeta(derivedStatus, booking, colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <Text style={styles.headerSubtitle}>{bookingRef}</Text>
        </View>
        <View style={styles.backButtonSpacer} />
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusBanner, { backgroundColor: statusBanner.background }]}>
          <Ionicons name={statusBanner.icon} size={28} color={colors.white} />
          <View style={styles.statusBannerTextWrap}>
            <Text style={styles.statusBannerTitle}>{statusBanner.title}</Text>
            <Text style={styles.statusBannerSubtitle}>{statusBanner.subtitle}</Text>
          </View>
        </View>

        <ErrorMessage message={error} />

        <View style={styles.card}>
          <EquipmentImage
            category={equipment?.category ?? 'OTHER'}
            imageUrl={equipment?.imageUrl}
            style={styles.equipmentImage}
            resizeMode="cover"
          />
          <View style={styles.equipmentBody}>
            <View style={styles.equipmentNameRow}>
              <Text style={styles.equipmentName}>{booking.equipmentName}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>Equipment</Text>
              </View>
            </View>
            <View style={styles.ownerRow}>
              <Ionicons name="person-circle-outline" size={18} color={colors.secondaryText} />
              <Text style={styles.ownerRowText}>
                {counterpartLabel}: <Text style={styles.ownerRowName}>{counterpartName}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridBox}>
            <Text style={styles.gridLabel}>Start Date</Text>
            <Text style={styles.gridValue}>{formatDate(booking.startDate)}</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridLabel}>End Date</Text>
            <Text style={styles.gridValue}>{formatDate(booking.endDate)}</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridLabel}>Duration</Text>
            <Text style={styles.gridValue}>{durationDays} days</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridLabel}>Total Amount</Text>
            <Text style={styles.gridValue}>{formatCurrency(booking.totalCost)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>Payment Status</Text>
            <View style={[styles.paymentBadge, { backgroundColor: paymentBadge.background }]}>
              <Text style={[styles.paymentBadgeText, { color: paymentBadge.color }]}>{paymentBadge.label}</Text>
            </View>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Rental Cost</Text>
            <Text style={styles.paymentValue}>{formatCurrency(rentalCost)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service Fee</Text>
            <Text style={styles.paymentValue}>{formatCurrency(serviceFee)}</Text>
          </View>
          <View style={[styles.paymentRow, styles.paymentTotalRow]}>
            <Text style={styles.paymentTotalLabel}>Total</Text>
            <Text style={styles.paymentTotalValue}>{formatCurrency(booking.totalCost)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Booking Timeline</Text>
          <Timeline booking={booking} derivedStatus={derivedStatus} colors={colors} />
        </View>

        <ErrorMessage message={error} />

        {derivedStatus === 'ACTIVE' && (
          <View style={styles.actionGroup}>
            <GlassButton
              variant="primary"
              icon="checkmark-circle-outline"
              label="Confirm Return"
              loading={actionLoading}
              onPress={() =>
                isOwner
                  ? runAction(completeBooking)
                  : handlePlaceholder('The owner will confirm the return shortly.')
              }
            />
            <GlassButton
              variant="ghost"
              icon="camera-outline"
              label="Upload Photos"
              onPress={() => handlePlaceholder('Photo upload will be available soon.')}
            />
          </View>
        )}

        {isOwner && booking.status === 'PENDING' && (
          <View style={styles.actionGroup}>
            <GlassButton
              variant="primary"
              icon="checkmark-done-outline"
              label="Confirm Booking"
              loading={actionLoading}
              onPress={() => runAction(confirmBooking)}
            />
          </View>
        )}
        {isOwner && booking.status === 'CONFIRMED' && (
          <View style={styles.actionGroup}>
            <GlassButton
              variant="primary"
              icon="trophy-outline"
              label="Mark as Completed"
              loading={actionLoading}
              onPress={() => runAction(completeBooking)}
            />
          </View>
        )}

        {booking.status === 'COMPLETED' && !reviewSubmitted && (
          <View style={styles.actionGroup}>
            <GlassButton
              variant="amber"
              icon="star-outline"
              label="Leave a Review"
              onPress={() => setReviewModalVisible(true)}
            />
          </View>
        )}

        <View style={styles.bottomActionsGroup}>
          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <GlassButton
              variant="danger"
              icon="log-out-outline"
              label="Cancel Booking"
              loading={actionLoading}
              onPress={() => runAction(cancelBooking)}
            />
          )}
          <GlassButton
            variant="message"
            icon="chatbubble-ellipses-outline"
            label={isOwner ? 'Message Farmer' : 'Message Owner'}
            onPress={() =>
              (navigation as any).navigate('Chat', {
                name: isOwner
                  ? (booking?.farmerName ?? 'Farmer')
                  : (booking?.ownerName ?? 'Equipment Owner'),
                role: isOwner ? 'Farmer' : 'Equipment Owner',
                otherUserId: isOwner ? booking?.farmerId : booking?.ownerId,
              })
            }
          />
          <GlassButton
            variant="outline"
            icon="warning-outline"
            label="Report Issue"
            onPress={() => handlePlaceholder('Issue reporting will be available soon.')}
          />
        </View>
      </ScrollView>

      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setReviewModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Rate your experience</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setReviewModalVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={colors.secondaryText} />
              </Pressable>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setRating(value)} hitSlop={8}>
                  <Ionicons
                    name={value <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={colors.accentAmber}
                    style={styles.starIcon}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Share a few words about your experience..."
              placeholderTextColor={colors.secondaryText}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />
            <GlassButton
              variant="amber"
              icon="send-outline"
              label="Submit Review"
              loading={reviewLoading}
              onPress={handleSubmitReview}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

interface TimelineProps {
  booking: Booking;
  derivedStatus: DerivedStatus;
  colors: ThemeColors;
}

interface TimelineStep {
  key: string;
  title: string;
  date?: string;
  state: 'done' | 'current' | 'pending';
}

function Timeline({ booking, derivedStatus, colors }: TimelineProps) {
  const styles = createStyles(colors);
  const isConfirmedOrLater =
    booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' || derivedStatus === 'ACTIVE';
  const isActiveOrLater = derivedStatus === 'ACTIVE' || booking.status === 'COMPLETED';
  const isCompleted = booking.status === 'COMPLETED';
  const isPaid = booking.paymentStatus === 'PAID';

  const steps: TimelineStep[] = [
    {
      key: 'created',
      title: 'Booking Created',
      date: formatDate(booking.createdAt),
      state: 'done',
    },
    {
      key: 'confirmed',
      title: 'Owner Confirmed',
      state: isConfirmedOrLater ? 'done' : 'pending',
    },
    {
      key: 'active',
      title: 'Rental Active',
      state: isCompleted ? 'done' : derivedStatus === 'ACTIVE' ? 'current' : 'pending',
    },
    {
      key: 'returned',
      title: 'Return Confirmed',
      state: isCompleted ? 'done' : 'pending',
    },
    {
      key: 'paid',
      title: 'Payment Released',
      state: isCompleted && isPaid ? 'done' : 'pending',
    },
  ];

  return (
    <View style={styles.timeline}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View key={step.key} style={styles.timelineRow}>
            <View style={styles.timelineDotColumn}>
              <View
                style={[
                  styles.timelineDot,
                  step.state === 'done' && styles.timelineDotDone,
                  step.state === 'current' && styles.timelineDotCurrent,
                  step.state === 'pending' && styles.timelineDotPending,
                ]}
              >
                {step.state === 'done' && <Ionicons name="checkmark" size={12} color={colors.white} />}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    step.state === 'done' ? styles.timelineLineDone : styles.timelineLinePending,
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineTextWrap}>
              <Text
                style={[
                  styles.timelineTitle,
                  step.state === 'pending' && styles.timelineTitlePending,
                ]}
              >
                {step.title}
              </Text>
              {step.date && <Text style={styles.timelineDate}>{step.date}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface StatusBannerMeta {
  background: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

function getStatusBannerMeta(status: DerivedStatus, booking: Booking, colors: ThemeColors): StatusBannerMeta {
  switch (status) {
    case 'CONFIRMED':
      return {
        background: '#1565C0',
        icon: 'checkmark-circle',
        title: 'Booking Confirmed',
        subtitle: `Your equipment is ready for pickup on ${formatDate(booking.startDate)}`,
      };
    case 'ACTIVE':
      return {
        background: colors.primaryGreen,
        icon: 'time',
        title: 'Rental In Progress',
        subtitle: `Return by ${formatDate(booking.endDate)}`,
      };
    case 'COMPLETED':
      return {
        background: '#6B7280',
        icon: 'trophy',
        title: 'Rental Completed',
        subtitle: 'Thank you for using AgroChain',
      };
    case 'PENDING':
      return {
        background: colors.accentAmber,
        icon: 'hourglass',
        title: 'Awaiting Confirmation',
        subtitle: 'The owner will confirm your booking shortly',
      };
    case 'REJECTED':
      return {
        background: '#DC2626',
        icon: 'close-circle',
        title: 'Booking Rejected',
        subtitle: 'The owner was unable to accept this booking',
      };
    case 'CANCELLED':
    default:
      return {
        background: '#DC2626',
        icon: 'close-circle',
        title: 'Booking Cancelled',
        subtitle: 'This booking has been cancelled',
      };
  }
}

interface PaymentBadgeMeta {
  label: string;
  color: string;
  background: string;
}

function getPaymentBadgeMeta(paymentStatus: Booking['paymentStatus'], colors: ThemeColors): PaymentBadgeMeta {
  switch (paymentStatus) {
    case 'PAID':
      return { label: 'Paid', color: '#1A6B2E', background: colors.lightGreen };
    case 'REFUNDED':
      return { label: 'Refunded', color: '#6B7280', background: '#F3F4F6' };
    case 'UNPAID':
    default:
      return { label: 'Unpaid', color: '#DC2626', background: '#FEE2E2' };
  }
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 56,
      paddingBottom: 18,
      paddingHorizontal: 16,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonSpacer: {
      width: 36,
    },
    headerTextWrap: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.white,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.white,
      opacity: 0.8,
      marginTop: 2,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 0,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    statusBannerTextWrap: {
      flex: 1,
    },
    statusBannerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.white,
    },
    statusBannerSubtitle: {
      fontSize: 13,
      color: colors.white,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      ...cardShadow,
    },
    equipmentImage: {
      width: '100%',
      height: 160,
    },
    equipmentBody: {
      padding: 14,
    },
    equipmentNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    equipmentName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    categoryBadge: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    ownerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    ownerRowText: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    ownerRowName: {
      color: colors.text,
      fontWeight: '700',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 10,
    },
    gridBox: {
      width: '48%',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    gridLabel: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    gridValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primaryGreen,
      marginTop: 4,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    cardHeading: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryGreen,
      padding: 16,
      paddingBottom: 8,
    },
    paymentBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    paymentBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    paymentLabel: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    paymentValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    paymentTotalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
      paddingBottom: 16,
    },
    paymentTotalLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    paymentTotalValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    timeline: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    timelineRow: {
      flexDirection: 'row',
    },
    timelineDotColumn: {
      alignItems: 'center',
      width: 28,
    },
    timelineDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineDotDone: {
      backgroundColor: colors.primaryGreen,
    },
    timelineDotCurrent: {
      backgroundColor: colors.primaryGreen,
      shadowColor: colors.primaryGreen,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 6,
    },
    timelineDotPending: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.border,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 24,
    },
    timelineLineDone: {
      backgroundColor: colors.primaryGreen,
    },
    timelineLinePending: {
      backgroundColor: colors.border,
    },
    timelineTextWrap: {
      flex: 1,
      paddingBottom: 20,
      paddingLeft: 10,
    },
    timelineTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    timelineTitlePending: {
      color: colors.secondaryText,
      fontWeight: '500',
    },
    timelineDate: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
    },
    actionGroup: {
      gap: 10,
      marginBottom: 8,
    },
    primaryActionButton: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },
    primaryActionButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
    outlineActionButton: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      flex: 1,
    },
    outlineActionButtonText: {
      color: colors.primaryGreen,
      fontSize: 16,
      fontWeight: '700',
    },
    bottomActionsGroup: {
      gap: 12,
      marginTop: 16,
      marginBottom: 32,
    },
    gradientButtonShadow: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
      borderRadius: 16,
    },
    gradientButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      paddingHorizontal: 16,
    },
    gradientButtonIcon: {
      marginRight: 8,
    },
    gradientButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    dangerOutlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: '#DC2626',
    },
    dangerOutlineButtonText: {
      color: '#DC2626',
      fontSize: 16,
      fontWeight: '700',
    },
    button: {
      marginTop: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginLeft: 28,
    },
    modalCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBackground,
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 16,
    },
    starIcon: {
      marginHorizontal: 4,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      minHeight: 90,
      textAlignVertical: 'top',
      color: colors.text,
      fontSize: 14,
      marginBottom: 16,
    },
  });
}

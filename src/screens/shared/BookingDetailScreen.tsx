import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Animated,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  FarmerStackParamList,
  OwnerStackParamList,
  Booking,
} from '../../types';
import {
  getMyBookings,
  getIncomingBookings,
  confirmBooking,
  cancelBooking,
  completeBooking,
  submitReview,
} from '../../api/bookingApi';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate, daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import AppButton from '../../components/AppButton';

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

function GradientActionButton({
  onPress,
  label,
  icon,
  gradient,
  height,
  shadowColor,
  styles,
}: {
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  height: number;
  shadowColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[styles.gradientButtonShadow, { shadowColor, transform: [{ scale }] }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient colors={gradient} style={[styles.gradientButton, { height }]}>
          <Ionicons name={icon} size={20} color="#FFFFFF" style={styles.gradientButtonIcon} />
          <Text style={styles.gradientButtonText}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function OutlineDangerButton({
  onPress,
  label,
  icon,
  styles,
}: {
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={styles.dangerOutlineButton} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Ionicons name={icon} size={18} color="#DC2626" style={styles.gradientButtonIcon} />
        <Text style={styles.dangerOutlineButtonText}>{label}</Text>
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
  return `#BK-${booking.id.slice(-6).toUpperCase()}`;
}

export default function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isOwner = user?.role === 'EQUIPMENT_OWNER';
  const [booking, setBooking] = useState<Booking | null>(null);
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
      const list = isOwner ? await getIncomingBookings() : await getMyBookings();
      const found = list.find((b) => b.id === bookingId) ?? null;
      setBooking(found);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load booking.');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBooking();
      setLoading(false);
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
          <Image
            source={require('../../assets/equipment/tractor.jpg')}
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
            <PressableScale
              style={[styles.primaryActionButton, { backgroundColor: colors.primaryGreen }]}
              onPress={() =>
                isOwner
                  ? runAction(completeBooking)
                  : handlePlaceholder('The owner will confirm the return shortly.')
              }
            >
              <Text style={styles.primaryActionButtonText}>Confirm Return</Text>
            </PressableScale>
            <PressableScale
              style={styles.outlineActionButton}
              onPress={() => handlePlaceholder('Photo upload will be available soon.')}
            >
              <Text style={styles.outlineActionButtonText}>Upload Photos</Text>
            </PressableScale>
          </View>
        )}

        {isOwner && booking.status === 'PENDING' && (
          <AppButton
            title="Confirm Booking"
            onPress={() => runAction(confirmBooking)}
            loading={actionLoading}
            style={styles.button}
          />
        )}
        {isOwner && booking.status === 'CONFIRMED' && (
          <AppButton
            title="Mark as Completed"
            onPress={() => runAction(completeBooking)}
            loading={actionLoading}
            style={styles.button}
          />
        )}

        {booking.status === 'COMPLETED' && !reviewSubmitted && (
          <PressableScale
            style={[styles.primaryActionButton, { backgroundColor: colors.accentAmber }]}
            onPress={() => setReviewModalVisible(true)}
          >
            <Text style={styles.primaryActionButtonText}>Leave a Review</Text>
          </PressableScale>
        )}

        <View style={styles.bottomActionsGroup}>
          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <GradientActionButton
              label="Cancel Booking"
              icon="log-out-outline"
              gradient={['#DC2626', '#991B1B']}
              height={56}
              shadowColor="#DC2626"
              styles={styles}
              onPress={() => runAction(cancelBooking)}
            />
          )}
          <GradientActionButton
            label="Contact Owner"
            icon="call"
            gradient={[colors.primaryGreen, colors.primaryGreenLight]}
            height={56}
            shadowColor={colors.primaryGreen}
            styles={styles}
            onPress={() => handlePlaceholder('You will be able to message the owner soon.')}
          />
          <OutlineDangerButton
            label="Report Issue"
            icon="warning-outline"
            styles={styles}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Rate your experience</Text>
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
            <AppButton
              title="Submit Review"
              onPress={handleSubmitReview}
              loading={reviewLoading}
              style={styles.button}
            />
          </View>
        </View>
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
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
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

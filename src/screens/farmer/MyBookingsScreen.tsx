import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  Pressable,
  Animated,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FarmerStackParamList, Booking, Equipment } from '../../types';
import { getMyBookings, cancelBooking, submitReview } from '../../api/bookingApi';
import { getEquipmentById } from '../../api/equipmentApi';
import { formatCurrency, formatDate, daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import EquipmentImage from '../../components/EquipmentImage';
import { getHiddenBookingIds, addHiddenBookingId } from '../../utils/storage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'FarmerBookingsList'>;

// Derived display status — the data model only has PENDING/CONFIRMED/CANCELLED/COMPLETED/REJECTED.
// We synthesize 'ACTIVE' client-side for CONFIRMED bookings whose date range covers today,
// and fold REJECTED into the same bucket as CANCELLED for filtering/display purposes.
type DisplayStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

function getDisplayStatus(booking: Booking): DisplayStatus {
  if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') return 'CANCELLED';
  if (booking.status === 'COMPLETED') return 'COMPLETED';
  if (booking.status === 'PENDING') return 'PENDING';
  if (booking.status === 'CONFIRMED') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(booking.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(booking.endDate);
    end.setHours(0, 0, 0, 0);
    if (start <= today && today <= end) return 'ACTIVE';
    return 'CONFIRMED';
  }
  return 'PENDING';
}

const STATUS_BADGE_META: Record<DisplayStatus, { label: string; bg: string }> = {
  PENDING: { label: 'PENDING', bg: '#FF8F00' },
  CONFIRMED: { label: 'CONFIRMED', bg: '#1565C0' },
  ACTIVE: { label: 'ACTIVE', bg: '#16A34A' },
  COMPLETED: { label: 'COMPLETED', bg: '#6B7280' },
  CANCELLED: { label: 'CANCELLED', bg: '#DC2626' },
};

type FilterKey = 'ALL' | DisplayStatus;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

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

function AnimatedButton({
  style,
  textStyle,
  label,
  onPress,
}: {
  style: any;
  textStyle: any;
  label: string;
  onPress: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity, flex: 1 }}>
      <Pressable style={style} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const DELETE_ACTION_WIDTH = 84;

function SwipeToDeleteRow({
  enabled,
  isOpen,
  onOpen,
  onClose,
  onDelete,
  styles,
  colors,
  children,
}: {
  enabled: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const resetSwipe = () => {
    openRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 300, friction: 26 }).start();
  };

  useEffect(() => {
    if (!isOpen && openRef.current) {
      resetSwipe();
    }
  }, [isOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enabled && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => {
        if (!openRef.current) onOpen();
      },
      onPanResponderMove: (_, gesture) => {
        const base = openRef.current ? -DELETE_ACTION_WIDTH : 0;
        const next = base + gesture.dx;
        translateX.setValue(Math.max(-DELETE_ACTION_WIDTH, Math.min(0, next)));
      },
      onPanResponderRelease: (_, gesture) => {
        const base = openRef.current ? -DELETE_ACTION_WIDTH : 0;
        const projected = base + gesture.dx;
        if (projected < -DELETE_ACTION_WIDTH / 2) {
          openRef.current = true;
          onOpen();
          Animated.spring(translateX, { toValue: -DELETE_ACTION_WIDTH, useNativeDriver: true, tension: 300, friction: 26 }).start();
        } else {
          resetSwipe();
          onClose();
        }
      },
    })
  ).current;

  if (!enabled) return <View style={styles.itemWrap}>{children}</View>;

  return (
    <View style={styles.itemWrap}>
      <View style={styles.swipeWrap}>
        <View style={styles.swipeDeleteAction}>
          <Pressable
            style={styles.swipeDeleteBtn}
            onPress={() => {
              resetSwipe();
              onClose();
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={24} color={colors.errorRed} />
            <Text style={[styles.swipeDeleteText, { color: colors.errorRed }]}>Delete</Text>
          </Pressable>
        </View>
        <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

function PremiumBookingCard({
  booking,
  equipment,
  styles,
  colors,
  onViewDetails,
  onCancel,
  onBrowseAgain,
  onLeaveReview,
}: {
  booking: Booking;
  equipment?: Equipment;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onViewDetails: () => void;
  onCancel: () => void;
  onBrowseAgain: () => void;
  onLeaveReview: () => void;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const displayStatus = getDisplayStatus(booking);
  const badgeMeta = STATUS_BADGE_META[displayStatus];
  const days = daysBetween(booking.startDate, booking.endDate);

  const handleConfirmReturn = () => {
    Alert.alert('Coming soon', 'Confirming returns will be available in a future update.');
  };

  const handleReportIssue = () => {
    Alert.alert('Coming soon', 'Reporting issues will be available in a future update.');
  };

  const renderActions = () => {
    switch (displayStatus) {
      case 'PENDING':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.outlineRedButton}
              textStyle={styles.outlineRedButtonText}
              label="Cancel"
              onPress={onCancel}
            />
            <AnimatedButton
              style={styles.filledGreenButton}
              textStyle={styles.filledGreenButtonText}
              label="View Details"
              onPress={onViewDetails}
            />
          </View>
        );
      case 'CONFIRMED':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.filledGreenButtonFull}
              textStyle={styles.filledGreenButtonText}
              label="View Details"
              onPress={onViewDetails}
            />
          </View>
        );
      case 'ACTIVE':
        return (
          <View style={styles.actionsRow}>
            <AnimatedButton
              style={styles.filledGreenButton}
              textStyle={styles.filledGreenButtonText}
              label="Confirm Return"
              onPress={handleConfirmReturn}
            />
            <AnimatedButton
              style={styles.outlineRedButton}
              textStyle={styles.outlineRedButtonText}
              label="Report Issue"
              onPress={handleReportIssue}
            />
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={styles.actionsRow}>
            {!booking.reviewed && (
              <AnimatedButton
                style={styles.filledAmberButton}
                textStyle={styles.filledAmberButtonText}
                label="Leave Review"
                onPress={onLeaveReview}
              />
            )}
            <AnimatedButton
              style={booking.reviewed ? styles.outlineGreenButtonFull : styles.outlineGreenButton}
              textStyle={styles.outlineGreenButtonText}
              label="Book Again"
              onPress={onBrowseAgain}
            />
          </View>
        );
      case 'CANCELLED':
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onViewDetails} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.topRow}>
          <EquipmentImage
            category={equipment?.category ?? 'OTHER'}
            imageUrl={equipment?.imageUrl}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.topRowMiddle}>
            <Text style={styles.equipmentName} numberOfLines={1}>{booking.equipmentName}</Text>
            <Text style={styles.ownerName} numberOfLines={1}>{booking.ownerName}</Text>
            <Text style={styles.dateRangeText}>
              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeMeta.bg }]}>
            <Text style={styles.statusBadgeText}>{badgeMeta.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoChipsRow}>
          <View style={styles.infoChip}>
            <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} />
            <Text style={styles.infoChipText}>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</Text>
          </View>
          <View style={styles.infoChip}>
            <Ionicons name="time-outline" size={12} color={colors.secondaryText} />
            <Text style={styles.infoChipText}>{days} days</Text>
          </View>
          <View style={styles.infoChip}>
            <Ionicons name="cash-outline" size={12} color={colors.primaryGreen} />
            <Text style={styles.infoChipCost}>{formatCurrency(booking.totalCost)}</Text>
          </View>
        </View>
      </Pressable>

      {renderActions()}
    </Animated.View>
  );
}

export default function MyBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [equipmentMap, setEquipmentMap] = useState<Record<string, Equipment>>({});
  const equipmentMapRef = useRef<Record<string, Equipment>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const closeReviewModal = () => {
    setReviewBookingId(null);
    setRating(0);
    setComment('');
  };

  const handleSubmitReview = async () => {
    if (!reviewBookingId) return;
    if (rating === 0) {
      Alert.alert('Add a rating', 'Please select a star rating before submitting.');
      return;
    }
    setReviewLoading(true);
    try {
      await submitReview({ bookingId: reviewBookingId, rating, comment: comment.trim() || undefined });
      setBookings((prev) => prev.map((b) => (b.id === reviewBookingId ? { ...b, reviewed: true } : b)));
      closeReviewModal();
      Alert.alert('Thank you!', 'Your review has been submitted.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteBooking = useCallback((bookingId: string) => {
    Alert.alert('Delete Booking', 'Remove this cancelled booking from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await addHiddenBookingId(bookingId);
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        },
      },
    ]);
  }, []);

  const loadBookings = useCallback(async () => {
    setError(null);
    try {
      const [data, hiddenIds] = await Promise.all([getMyBookings(), getHiddenBookingIds()]);
      const hiddenSet = new Set(hiddenIds);
      const visible = data.filter((b) => !hiddenSet.has(b.id));
      setBookings(visible);

      const uniqueIds = [...new Set(visible.map((b) => b.equipmentId).filter(Boolean))];
      const missingIds = uniqueIds.filter((id) => !(id in equipmentMapRef.current));
      if (missingIds.length > 0) {
        const results = await Promise.allSettled(missingIds.map((id) => getEquipmentById(id)));
        const next = { ...equipmentMapRef.current };
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') next[missingIds[i]] = r.value;
        });
        equipmentMapRef.current = next;
        setEquipmentMap(next);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load bookings.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadBookings(); } finally { setLoading(false); }
    })();
  }, [loadBookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await loadBookings(); } finally { setRefreshing(false); }
  };

  const goToEquipmentTab = useCallback(() => {
    const parent = navigation.getParent() as any;
    parent?.navigate('FarmerEquipment', { screen: 'FarmerEquipmentList' });
  }, [navigation]);

  const handleCancelBooking = useCallback(
    (bookingId: string) => {
      Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(bookingId);
              await loadBookings();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel booking.');
            }
          },
        },
      ]);
    },
    [loadBookings]
  );

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      ALL: bookings.length,
      PENDING: 0,
      CONFIRMED: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    bookings.forEach((b) => {
      const status = getDisplayStatus(b);
      result[status] += 1;
    });
    return result;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === 'ALL') return bookings;
    return bookings.filter((b) => getDisplayStatus(b) === filter);
  }, [bookings, filter]);

  if (loading) {
    return <LoadingOverlay message="Loading bookings..." />;
  }

  const filterLabel = FILTER_TABS.find((t) => t.key === filter)?.label ?? 'All';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>{bookings.length} total bookings</Text>
      </LinearGradient>

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {FILTER_TABS.map((tab) => {
            const active = tab.key === filter;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{counts[tab.key]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ErrorMessage message={error} />

      <FlatList
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        data={filteredBookings}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <SwipeToDeleteRow
            enabled={getDisplayStatus(item) === 'CANCELLED'}
            isOpen={openRowId === item.id}
            onOpen={() => setOpenRowId(item.id)}
            onClose={() => setOpenRowId((prev) => (prev === item.id ? null : prev))}
            onDelete={() => handleDeleteBooking(item.id)}
            styles={styles}
            colors={colors}
          >
            <PremiumBookingCard
              booking={item}
              equipment={equipmentMap[item.equipmentId]}
              styles={styles}
              colors={colors}
              onViewDetails={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
              onCancel={() => handleCancelBooking(item.id)}
              onBrowseAgain={goToEquipmentTab}
              onLeaveReview={() => setReviewBookingId(item.id)}
            />
          </SwipeToDeleteRow>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚜</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'ALL' ? 'No bookings yet' : `No ${filterLabel} bookings`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'ALL'
                ? 'Start by renting equipment near you'
                : 'Try a different filter or browse new equipment'}
            </Text>
            <TouchableOpacity style={styles.browseButton} onPress={goToEquipmentTab}>
              <Text style={styles.browseButtonText}>Browse Equipment</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={reviewBookingId !== null}
        animationType="slide"
        transparent
        onRequestClose={closeReviewModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={{ flex: 1 }} onPress={closeReviewModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Rate your experience</Text>
              <Pressable style={styles.modalCloseBtn} onPress={closeReviewModal} hitSlop={10}>
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
                    style={{ marginHorizontal: 4 }}
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
            <Pressable
              style={[styles.submitReviewBtn, reviewLoading && { opacity: 0.7 }]}
              onPress={handleSubmitReview}
              disabled={reviewLoading}
            >
              {reviewLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={16} color="#fff" />
                  <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    header: {
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 55 : 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.white,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.white,
      opacity: 0.8,
      marginTop: 4,
    },
    tabsWrap: {
      backgroundColor: colors.card,
    },
    tabsContent: {
      paddingHorizontal: 12,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primaryGreen,
    },
    tabText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    tabTextActive: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    tabBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    tabBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    list: {
      paddingTop: 14,
      paddingBottom: 120,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    thumbnail: {
      width: 70,
      height: 70,
      borderRadius: 12,
    },
    topRowMiddle: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    equipmentName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    ownerName: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    dateRangeText: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
    },
    statusBadge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 0.3,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 12,
    },
    infoChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    infoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    infoChipText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    infoChipCost: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    filledGreenButton: {
      flex: 1,
      backgroundColor: colors.primaryGreen,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filledGreenButtonFull: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filledGreenButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    outlineRedButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.errorRed,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    outlineRedButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.errorRed,
    },
    outlineGreenButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primaryGreen,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    outlineGreenButtonFull: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primaryGreen,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    outlineGreenButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    filledAmberButton: {
      flex: 1,
      backgroundColor: colors.accentAmber,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filledAmberButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    emptyState: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 56,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: 'center',
    },
    browseButton: {
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 20,
    },
    browseButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.white,
    },
    itemWrap: {
      marginHorizontal: 16,
      marginBottom: 14,
    },
    swipeWrap: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    swipeDeleteAction: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      width: DELETE_ACTION_WIDTH,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swipeDeleteBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      height: '100%',
    },
    swipeDeleteText: {
      fontSize: 11,
      fontWeight: '700',
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
      marginBottom: 20,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      height: 90,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    submitReviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.accentAmber,
    },
    submitReviewBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });
}

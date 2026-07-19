import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Alert,
  Modal, TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FarmerStackParamList, Equipment } from '../../types';
import { getEquipmentById } from '../../api/equipmentApi';
import { daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import StarRating from '../../components/StarRating';
import { getEquipmentImage } from '../../constants/equipmentImages';
import FollowButton from '../../components/FollowButton';
import PostEngagementBar from '../../components/PostEngagementBar';
import CommentsSheet from '../../components/CommentsSheet';
import { getLikedListingIds, setListingLiked, getItemComments } from '../../utils/storage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'EquipmentDetail'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FEATURES = ['Well Maintained', 'Fuel Included', 'Operator Available', 'GPS Equipped'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function todayPlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
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
    scale, opacity,
    onPressIn: () => animateTo(0.97, 0.95, 100),
    onPressOut: () => animateTo(1, 1, 150),
  };
}

function AnimatedIconButton({ icon, color, onPress, style }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void; style?: any;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// ImageViewerModal — full-screen image viewer with close button
// ─────────────────────────────────────────────────────────────
function ImageViewerModal({ visible, source, onClose }: {
  visible: boolean; source: any; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          activeOpacity={1}
        />
        <Image
          source={source}
          style={{ width: SCREEN_W, height: SCREEN_W * 0.85 }}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={{ position: 'absolute', top: 52, right: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 20 }}>Tap anywhere to close</Text>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// DatePickerModal — inline calendar sheet
// ─────────────────────────────────────────────────────────────
function DatePickerModal({ visible, onClose, onSelect, currentDate, minDate, title, colors, isDarkMode }: {
  visible: boolean; onClose: () => void; onSelect: (d: string) => void;
  currentDate: string; minDate: string; title: string;
  colors: ThemeColors; isDarkMode: boolean;
}) {
  const parsed = new Date(currentDate + 'T00:00:00');
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());
  const [selected, setSelected] = useState(currentDate);

  const sheetBg = isDarkMode ? '#1A1A1E' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#111827';
  const subColor = isDarkMode ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const divider = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0';

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar cells: Mon–Sun columns
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startPad = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: sheetBg, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.20)' : '#D1D5DB' }} />
        </View>

        <Text style={{ fontSize: 16, fontWeight: '800', color: textColor, textAlign: 'center', paddingVertical: 12, letterSpacing: 0.2 }}>{title}</Text>
        <View style={{ height: 1, backgroundColor: divider }} />

        {/* Month navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
          <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.primaryGreen} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: textColor }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={22} color={colors.primaryGreen} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: subColor }}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8 }}>
          {cells.map((dateStr, i) => {
            const isSelected = dateStr === selected;
            const isDisabled = !dateStr || dateStr < minDate;
            const isToday = dateStr === today;
            return (
              <TouchableOpacity
                key={i}
                style={{ width: `${100 / 7}%`, padding: 3 }}
                disabled={isDisabled}
                onPress={() => dateStr && setSelected(dateStr)}
                activeOpacity={0.7}
              >
                <View style={{
                  aspectRatio: 1, borderRadius: 100,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSelected ? colors.primaryGreen : isToday ? (isDarkMode ? 'rgba(11,110,54,0.25)' : 'rgba(11,110,54,0.10)') : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: colors.primaryGreen,
                }}>
                  <Text style={{
                    fontSize: 14, fontWeight: isSelected ? '800' : '500',
                    color: isSelected ? '#fff' : isDisabled ? (isDarkMode ? 'rgba(255,255,255,0.20)' : '#C0C0C0') : textColor,
                  }}>
                    {dateStr ? String(new Date(dateStr + 'T00:00:00').getDate()) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 1, backgroundColor: divider, marginBottom: 16 }} />

        {/* Selected date preview + confirm */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          <Text style={{ textAlign: 'center', fontSize: 13, color: subColor, marginBottom: 12 }}>
            Selected: <Text style={{ color: colors.primaryGreen, fontWeight: '700' }}>{formatDisplayDate(selected)}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => { onSelect(selected); onClose(); }}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={[colors.primaryGreen, '#1B8B50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Confirm Date</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <SafeAreaView edges={['bottom']} />
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────
export default function EquipmentDetailScreen({ route, navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const { equipmentId } = route.params;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);

  // Dates — now proper state so user can change them
  const [startDate, setStartDate] = useState(todayPlusDays(1));
  const [endDate, setEndDate] = useState(todayPlusDays(3));

  // Modal states
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, likedIds, comments] = await Promise.all([
          getEquipmentById(equipmentId),
          getLikedListingIds(),
          getItemComments(equipmentId),
        ]);
        setEquipment(data);
        setSaved(likedIds.includes(equipmentId));
        setCommentsCount(comments.length);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load equipment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId]);

  const handleToggleSaved = () => {
    const next = !saved;
    setSaved(next);
    setListingLiked(equipmentId, next).catch(() => {});
  };

  const handleBook = () => {
    if (!equipment) return;
    navigation.navigate('BookingPayment', {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      dailyRate: equipment.dailyRate,
      ownerId: equipment.ownerId ?? '',
      ownerName: equipment.ownerName ?? '',
      imageUrl: equipment.imageUrl,
      startDate,
      endDate,
    });
  };

  const bookBar = usePressAnimation();

  if (loading) return <LoadingOverlay message="Loading equipment..." />;

  if (!equipment) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Equipment not found.'} />
      </SafeAreaView>
    );
  }

  const ratingValue = equipment.averageRating ?? 4.5;
  const numDays = Math.max(daysBetween(startDate, endDate), 1);
  const total = equipment.dailyRate * numDays;
  const ownerInitial = equipment.ownerName?.charAt(0)?.toUpperCase() ?? '?';
  const equipmentImageSource = equipment.imageUrl?.startsWith('http')
    ? { uri: equipment.imageUrl }
    : (equipment.image ?? getEquipmentImage(equipment.category));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Hero image — tap to view full screen ── */}
        <View style={styles.heroWrap}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => setImageViewerVisible(true)}
            style={styles.heroImageTouchable}
          >
            <Image
              source={equipmentImageSource}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* Tap-to-view hint badge */}
            <View style={styles.viewPhotoBadge}>
              <Ionicons name="expand-outline" size={13} color="#fff" />
              <Text style={styles.viewPhotoBadgeText}>Tap to view</Text>
            </View>
          </TouchableOpacity>

          {/* Back button — properly inset */}
          <View style={[styles.floatingButton, styles.backButton, { top: insets.top + 10 }]}>
            <AnimatedIconButton
              icon="arrow-back"
              color={colors.primaryGreen}
              onPress={() => navigation.goBack()}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={[styles.topRightRow, { top: insets.top + 10 }]}>
            <View style={styles.floatingButton}>
              <AnimatedIconButton
                icon={saved ? 'heart' : 'heart-outline'}
                color={saved ? '#DC2626' : colors.primaryGreen}
                onPress={handleToggleSaved}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.floatingButton}>
              <AnimatedIconButton
                icon="share-social-outline"
                color={colors.primaryGreen}
                onPress={() => Alert.alert('Coming soon', 'Share feature coming soon.')}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </View>

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.heroGradient}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{equipment.category.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.heroName}>{equipment.name}</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentCard}>
          {/* Owner card */}
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
              <OwnerActionButton icon="call" colors={colors} onPress={() => Alert.alert('Coming soon', 'Call feature coming soon.')} />
              <OwnerActionButton
                icon="chatbubble-outline"
                colors={colors}
                onPress={() => {
                  console.log('[EquipmentDetail] Chat pressed → otherUserId:', equipment.ownerId);
                  navigation.navigate('Chat', { name: equipment.ownerName, role: 'Equipment Owner', otherUserId: equipment.ownerId });
                }}
              />
            </View>
          </View>

          {/* Engagement bar */}
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 }}>
            <PostEngagementBar
              liked={saved}
              onToggleLike={handleToggleSaved}
              commentsCount={commentsCount}
              onPressComment={() => setCommentsVisible(true)}
            />
          </View>

          {/* Follow strip */}
          <View style={styles.followStrip}>
            <FollowButton userId={equipment.ownerId} initialIsFollowing={(equipment as any).isFollowing} />
            <Text style={styles.followHint}>Follow to get notified of new listings</Text>
          </View>

          {/* Specs row */}
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

          {/* Location */}
          <View style={styles.locationCard}>
            <View style={styles.locationTopRow}>
              <View style={styles.locationLeft}>
                <Ionicons name="location" size={16} color={colors.primaryGreen} />
                <Text style={styles.locationText}>{equipment.district}, {equipment.region} Region</Text>
              </View>
              <Pressable
                style={styles.viewMapRow}
                onPress={() => navigation.navigate('Map', {
                  title: equipment.name, subtitle: 'Equipment',
                  district: equipment.district, region: equipment.region,
                })}
              >
                <Text style={styles.viewMapText}>View on Map</Text>
                <Ionicons name="map" size={12} color={colors.primaryGreen} />
              </Pressable>
            </View>
            <Text style={styles.distanceText}>12.5 km from you</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>About this Equipment</Text>
            <Text style={styles.descriptionText}>{equipment.description}</Text>
          </View>

          {/* Features */}
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

          {/* Availability calendar */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Availability</Text>
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day, index) => {
                const isWeekend = index === 5 || index === 6;
                return (
                  <View key={day} style={[styles.dayCell, isWeekend ? styles.dayCellAmber : styles.dayCellGreen]}>
                    <Text style={styles.dayCellLabel}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Date selection — now interactive ── */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Select Dates</Text>
            <View style={styles.datesRow}>
              <Pressable style={styles.dateBox} onPress={() => setDatePickerTarget('start')}>
                <View style={styles.dateBoxIconWrap}>
                  <Ionicons name="calendar" size={18} color={colors.primaryGreen} />
                </View>
                <View style={styles.dateBoxTextWrap}>
                  <Text style={styles.dateBoxLabel}>Start Date</Text>
                  <Text style={styles.dateBoxValue}>{formatDisplayDate(startDate)}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.primaryGreen} />
              </Pressable>
              <Pressable style={styles.dateBox} onPress={() => setDatePickerTarget('end')}>
                <View style={styles.dateBoxIconWrap}>
                  <Ionicons name="calendar" size={18} color={colors.primaryGreen} />
                </View>
                <View style={styles.dateBoxTextWrap}>
                  <Text style={styles.dateBoxLabel}>End Date</Text>
                  <Text style={styles.dateBoxValue}>{formatDisplayDate(endDate)}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.primaryGreen} />
              </Pressable>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{numDays} day{numDays !== 1 ? 's' : ''}</Text>
              <Text style={styles.totalText}>Total: GHS {total}</Text>
            </View>
          </View>

          <ErrorMessage message={error} />
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomPrice}>GHS {equipment.dailyRate}</Text>
            <Text style={styles.bottomPriceUnit}>/day</Text>
          </View>
          <Text style={styles.bottomDays}>{numDays} day{numDays !== 1 ? 's' : ''} · GHS {total}</Text>
        </View>
        <Animated.View style={[styles.bookButtonWrap, { transform: [{ scale: bookBar.scale }], opacity: bookBar.opacity }]}>
          <Pressable onPress={handleBook} onPressIn={bookBar.onPressIn} onPressOut={bookBar.onPressOut} disabled={!equipment.isAvailable}>
            <LinearGradient
              colors={['#2E8B4A', '#1A6B2E']}
              style={[styles.bookButton, !equipment.isAvailable && styles.bookButtonDisabled]}
            >
              <Text style={styles.bookButtonText}>
                {equipment.isAvailable ? 'Book Now' : 'Unavailable'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {/* ── Full-screen image viewer ── */}
      <ImageViewerModal
        visible={imageViewerVisible}
        source={equipmentImageSource}
        onClose={() => setImageViewerVisible(false)}
      />

      {/* ── Date pickers ── */}
      <DatePickerModal
        visible={datePickerTarget === 'start'}
        onClose={() => setDatePickerTarget(null)}
        title="Select Start Date"
        currentDate={startDate}
        minDate={todayPlusDays(1)}
        colors={colors}
        isDarkMode={isDarkMode}
        onSelect={(d) => {
          setStartDate(d);
          // push end date forward if it's no longer after start
          const newEnd = new Date(d + 'T00:00:00');
          newEnd.setDate(newEnd.getDate() + 1);
          const newEndStr = newEnd.toISOString().slice(0, 10);
          if (endDate <= d) setEndDate(newEndStr);
        }}
      />
      <DatePickerModal
        visible={datePickerTarget === 'end'}
        onClose={() => setDatePickerTarget(null)}
        title="Select End Date"
        currentDate={endDate}
        minDate={(() => { const d = new Date(startDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()}
        colors={colors}
        isDarkMode={isDarkMode}
        onSelect={(d) => setEndDate(d)}
      />
      <CommentsSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        itemId={equipmentId}
        itemTitle={equipment.name}
        itemSubtitle={`GHS ${equipment.dailyRate}/day`}
        itemImageUrl={equipment.imageUrl?.startsWith('http') ? equipment.imageUrl : undefined}
        itemEmoji="🚜"
        onCommentsCountChange={setCommentsCount}
      />
    </SafeAreaView>
  );
}

function OwnerActionButton({ icon, colors, onPress }: { icon: keyof typeof Ionicons.glyphMap; colors: ThemeColors; onPress: () => void; }) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity, marginLeft: 8 }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 24 },

    // ── Hero ──────────────────────────────────────────────────
    heroWrap: { width: '100%', height: 300, position: 'relative', backgroundColor: '#0A3D1F' },
    heroImageTouchable: { width: '100%', height: 300 },
    heroImage: { width: '100%', height: 300 },
    viewPhotoBadge: {
      position: 'absolute', bottom: 60, right: 14,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    viewPhotoBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
    // shared visual shell — NOT absolutely positioned by default
    floatingButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.white,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5,
      elevation: 5, overflow: 'hidden',
    },
    // only the back button is pulled out of flow
    backButton: { position: 'absolute', left: 16 },
    topRightRow: { position: 'absolute', right: 16, flexDirection: 'row', gap: 10 },
    heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 60 },
    categoryBadge: { alignSelf: 'flex-start', backgroundColor: colors.accentAmber, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
    categoryBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
    heroName: { fontSize: 22, fontWeight: '800', color: colors.white },

    // ── Content card ─────────────────────────────────────────
    contentCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingHorizontal: 20, paddingTop: 20 },

    // ── Owner ────────────────────────────────────────────────
    ownerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.divider, padding: 14 },
    ownerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
    ownerAvatarText: { fontSize: 18, fontWeight: '700', color: colors.white },
    ownerMiddle: { flex: 1, marginLeft: 12 },
    ownerName: { fontSize: 16, fontWeight: '700', color: colors.text },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 4 },
    verifiedText: { fontSize: 12, color: colors.primaryGreen },
    ownerActions: { flexDirection: 'row', alignItems: 'center' },

    // ── Follow strip ─────────────────────────────────────────
    followStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: 10,
      marginBottom: 6,
    },
    followHint: {
      flex: 1,
      fontSize: 12,
      color: colors.secondaryText,
    },

    // ── Specs ────────────────────────────────────────────────
    specsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    specBox: { flex: 1, borderRadius: 14, backgroundColor: colors.inputBackground, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    specEmoji: { fontSize: 18, marginBottom: 4 },
    specValueGreen: { fontSize: 16, fontWeight: '700', color: colors.primaryGreen },
    specValueRed: { fontSize: 14, fontWeight: '700', color: colors.errorRed },
    specValueAmber: { fontSize: 18, fontWeight: '700', color: colors.accentAmber },
    specLabel: { fontSize: 11, color: colors.secondaryText, marginTop: 2 },

    // ── Location ─────────────────────────────────────────────
    locationCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.divider },
    locationTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexShrink: 1, marginRight: 10 },
    locationText: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
    viewMapRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewMapText: { fontSize: 12, color: colors.primaryGreen, fontWeight: '600' },
    distanceText: { fontSize: 12, color: colors.secondaryText, marginTop: 6 },

    // ── Sections ─────────────────────────────────────────────
    section: { marginTop: 20 },
    sectionHeading: { fontSize: 15, fontWeight: '700', color: colors.primaryGreen, marginBottom: 10 },
    descriptionText: { fontSize: 14, color: colors.secondaryText, lineHeight: 22 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: colors.lightGreen, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    chipText: { fontSize: 12, color: colors.primaryGreen, fontWeight: '600' },

    // ── Availability calendar ────────────────────────────────
    weekRow: { flexDirection: 'row', gap: 6 },
    dayCell: { flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    dayCellGreen: { backgroundColor: colors.lightGreen },
    dayCellAmber: { backgroundColor: colors.lightAmber },
    dayCellLabel: { fontSize: 11, fontWeight: '700', color: colors.text },

    // ── Date pickers ─────────────────────────────────────────
    datesRow: { flexDirection: 'row', gap: 10 },
    dateBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.card, borderWidth: 1.5,
      borderColor: colors.primaryGreen, borderRadius: 14, padding: 12,
    },
    dateBoxIconWrap: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center',
    },
    dateBoxTextWrap: { flex: 1 },
    dateBoxLabel: { fontSize: 11, color: colors.secondaryText, fontWeight: '600' },
    dateBoxValue: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
    totalLabel: { fontSize: 13, color: colors.secondaryText, fontWeight: '600' },
    totalText: { fontSize: 18, fontWeight: '800', color: colors.primaryGreen },

    // ── Bottom bar ───────────────────────────────────────────
    bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
    bottomPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    bottomPrice: { fontSize: 20, fontWeight: '800', color: colors.primaryGreen },
    bottomPriceUnit: { fontSize: 13, color: colors.secondaryText },
    bottomDays: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    bookButtonWrap: { width: '52%' },
    bookButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    bookButtonDisabled: { opacity: 0.5 },
    bookButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
  });
}

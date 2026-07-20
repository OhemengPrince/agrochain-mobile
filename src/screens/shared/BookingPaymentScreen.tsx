import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, TextInput,
  Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FarmerStackParamList } from '../../types';
import { createBooking } from '../../api/bookingApi';
import { verifyBankAccount } from '../../api/earningsApi';
import { daysBetween } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { BANK_LOGOS, NETWORK_LOGOS } from '../../config/logoRegistry';
import { getApiErrorMessage } from '../../utils/apiError';

type Props = NativeStackScreenProps<FarmerStackParamList, 'BookingPayment'>;

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FEE_RATE = 0.05;
const GREEN = '#1A6B2E';
const GREEN2 = '#2E8B4A';

const NETWORKS = [
  { id: 'MTN', label: 'MTN MoMo', color: '#FFC107', logoKey: 'mtn' },
  { id: 'VODAFONE', label: 'Vodafone Cash', color: '#E53935', logoKey: 'vodafone' },
  { id: 'AIRTELTIGO', label: 'AirtelTigo Money', color: '#FF5722', logoKey: 'airteltigo' },
];

const GHANA_BANKS = [
  { code: '040100', name: 'GCB Bank', color: '#1A6B2E', logoKey: 'gcb' },
  { code: '030100', name: 'Absa Bank Ghana', color: '#DC2626', logoKey: 'absa' },
  { code: '017100', name: 'Ecobank Ghana', color: '#1565C0', logoKey: 'ecobank' },
  { code: '240100', name: 'Fidelity Bank Ghana', color: '#1565C0', logoKey: 'fidelity' },
  { code: '190100', name: 'Stanbic Bank Ghana', color: '#1565C0', logoKey: 'stanbic' },
  { code: '044100', name: 'Access Bank Ghana', color: '#FF6F00', logoKey: 'access' },
  { code: '057100', name: 'Zenith Bank Ghana', color: '#DC2626', logoKey: 'zenith' },
  { code: '340100', name: 'CAL Bank', color: '#1A6B2E', logoKey: 'cal' },
  { code: '033100', name: 'UBA Ghana', color: '#DC2626', logoKey: 'uba' },
  { code: '301100', name: 'Republic Bank Ghana', color: '#1565C0', logoKey: 'republic' },
  { code: '080100', name: 'Agricultural Development Bank', color: '#1A6B2E', logoKey: 'adb' },
  { code: '500100', name: 'National Investment Bank', color: '#1565C0', logoKey: 'nib' },
  { code: '180100', name: 'Prudential Bank', color: '#1565C0', logoKey: 'prudential' },
  { code: '170100', name: 'First Atlantic Bank', color: '#1565C0', logoKey: 'firstatlantic' },
  { code: '058100', name: 'GT Bank Ghana', color: '#FF6F00', logoKey: 'gtbank' },
  { code: '210100', name: 'Bank of Africa Ghana', color: '#DC2626', logoKey: 'boa' },
  { code: '023100', name: 'Consolidated Bank Ghana', color: '#1A6B2E', logoKey: 'cbg' },
  { code: '490100', name: 'OmniBank Ghana', color: '#7B1FA2', logoKey: 'omni' },
];

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Logo image with letter fallback ────────────────────────────────────────
function LogoImage({ logoKey, type, color, initial, size = 40, radius = 8 }: {
  logoKey: string; type: 'bank' | 'network'; color: string; initial: string; size?: number; radius?: number;
}) {
  const source = type === 'bank' ? BANK_LOGOS[logoKey] : NETWORK_LOGOS[logoKey];
  if (!source) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.round(size * 0.4) }}>{initial}</Text>
      </View>
    );
  }
  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: radius, resizeMode: 'contain', backgroundColor: '#fff' }}
    />
  );
}

// ─── Calendar date picker ────────────────────────────────────────────────────
function DatePickerModal({
  visible, onClose, title, currentDate, minDate, colors, isDarkMode, onSelect,
}: {
  visible: boolean; onClose: () => void; title: string; currentDate: string;
  minDate: string; colors: ThemeColors; isDarkMode: boolean; onSelect: (d: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(currentDate);

  useEffect(() => {
    if (visible) {
      const d = new Date(currentDate + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(currentDate);
    }
  }, [visible, currentDate]);

  const bgColor = isDarkMode ? '#1C1C1E' : '#fff';
  const textColor = isDarkMode ? '#F5F5F5' : '#1A1A1A';
  const subColor = isDarkMode ? '#8E8E93' : '#6B7280';
  const divider = isDarkMode ? '#2C2C2E' : '#E5E7EB';

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: bgColor, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: divider, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: textColor, textAlign: 'center', marginBottom: 20 }}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity onPress={prevMonth} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={18} color={GREEN} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '800', color: textColor }}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={18} color={GREEN} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 }}>
            {WEEK_DAYS.map(d => (
              <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: subColor, textTransform: 'uppercase' }}>{d}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - firstDayOfWeek + 1;
              const dateStr = dayNum >= 1 && dayNum <= daysInMonth
                ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : null;
              const isSelected = dateStr === selected;
              const isDisabled = dateStr !== null && dateStr < minDate;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={dateStr && !isDisabled ? 0.7 : 1}
                  onPress={() => { if (dateStr && !isDisabled) setSelected(dateStr); }}
                  style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? GREEN : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: 14, fontWeight: isSelected ? '800' : '400',
                      color: isSelected ? '#fff' : isDisabled ? (isDarkMode ? 'rgba(255,255,255,0.20)' : '#D0D0D0') : textColor,
                    }}>
                      {dateStr ? String(new Date(dateStr + 'T00:00:00').getDate()) : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 1, backgroundColor: divider, marginTop: 8, marginBottom: 16 }} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
            <Text style={{ textAlign: 'center', fontSize: 13, color: subColor, marginBottom: 14 }}>
              Selected: <Text style={{ color: GREEN, fontWeight: '800' }}>{formatDisplayDate(selected)}</Text>
            </Text>
            <TouchableOpacity onPress={() => { onSelect(selected); onClose(); }} activeOpacity={0.85} style={{ borderRadius: 18, overflow: 'hidden' }}>
              <LinearGradient colors={[GREEN, GREEN2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 54, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Confirm Date</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <SafeAreaView edges={['bottom']} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Bank picker modal ───────────────────────────────────────────────────────
function BankPickerModal({
  visible, onClose, onSelect, colors, isDarkMode,
}: {
  visible: boolean; onClose: () => void; onSelect: (bank: typeof GHANA_BANKS[0]) => void;
  colors: ThemeColors; isDarkMode: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = GHANA_BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const bg = isDarkMode ? '#1C1C1E' : '#fff';
  const textColor = isDarkMode ? '#F5F5F5' : '#1A1A1A';
  const subColor = isDarkMode ? '#8E8E93' : '#6B7280';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '82%' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDarkMode ? '#3C3C3E' : '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, marginBottom: 14 }}>Select Bank</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5', borderRadius: 14, paddingHorizontal: 12, height: 46 }}>
              <Ionicons name="search-outline" size={17} color={subColor} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search banks..."
                placeholderTextColor={subColor}
                style={{ flex: 1, marginLeft: 8, fontSize: 15, color: textColor }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color={subColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((bank, idx) => (
              <TouchableOpacity
                key={bank.code}
                onPress={() => { onSelect(bank); onClose(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 20, paddingVertical: 13,
                  borderBottomWidth: idx < filtered.length - 1 ? 1 : 0,
                  borderBottomColor: isDarkMode ? '#2C2C2E' : '#F0F0F0',
                }}
              >
                <LogoImage logoKey={bank.logoKey} type="bank" color={bank.color} initial={bank.name.charAt(0)} size={40} radius={10} />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>{bank.name}</Text>
                  <Text style={{ fontSize: 11, color: subColor, marginTop: 1 }}>Code: {bank.code}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={subColor} />
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
          <SafeAreaView edges={['bottom']} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
      {[1, 2, 3].map(s => (
        <View key={s} style={{
          width: s === step ? 24 : 8, height: 8, borderRadius: 4,
          backgroundColor: s <= step ? GREEN : '#D1D5DB',
        }} />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function BookingPaymentScreen({ route, navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const { equipmentId, equipmentName, dailyRate, ownerId, ownerName, imageUrl,
    startDate: initStart, endDate: initEnd } = route.params;

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [resultError, setResultError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: Dates ───────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);
  const [dateTarget, setDateTarget] = useState<'start' | 'end' | null>(null);

  // ── Step 2: Payment method ──────────────────────────────────────────────
  const [payMethod, setPayMethod] = useState<'MOMO' | 'BANK'>('MOMO');
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);
  const [selectedBank, setSelectedBank] = useState<typeof GHANA_BANKS[0] | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [accountInputFocused, setAccountInputFocused] = useState(false);

  const networkScaleAnim = useRef(new Animated.Value(1)).current;
  const phoneScaleAnim = useRef(new Animated.Value(1)).current;
  const bankScaleAnim = useRef(new Animated.Value(1)).current;
  const accountScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(networkScaleAnim, {
      toValue: showNetworkDropdown ? 1.025 : 1,
      useNativeDriver: true, tension: 280, friction: 14,
    }).start();
  }, [showNetworkDropdown]);

  const handlePhoneFocus = () => {
    setPhoneInputFocused(true);
    Animated.spring(phoneScaleAnim, { toValue: 1.025, useNativeDriver: true, tension: 280, friction: 14 }).start();
  };
  const handlePhoneBlur = () => {
    setPhoneInputFocused(false);
    Animated.spring(phoneScaleAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 14 }).start();
  };
  const handleBankOpen = () => {
    setShowBankModal(true);
    Animated.spring(bankScaleAnim, { toValue: 1.025, useNativeDriver: true, tension: 280, friction: 14 }).start();
  };
  const handleBankClose = () => {
    setShowBankModal(false);
    Animated.spring(bankScaleAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 14 }).start();
  };
  const handleAccountFocus = () => {
    setAccountInputFocused(true);
    Animated.spring(accountScaleAnim, { toValue: 1.025, useNativeDriver: true, tension: 280, friction: 14 }).start();
  };
  const handleAccountBlur = () => {
    setAccountInputFocused(false);
    Animated.spring(accountScaleAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 14 }).start();
  };

  const numDays = Math.max(daysBetween(startDate, endDate), 1);
  const subtotal = dailyRate * numDays;
  const fee = subtotal * FEE_RATE;
  const total = subtotal + fee;

  useEffect(() => {
    if (payMethod === 'BANK' && selectedBank && accountNumber.length >= 10) {
      setVerifyingBank(true);
      setAccountName('');
      verifyBankAccount(selectedBank.code, accountNumber)
        .then(r => setAccountName(r.data?.accountName ?? ''))
        .catch(() => setAccountName(''))
        .finally(() => setVerifyingBank(false));
    } else {
      setAccountName('');
    }
  }, [payMethod, selectedBank, accountNumber]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await createBooking({ equipmentId, startDate, endDate });
      setBookingId(result.id);
      setResultSuccess(true);
      setStep(4);
    } catch (err: any) {
      setResultError(getApiErrorMessage(err, 'Payment failed. Please try again.'));
      setResultSuccess(false);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    const receiptText =
      `AgroChain — Booking Receipt\n` +
      `────────────────────────────\n` +
      `Booking ID: ${bookingId}\n` +
      `Equipment: ${equipmentName}\n` +
      `Owner: ${ownerName}\n` +
      `Start Date: ${formatDisplayDate(startDate)}\n` +
      `End Date: ${formatDisplayDate(endDate)}\n` +
      `Duration: ${numDays} day${numDays !== 1 ? 's' : ''}\n` +
      `Daily Rate: ${formatCurrency(dailyRate)}\n` +
      `Rental Cost: ${formatCurrency(subtotal)}\n` +
      `AgroChain Fee (5%): ${formatCurrency(fee)}\n` +
      `────────────────────────────\n` +
      `Total Paid: ${formatCurrency(total)}\n` +
      `Payment Method: ${paymentDesc}\n`;
    try {
      await Share.share({ message: receiptText, title: 'Booking Receipt' });
    } catch {
      // ignore
    }
  };

  const canProceedStep2 = () => {
    if (payMethod === 'MOMO') return phoneNumber.length >= 10;
    return !!selectedBank && accountNumber.length >= 10;
  };

  const ownerInitial = ownerName?.charAt(0)?.toUpperCase() ?? '?';

  // ── Step 1 UI ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>

      {/* Equipment card */}
      <View style={styles.equipCard}>
        <View style={styles.equipAvatar}>
          <Text style={{ fontSize: 28 }}>🚜</Text>
        </View>
        <View style={styles.equipMiddle}>
          <Text style={styles.equipName} numberOfLines={2}>{equipmentName}</Text>
          <Text style={styles.equipOwner}>Owner: {ownerName}</Text>
          <Text style={styles.equipRate}>{formatCurrency(dailyRate)} / day</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Select Rental Dates</Text>

      <View style={styles.datesRow}>
        <TouchableOpacity style={styles.dateBox} onPress={() => setDateTarget('start')} activeOpacity={0.8}>
          <View style={styles.dateBoxIcon}>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryGreen} />
          </View>
          <View style={styles.dateBoxText}>
            <Text style={styles.dateBoxLabel}>Start Date</Text>
            <Text style={styles.dateBoxValue}>{formatDisplayDate(startDate)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateBox} onPress={() => setDateTarget('end')} activeOpacity={0.8}>
          <View style={styles.dateBoxIcon}>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryGreen} />
          </View>
          <View style={styles.dateBoxText}>
            <Text style={styles.dateBoxLabel}>End Date</Text>
            <Text style={styles.dateBoxValue}>{formatDisplayDate(endDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.costSummaryCard}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Duration</Text>
          <Text style={styles.costValue}>{numDays} day{numDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Daily Rate</Text>
          <Text style={styles.costValue}>{formatCurrency(dailyRate)}</Text>
        </View>
        <View style={[styles.costRow, styles.costTotal]}>
          <Text style={styles.costTotalLabel}>Estimated Total</Text>
          <Text style={styles.costTotalValue}>{formatCurrency(subtotal)}</Text>
        </View>
      </View>

      <Text style={styles.noteText}>* AgroChain fee (5%) will be shown at confirmation.</Text>
    </ScrollView>
  );

  // ── Step 2 UI ──────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={styles.sectionLabel}>How would you like to pay?</Text>

        {/* Payment method tabs */}
        <View style={styles.tabRow}>
          {(['MOMO', 'BANK'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, payMethod === tab && styles.tabActive]}
              onPress={() => setPayMethod(tab)}
              activeOpacity={0.85}
            >
              {payMethod === tab && (
                <LinearGradient
                  colors={[GREEN, GREEN2]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              )}
              <Ionicons
                name={tab === 'MOMO' ? 'phone-portrait' : 'card'}
                size={18}
                color={payMethod === tab ? '#fff' : colors.secondaryText}
              />
              <Text style={[styles.tabText, payMethod === tab && styles.tabTextActive]}>
                {tab === 'MOMO' ? 'Mobile Money' : 'Bank Transfer'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {payMethod === 'MOMO' ? (
          <View>
            <Text style={styles.fieldLabel}>Select Network</Text>
            {(() => {
              const activeNet = NETWORKS.find(n => n.id === selectedNetwork) ?? NETWORKS[0];
              return (
                <Animated.View style={{ transform: [{ scale: networkScaleAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.networkCard,
                      showNetworkDropdown && { borderColor: GREEN, borderWidth: 2 },
                    ]}
                    onPress={() => setShowNetworkDropdown(v => !v)}
                    activeOpacity={0.9}
                  >
                    {/* Color accent strip */}
                    <View style={[styles.networkAccent, { backgroundColor: activeNet.color }]} />
                    <View style={styles.networkCardInner}>
                      <LogoImage logoKey={activeNet.logoKey} type="network" color={activeNet.color} initial={activeNet.id.charAt(0)} size={40} radius={10} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.networkCardLabel}>{activeNet.label}</Text>
                        <Text style={styles.networkCardSub}>Tap to change network</Text>
                      </View>
                      <Ionicons
                        name={showNetworkDropdown ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={showNetworkDropdown ? GREEN : colors.secondaryText}
                      />
                    </View>
                  </TouchableOpacity>
                  {showNetworkDropdown && (
                    <View style={styles.networkDropdown}>
                      {NETWORKS.filter(n => n.id !== selectedNetwork).map((net, idx, arr) => (
                        <TouchableOpacity
                          key={net.id}
                          style={[
                            styles.networkDropdownItem,
                            idx === arr.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => { setSelectedNetwork(net.id); setShowNetworkDropdown(false); }}
                          activeOpacity={0.8}
                        >
                          <LogoImage logoKey={net.logoKey} type="network" color={net.color} initial={net.id.charAt(0)} size={38} radius={9} />
                          <Text style={styles.networkDropdownLabel}>{net.label}</Text>
                          <View style={[styles.networkColorDot, { backgroundColor: net.color }]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Animated.View>
              );
            })()}

            <Text style={[styles.fieldLabel, { marginTop: 22 }]}>Phone Number</Text>
            <Animated.View style={{ transform: [{ scale: phoneScaleAnim }] }}>
              <View style={[
                styles.inputWrap,
                phoneInputFocused && { borderColor: GREEN, borderWidth: 2, backgroundColor: isDarkMode ? '#0D1F0D' : '#F0FFF4' },
              ]}>
                <View style={[styles.inputIconBg, { backgroundColor: phoneInputFocused ? GREEN : (isDarkMode ? '#2C2C2E' : '#F0F0F0') }]}>
                  <Ionicons name="call" size={16} color={phoneInputFocused ? '#fff' : colors.secondaryText} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="0XX XXX XXXX"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="phone-pad"
                  maxLength={13}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onFocus={handlePhoneFocus}
                  onBlur={handlePhoneBlur}
                />
              </View>
            </Animated.View>
          </View>
        ) : (
          <View>
            <Text style={styles.fieldLabel}>Select Bank</Text>
            <Animated.View style={{ transform: [{ scale: bankScaleAnim }] }}>
              <TouchableOpacity
                style={[styles.bankSelector, showBankModal && { borderColor: GREEN, borderWidth: 2 }]}
                onPress={handleBankOpen}
                activeOpacity={0.8}
              >
                {selectedBank ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <LogoImage logoKey={selectedBank.logoKey} type="bank" color={selectedBank.color} initial={selectedBank.name.charAt(0)} size={38} radius={9} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bankName} numberOfLines={1}>{selectedBank.name}</Text>
                      <Text style={styles.bankCode}>Code: {selectedBank.code}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.bankIconPlaceholder}>
                      <Ionicons name="business-outline" size={18} color={colors.secondaryText} />
                    </View>
                    <Text style={styles.bankPlaceholder}>Tap to select a bank</Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={18} color={showBankModal ? GREEN : colors.secondaryText} />
              </TouchableOpacity>
            </Animated.View>

            <Text style={[styles.fieldLabel, { marginTop: 22 }]}>Account Number</Text>
            <Animated.View style={{ transform: [{ scale: accountScaleAnim }] }}>
              <View style={[
                styles.inputWrap,
                accountInputFocused && { borderColor: GREEN, borderWidth: 2, backgroundColor: isDarkMode ? '#0D1F0D' : '#F0FFF4' },
              ]}>
                <View style={[styles.inputIconBg, { backgroundColor: accountInputFocused ? GREEN : (isDarkMode ? '#2C2C2E' : '#F0F0F0') }]}>
                  <Ionicons name="card" size={16} color={accountInputFocused ? '#fff' : colors.secondaryText} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account number"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  maxLength={16}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  onFocus={handleAccountFocus}
                  onBlur={handleAccountBlur}
                />
                {verifyingBank && <ActivityIndicator size="small" color={GREEN} style={{ marginRight: 14 }} />}
              </View>
            </Animated.View>

            {accountName ? (
              <View style={styles.verifiedRow}>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
                <Text style={styles.verifiedName}>{accountName} • Verified</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Step 3 UI ──────────────────────────────────────────────────────────
  const paymentDesc = payMethod === 'MOMO'
    ? `${NETWORKS.find(n => n.id === selectedNetwork)?.label ?? selectedNetwork} · ${phoneNumber}`
    : `${selectedBank?.name ?? ''} · ${accountNumber}`;

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text style={styles.sectionLabel}>Review Your Booking</Text>

      <View style={styles.receiptCard}>
        {/* Receipt header */}
        <View style={styles.receiptHeader}>
          <View style={styles.receiptEquipIcon}>
            <Text style={{ fontSize: 26 }}>🚜</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.receiptEquipName} numberOfLines={1}>{equipmentName}</Text>
            <Text style={styles.receiptOwnerName}>Owner: {ownerName}</Text>
          </View>
          <View style={styles.receiptDaysBadge}>
            <Text style={styles.receiptDaysBadgeText}>{numDays}</Text>
            <Text style={styles.receiptDaysBadgeSub}>days</Text>
          </View>
        </View>

        <View style={styles.receiptDivider} />

        {/* Booking details */}
        <View style={styles.receiptSection}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptKey}>Start Date</Text>
            <Text style={styles.receiptVal}>{formatDisplayDate(startDate)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptKey}>End Date</Text>
            <Text style={styles.receiptVal}>{formatDisplayDate(endDate)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptKey}>Daily Rate</Text>
            <Text style={styles.receiptVal}>{formatCurrency(dailyRate)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptKey}>Rental Cost</Text>
            <Text style={styles.receiptVal}>{formatCurrency(subtotal)}</Text>
          </View>
        </View>

        {/* Total strip */}
        <View style={styles.receiptTotalOuter}>
          <LinearGradient colors={[GREEN, GREEN2]} style={styles.receiptTotal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.receiptTotalIconWrap}>
              <Ionicons name="wallet" size={22} color="#fff" />
            </View>
            <Text style={styles.receiptTotalKey}>TOTAL TO PAY</Text>
            <Text style={styles.receiptTotalVal}>{formatCurrency(total)}</Text>
            <View style={styles.receiptTotalFeeChip}>
              <Ionicons name="information-circle-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.receiptTotalFeeText}>Incl. {formatCurrency(fee)} AgroChain fee (5%)</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.receiptDivider} />

        {/* Payment method */}
        <View style={styles.receiptPayRow}>
          <View style={styles.receiptPayIcon}>
            <Ionicons
              name={payMethod === 'MOMO' ? 'phone-portrait' : 'card'}
              size={16}
              color={GREEN}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.receiptPayTitle}>{payMethod === 'MOMO' ? 'Mobile Money' : 'Bank Transfer'}</Text>
            <Text style={styles.receiptPayDesc} numberOfLines={1}>{paymentDesc}</Text>
          </View>
        </View>
      </View>

      {/* Escrow notice */}
      <View style={styles.escrowBox}>
        <Ionicons name="shield-checkmark" size={18} color={GREEN} />
        <Text style={styles.escrowNote}>
          Funds are held securely in escrow by AgroChain until the equipment owner confirms your rental.
        </Text>
      </View>
    </ScrollView>
  );

  // ── Step 4 UI (Result) ─────────────────────────────────────────────────
  const renderStep4 = () => (
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {/* Decorative rings */}
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <View style={[styles.resultRingOuter, { borderColor: resultSuccess ? '#BBF7D0' : '#FECACA' }]} />
        <View style={[styles.resultRingInner, { borderColor: resultSuccess ? '#86EFAC' : '#FCA5A5' }]} />
        <View style={[styles.resultIconWrap, { backgroundColor: resultSuccess ? '#DCFCE7' : '#FEE2E2' }]}>
          <Ionicons
            name={resultSuccess ? 'checkmark-circle' : 'close-circle'}
            size={62}
            color={resultSuccess ? '#16A34A' : '#DC2626'}
          />
        </View>
      </View>

      <Text style={styles.resultTitle}>
        {resultSuccess ? 'Booking Confirmed!' : 'Payment Failed'}
      </Text>
      <Text style={styles.resultSub}>
        {resultSuccess
          ? 'Your equipment rental has been booked and secured.'
          : resultError}
      </Text>

      {resultSuccess && (
        <View style={styles.resultReceiptCard}>
          <View style={styles.resultReceiptRow}>
            <Text style={styles.resultReceiptLabel}>Booking ID</Text>
            <Text style={styles.resultReceiptValue}>{bookingId}</Text>
          </View>
          <View style={styles.resultReceiptDivider} />
          <View style={styles.resultReceiptRow}>
            <Text style={styles.resultReceiptLabel}>Equipment</Text>
            <Text style={styles.resultReceiptValue} numberOfLines={1}>{equipmentName}</Text>
          </View>
          <View style={styles.resultReceiptDivider} />
          <View style={styles.resultReceiptRow}>
            <Text style={styles.resultReceiptLabel}>Duration</Text>
            <Text style={styles.resultReceiptValue}>{numDays} day{numDays !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.resultReceiptDivider} />
          <LinearGradient colors={[GREEN, GREEN2]} style={styles.resultReceiptTotal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Amount Paid</Text>
            <Text style={{ fontSize: 17, color: '#fff', fontWeight: '900' }}>{formatCurrency(total)}</Text>
          </LinearGradient>
        </View>
      )}

      {resultSuccess && (
        <TouchableOpacity
          style={styles.resultDownloadBtn}
          onPress={handleDownloadReceipt}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={16} color={GREEN} />
          <Text style={styles.resultDownloadBtnText}>Download Receipt</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.resultBtn}
        onPress={resultSuccess ? () => (navigation as any).popToTop() : () => setStep(3)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[GREEN, GREEN2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.resultBtnInner}
        >
          <Text style={styles.resultBtnText}>{resultSuccess ? 'Back to Home' : 'Try Again'}</Text>
          <Ionicons
            name={resultSuccess ? 'home' : 'refresh'}
            size={16}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Bottom bar ─────────────────────────────────────────────────────────
  const renderBottomBar = () => {
    if (step === 4) return null;
    const isStep3 = step === 3;
    const canNext = step === 2 ? canProceedStep2() : true;

    return (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={17} color={GREEN} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.divider }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="close" size={17} color={colors.secondaryText} />
            <Text style={[styles.backBtnText, { color: colors.secondaryText }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, (!canNext || submitting) && { opacity: 0.45 }]}
          onPress={() => {
            if (isStep3) handleConfirm();
            else setStep(s => s + 1);
          }}
          activeOpacity={0.85}
          disabled={!canNext || submitting}
        >
          <LinearGradient
            colors={[GREEN, GREEN2]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>{isStep3 ? 'Confirm & Pay' : 'Continue'}</Text>
                <Ionicons
                  name={isStep3 ? 'lock-closed' : 'arrow-forward'}
                  size={15}
                  color="rgba(255,255,255,0.9)"
                  style={{ marginLeft: 7 }}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient colors={[GREEN, GREEN2]} style={[styles.header, { paddingTop: insets.top + 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <View style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {step === 4 ? (resultSuccess ? 'Confirmed!' : 'Payment Failed') : 'Book Equipment'}
          </Text>
          {step < 4 && (
            <View style={styles.headerBadge}>
              <Ionicons name="shield-checkmark" size={10} color="rgba(255,255,255,0.9)" />
              <Text style={styles.headerBadgeText}>SECURE BOOKING</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {step < 4 && <StepIndicator step={step} />}

      <View style={{ flex: 1 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>

      {renderBottomBar()}

      <DatePickerModal
        visible={dateTarget === 'start'}
        onClose={() => setDateTarget(null)}
        title="Select Start Date"
        currentDate={startDate}
        minDate={todayPlusDays(1)}
        colors={colors}
        isDarkMode={isDarkMode}
        onSelect={(d) => {
          setStartDate(d);
          const ne = new Date(d + 'T00:00:00');
          ne.setDate(ne.getDate() + 1);
          const neStr = ne.toISOString().slice(0, 10);
          if (endDate <= d) setEndDate(neStr);
        }}
      />
      <DatePickerModal
        visible={dateTarget === 'end'}
        onClose={() => setDateTarget(null)}
        title="Select End Date"
        currentDate={endDate}
        minDate={(() => { const d = new Date(startDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()}
        colors={colors}
        isDarkMode={isDarkMode}
        onSelect={(d) => setEndDate(d)}
      />
      <BankPickerModal
        visible={showBankModal}
        onClose={handleBankClose}
        onSelect={(bank) => { setSelectedBank(bank); setAccountNumber(''); setAccountName(''); }}
        colors={colors}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ── Header ──────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 20,
    },
    headerBack: { width: 40 },
    headerBackBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
    headerBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginTop: 5,
    },
    headerBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.92)', fontWeight: '800', letterSpacing: 0.8 },

    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: colors.secondaryText,
      textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 14, marginTop: 2,
    },

    // ── Equipment card ───────────────────────────────────────────────────
    equipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.divider },
    equipAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    equipMiddle: { flex: 1 },
    equipName: { fontSize: 16, fontWeight: '700', color: colors.text },
    equipOwner: { fontSize: 13, color: colors.secondaryText, marginTop: 2 },
    equipRate: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen, marginTop: 4 },

    // ── Dates ────────────────────────────────────────────────────────────
    datesRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 14, padding: 12 },
    dateBoxIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    dateBoxText: { flex: 1 },
    dateBoxLabel: { fontSize: 11, color: colors.secondaryText, fontWeight: '600' },
    dateBoxValue: { fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 2 },

    // ── Cost summary ─────────────────────────────────────────────────────
    costSummaryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.divider },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    costLabel: { fontSize: 14, color: colors.secondaryText },
    costValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    costTotal: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 6, paddingTop: 12 },
    costTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    costTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primaryGreen },

    noteText: { fontSize: 12, color: colors.secondaryText, textAlign: 'center', fontStyle: 'italic' },

    // ── Payment tabs ─────────────────────────────────────────────────────
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14, borderRadius: 16, overflow: 'hidden',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5, borderColor: colors.divider,
    },
    tabActive: { borderColor: GREEN },
    tabText: { fontSize: 13, color: colors.secondaryText, fontWeight: '600' },
    tabTextActive: { color: '#fff', fontWeight: '800' },

    // ── Network ──────────────────────────────────────────────────────────
    fieldLabel: {
      fontSize: 11, fontWeight: '800', color: colors.secondaryText,
      marginBottom: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.9,
    },
    networkCard: {
      flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.card,
      borderRadius: 18, marginBottom: 4, overflow: 'hidden',
      borderWidth: 1.5, borderColor: colors.divider,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.06, shadowRadius: 8, elevation: 2,
    },
    networkAccent: { width: 5 },
    networkCardInner: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      padding: 14,
    },
    networkCardLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    networkCardSub: { fontSize: 11, color: colors.secondaryText, marginTop: 2 },
    networkDropdown: {
      backgroundColor: colors.card, borderRadius: 18,
      borderWidth: 1.5, borderColor: colors.divider, marginBottom: 10, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDarkMode ? 0.25 : 0.1, shadowRadius: 14, elevation: 5,
    },
    networkDropdownItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    networkDropdownLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 12 },
    networkColorDot: { width: 8, height: 8, borderRadius: 4 },

    // ── Input ────────────────────────────────────────────────────────────
    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.inputBackground, borderRadius: 18,
      height: 58, marginBottom: 12,
      borderWidth: 1.5, borderColor: colors.divider, overflow: 'hidden',
    },
    inputIconBg: {
      width: 56, height: 58, alignItems: 'center', justifyContent: 'center',
    },
    input: { flex: 1, fontSize: 15, color: colors.text, paddingLeft: 12, paddingRight: 14 },

    // ── Bank ─────────────────────────────────────────────────────────────
    bankSelector: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.inputBackground, borderRadius: 18,
      paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
      borderWidth: 1.5, borderColor: colors.divider, minHeight: 62,
    },
    bankIconPlaceholder: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F0F0',
      alignItems: 'center', justifyContent: 'center',
    },
    bankName: { fontSize: 14, color: colors.text, fontWeight: '700' },
    bankCode: { fontSize: 11, color: colors.secondaryText, marginTop: 2 },
    bankPlaceholder: { fontSize: 14, color: colors.secondaryText },
    verifiedRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginBottom: 4, paddingHorizontal: 2,
    },
    verifiedBadge: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    },
    verifiedName: { fontSize: 13, color: GREEN, fontWeight: '700', flex: 1 },

    // ── Receipt card (Step 3) ────────────────────────────────────────────
    receiptCard: {
      backgroundColor: colors.card, borderRadius: 22, overflow: 'hidden',
      marginBottom: 16, borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 16, elevation: 6,
    },
    receiptHeader: {
      flexDirection: 'row', alignItems: 'center',
      padding: 18, paddingBottom: 14,
    },
    receiptEquipIcon: {
      width: 52, height: 52, borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(26,107,46,0.2)' : '#E8F5E9',
      alignItems: 'center', justifyContent: 'center',
    },
    receiptEquipName: { fontSize: 15, fontWeight: '800', color: colors.text },
    receiptOwnerName: { fontSize: 12, color: colors.secondaryText, marginTop: 3 },
    receiptDaysBadge: {
      backgroundColor: GREEN, borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
    },
    receiptDaysBadgeText: { color: '#fff', fontWeight: '900', fontSize: 16, lineHeight: 19 },
    receiptDaysBadgeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700' },
    receiptDivider: { height: 1, backgroundColor: colors.divider },
    receiptSection: { paddingVertical: 4 },
    receiptRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 18, paddingVertical: 11,
    },
    receiptKey: { fontSize: 13, color: colors.secondaryText },
    receiptVal: { fontSize: 13, fontWeight: '700', color: colors.text },
    receiptTotalOuter: {
      paddingHorizontal: 14, paddingVertical: 14,
    },
    receiptTotal: {
      alignItems: 'center', paddingVertical: 26, borderRadius: 20,
      shadowColor: GREEN, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    receiptTotalIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    receiptTotalKey: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.6, marginBottom: 8 },
    receiptTotalVal: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
    receiptTotalFeeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14,
    },
    receiptTotalFeeText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    receiptPayRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingVertical: 14,
    },
    receiptPayIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: isDarkMode ? 'rgba(26,107,46,0.25)' : '#DCFCE7',
      alignItems: 'center', justifyContent: 'center',
    },
    receiptPayTitle: { fontSize: 12, color: colors.secondaryText, fontWeight: '600' },
    receiptPayDesc: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },

    // ── Escrow notice ────────────────────────────────────────────────────
    escrowBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: isDarkMode ? 'rgba(26,107,46,0.18)' : '#F0FFF4',
      borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: isDarkMode ? 'rgba(26,107,46,0.3)' : '#BBF7D0',
    },
    escrowNote: {
      fontSize: 12, color: isDarkMode ? '#4ADE80' : '#166534',
      flex: 1, lineHeight: 18, fontWeight: '500',
    },

    // ── Result screen ────────────────────────────────────────────────────
    resultRingOuter: {
      position: 'absolute', width: 144, height: 144, borderRadius: 72, borderWidth: 1.5,
    },
    resultRingInner: {
      position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 2,
    },
    resultIconWrap: {
      width: 86, height: 86, borderRadius: 43,
      alignItems: 'center', justifyContent: 'center',
    },
    resultTitle: {
      fontSize: 26, fontWeight: '900', color: colors.text,
      marginBottom: 10, textAlign: 'center', letterSpacing: 0.2,
    },
    resultSub: {
      fontSize: 14, color: colors.secondaryText, textAlign: 'center',
      marginBottom: 28, lineHeight: 21, paddingHorizontal: 8,
    },
    resultReceiptCard: {
      width: '100%', backgroundColor: colors.card, borderRadius: 20,
      marginBottom: 28, overflow: 'hidden',
      borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.25 : 0.08, shadowRadius: 12, elevation: 4,
    },
    resultReceiptRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 18, paddingVertical: 13,
    },
    resultReceiptLabel: { fontSize: 13, color: colors.secondaryText },
    resultReceiptValue: { fontSize: 14, fontWeight: '700', color: colors.text, maxWidth: '55%', textAlign: 'right' },
    resultReceiptDivider: { height: 1, backgroundColor: colors.divider },
    resultReceiptTotal: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 18, paddingVertical: 15,
    },
    resultDownloadBtn: {
      width: '100%', height: 52, borderRadius: 18,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1.5, borderColor: GREEN, marginBottom: 12,
    },
    resultDownloadBtnText: { fontSize: 15, fontWeight: '700', color: GREEN },
    resultBtn: { width: '100%', borderRadius: 18, overflow: 'hidden' },
    resultBtnInner: {
      height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    resultBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

    // ── Bottom bar ───────────────────────────────────────────────────────
    bottomBar: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1, borderTopColor: colors.divider,
      paddingHorizontal: 20, paddingTop: 14,
    },
    backBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 13, borderRadius: 16,
      borderWidth: 1.5, borderColor: GREEN,
    },
    backBtnText: { fontSize: 14, fontWeight: '700', color: GREEN },
    nextBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    nextBtnGradient: {
      height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    nextBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  });
}

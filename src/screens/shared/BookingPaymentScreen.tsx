import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, TextInput,
  Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
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

type Props = NativeStackScreenProps<FarmerStackParamList, 'BookingPayment'>;

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FEE_RATE = 0.05;

const NETWORKS = [
  { id: 'MTN', label: 'MTN MoMo', color: '#FFC107', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/MTN_Logo.svg/320px-MTN_Logo.svg.png' },
  { id: 'VODAFONE', label: 'Vodafone Cash', color: '#E53935', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Vodafone_icon.svg/320px-Vodafone_icon.svg.png' },
  { id: 'AIRTELTIGO', label: 'AirtelTigo Money', color: '#FF5722', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/AirtelTigo_Logo.png/320px-AirtelTigo_Logo.png' },
];

const GHANA_BANKS = [
  { code: '040100', name: 'GCB Bank', color: '#1A6B2E', logo: 'https://gcbbank.com.gh/wp-content/uploads/2021/01/GCB-Logo.png' },
  { code: '030100', name: 'Absa Bank Ghana', color: '#DC2626', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Absa_Group_logo.svg/320px-Absa_Group_logo.svg.png' },
  { code: '017100', name: 'Ecobank Ghana', color: '#1565C0', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Ecobank_logo.svg/320px-Ecobank_logo.svg.png' },
  { code: '240100', name: 'Fidelity Bank Ghana', color: '#1565C0', logo: 'https://fidelitybank.com.gh/wp-content/uploads/2021/01/fidelity-logo.png' },
  { code: '190100', name: 'Stanbic Bank Ghana', color: '#1565C0', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Standard_Bank_Logo.svg/320px-Standard_Bank_Logo.svg.png' },
  { code: '044100', name: 'Access Bank Ghana', color: '#FF6F00', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Access_Bank_Logo.svg/320px-Access_Bank_Logo.svg.png' },
  { code: '057100', name: 'Zenith Bank Ghana', color: '#DC2626', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Zenith_Bank_Logo.svg/320px-Zenith_Bank_Logo.svg.png' },
  { code: '340100', name: 'CAL Bank', color: '#1A6B2E', logo: 'https://calbank.net/wp-content/uploads/2021/01/cal-bank-logo.png' },
  { code: '033100', name: 'UBA Ghana', color: '#DC2626', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/United_Bank_for_Africa_Logo.svg/320px-United_Bank_for_Africa_Logo.svg.png' },
  { code: '301100', name: 'Republic Bank Ghana', color: '#1565C0', logo: 'https://republicghana.com/wp-content/uploads/2021/01/republic-bank-logo.png' },
  { code: '080100', name: 'Agricultural Development Bank', color: '#1A6B2E', logo: 'https://adbghana.com/wp-content/uploads/2021/01/adb-logo.png' },
  { code: '500100', name: 'National Investment Bank', color: '#1565C0', logo: 'https://nibghana.com/wp-content/uploads/2021/01/nib-logo.png' },
  { code: '180100', name: 'Prudential Bank', color: '#1565C0', logo: 'https://prudentialbank.com.gh/wp-content/uploads/2021/01/prudential-logo.png' },
  { code: '170100', name: 'First Atlantic Bank', color: '#1565C0', logo: 'https://firstatlanticbank.com.gh/wp-content/uploads/2021/01/fab-logo.png' },
  { code: '058100', name: 'GT Bank Ghana', color: '#FF6F00', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Guaranty_Trust_Bank_logo.svg/320px-Guaranty_Trust_Bank_logo.svg.png' },
  { code: '210100', name: 'Bank of Africa Ghana', color: '#DC2626', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Bank_of_Africa_logo.svg/320px-Bank_of_Africa_logo.svg.png' },
  { code: '023100', name: 'Consolidated Bank Ghana', color: '#1A6B2E', logo: 'https://cbg.com.gh/wp-content/uploads/2021/01/cbg-logo.png' },
  { code: '490100', name: 'OmniBank Ghana', color: '#7B1FA2', logo: 'https://omnibankgh.com/wp-content/uploads/2021/01/omni-logo.png' },
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
function LogoImage({ uri, color, initial, size = 40, radius = 8 }: {
  uri: string; color: string; initial: string; size?: number; radius?: number;
}) {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.round(size * 0.4) }}>{initial}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius, resizeMode: 'contain', backgroundColor: '#fff' }}
      onError={() => setHasError(true)}
    />
  );
}

// ─── Minimal calendar date picker ───────────────────────────────────────────
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

  const bgColor = isDarkMode ? '#1C1C1E' : '#F9FAFB';
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: bgColor, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: divider, alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 16 }}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={20} color={colors.primaryGreen} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={20} color={colors.primaryGreen} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 }}>
            {WEEK_DAYS.map(d => (
              <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: subColor }}>{d}</Text>
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
                    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? colors.primaryGreen : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: 14,
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
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          <View style={{ padding: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: textColor, marginBottom: 12 }}>Select Bank</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
              <Ionicons name="search-outline" size={16} color={subColor} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search banks..."
                placeholderTextColor={subColor}
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: textColor }}
              />
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map(bank => (
              <TouchableOpacity
                key={bank.code}
                onPress={() => { onSelect(bank); onClose(); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2C2C2E' : '#F0F0F0' }}
              >
                <View style={{ marginRight: 12 }}>
                  <LogoImage uri={bank.logo} color={bank.color} initial={bank.name.charAt(0)} size={36} radius={8} />
                </View>
                <Text style={{ fontSize: 15, color: textColor, flex: 1 }}>{bank.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <SafeAreaView edges={['bottom']} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step, colors }: { step: number; colors: ThemeColors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
      {[1, 2, 3].map(s => (
        <View key={s} style={{
          width: s === step ? 24 : 8, height: 8, borderRadius: 4,
          backgroundColor: s <= step ? colors.primaryGreen : colors.divider,
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

  const networkScaleAnim = useRef(new Animated.Value(1)).current;
  const phoneScaleAnim = useRef(new Animated.Value(1)).current;
  const bankScaleAnim = useRef(new Animated.Value(1)).current;
  const accountScaleAnim = useRef(new Animated.Value(1)).current;
  const [accountInputFocused, setAccountInputFocused] = useState(false);

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

  // Auto-verify bank account
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
      setResultError(err?.response?.data?.message ?? 'Payment failed. Please try again.');
      setResultSuccess(false);
      setStep(4);
    } finally {
      setSubmitting(false);
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

      <Text style={styles.noteText}>
        * AgroChain fee (5%) will be shown at confirmation.
      </Text>
    </ScrollView>
  );

  // ── Step 2 UI ──────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={styles.sectionLabel}>Payment Method</Text>

        <View style={styles.tabRow}>
          {(['MOMO', 'BANK'] as const).map(tab => (
            <Pressable key={tab} style={[styles.tab, payMethod === tab && styles.tabActive]} onPress={() => setPayMethod(tab)}>
              <Ionicons name={tab === 'MOMO' ? 'phone-portrait-outline' : 'card-outline'} size={16} color={payMethod === tab ? colors.primaryGreen : colors.secondaryText} />
              <Text style={[styles.tabText, payMethod === tab && styles.tabTextActive]}>
                {tab === 'MOMO' ? 'Mobile Money' : 'Bank Transfer'}
              </Text>
            </Pressable>
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
                      showNetworkDropdown && { borderColor: colors.primaryGreen, borderWidth: 2 },
                    ]}
                    onPress={() => setShowNetworkDropdown(v => !v)}
                    activeOpacity={0.9}
                  >
                    <LogoImage uri={activeNet.logo} color={activeNet.color} initial={activeNet.id.charAt(0)} size={36} radius={8} />
                    <Text style={styles.networkCardLabel}>{activeNet.label}</Text>
                    <Ionicons
                      name={showNetworkDropdown ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={showNetworkDropdown ? colors.primaryGreen : colors.secondaryText}
                    />
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
                          <LogoImage uri={net.logo} color={net.color} initial={net.id.charAt(0)} size={36} radius={8} />
                          <Text style={styles.networkDropdownLabel}>{net.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Animated.View>
              );
            })()}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Phone Number</Text>
            <Animated.View style={{ transform: [{ scale: phoneScaleAnim }] }}>
              <View style={[
                styles.inputWrap,
                phoneInputFocused && { borderWidth: 1.5, borderColor: colors.primaryGreen },
              ]}>
                <Ionicons name="call-outline" size={18} color={phoneInputFocused ? colors.primaryGreen : colors.secondaryText} style={{ marginRight: 8 }} />
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
              <TouchableOpacity style={[styles.bankSelector, showBankModal && { borderWidth: 1.5, borderColor: colors.primaryGreen }]} onPress={handleBankOpen} activeOpacity={0.8}>
                {selectedBank ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LogoImage uri={selectedBank.logo} color={selectedBank.color} initial={selectedBank.name.charAt(0)} size={32} radius={6} />
                    <Text style={styles.bankName}>{selectedBank.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.bankPlaceholder}>Tap to select a bank</Text>
                )}
                <Ionicons name="chevron-down" size={18} color={showBankModal ? colors.primaryGreen : colors.secondaryText} />
              </TouchableOpacity>
            </Animated.View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Account Number</Text>
            <Animated.View style={{ transform: [{ scale: accountScaleAnim }] }}>
              <View style={[styles.inputWrap, accountInputFocused && { borderWidth: 1.5, borderColor: colors.primaryGreen }]}>
                <Ionicons name="card-outline" size={18} color={accountInputFocused ? colors.primaryGreen : colors.secondaryText} style={{ marginRight: 8 }} />
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
                {verifyingBank && <ActivityIndicator size="small" color={colors.primaryGreen} />}
              </View>
            </Animated.View>

            {accountName ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primaryGreen} />
                <Text style={styles.verifiedName}>{accountName}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Step 3 UI ──────────────────────────────────────────────────────────
  const paymentDesc = payMethod === 'MOMO'
    ? `${NETWORKS.find(n => n.id === selectedNetwork)?.label ?? selectedNetwork} — ${phoneNumber}`
    : `${selectedBank?.name ?? ''} — ${accountNumber}`;

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text style={styles.sectionLabel}>Confirm Booking</Text>

      <View style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Ionicons name="construct-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Equipment</Text>
          <Text style={styles.confirmVal} numberOfLines={1}>{equipmentName}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="person-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Owner</Text>
          <Text style={styles.confirmVal}>{ownerName}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Start</Text>
          <Text style={styles.confirmVal}>{formatDisplayDate(startDate)}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>End</Text>
          <Text style={styles.confirmVal}>{formatDisplayDate(endDate)}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="time-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Duration</Text>
          <Text style={styles.confirmVal}>{numDays} day{numDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.confirmDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.confirmRow}>
          <Ionicons name="cash-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Rental Cost</Text>
          <Text style={styles.confirmVal}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={[styles.confirmDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.confirmRow}>
          <Ionicons name="wallet-outline" size={16} color={colors.primaryGreen} />
          <Text style={[styles.confirmKey, { color: colors.primaryGreen, fontWeight: '700' }]}>Total</Text>
          <Text style={[styles.confirmVal, { color: colors.primaryGreen, fontWeight: '800', fontSize: 16 }]}>{formatCurrency(total)}</Text>
        </View>
        <View style={[styles.confirmDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.confirmRow}>
          <Ionicons name={payMethod === 'MOMO' ? 'phone-portrait-outline' : 'card-outline'} size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Payment</Text>
          <Text style={[styles.confirmVal, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>{paymentDesc}</Text>
        </View>
      </View>

      <Text style={styles.escrowNote}>
        Funds are held in escrow by AgroChain until the equipment owner confirms the rental.
      </Text>
    </ScrollView>
  );

  // ── Step 4 UI (Result) ─────────────────────────────────────────────────
  const renderStep4 = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={[styles.resultIconWrap, { backgroundColor: resultSuccess ? '#E8F5E9' : '#FFEBEE' }]}>
        <Ionicons
          name={resultSuccess ? 'checkmark-circle' : 'close-circle'}
          size={64}
          color={resultSuccess ? '#2E7D32' : '#C62828'}
        />
      </View>
      <Text style={styles.resultTitle}>
        {resultSuccess ? 'Booking Confirmed!' : 'Payment Failed'}
      </Text>
      {resultSuccess ? (
        <>
          <Text style={styles.resultSub}>Your equipment booking is confirmed.</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultCardLabel}>Booking ID</Text>
            <Text style={styles.resultCardValue}>{bookingId}</Text>
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 10 }} />
            <Text style={styles.resultCardLabel}>Amount Paid</Text>
            <Text style={[styles.resultCardValue, { color: colors.primaryGreen }]}>{formatCurrency(total)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: colors.primaryGreen }]}
            onPress={() => (navigation as any).popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.resultBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.resultSub}>{resultError}</Text>
          <TouchableOpacity style={[styles.resultBtn, { backgroundColor: colors.primaryGreen }]} onPress={() => setStep(3)} activeOpacity={0.85}>
            <Text style={styles.resultBtnText}>Try Again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ── Bottom bar ─────────────────────────────────────────────────────────
  const renderBottomBar = () => {
    if (step === 4) return null;
    const isStep1 = step === 1;
    const isStep2 = step === 2;
    const isStep3 = step === 3;
    const canNext = isStep2 ? canProceedStep2() : true;

    return (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step > 1 ? (
          <Pressable style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Ionicons name="arrow-back" size={20} color={colors.primaryGreen} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color={colors.secondaryText} />
            <Text style={[styles.backBtnText, { color: colors.secondaryText }]}>Cancel</Text>
          </Pressable>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, (!canNext || submitting) && { opacity: 0.5 }]}
          onPress={() => {
            if (isStep3) handleConfirm();
            else setStep(s => s + 1);
          }}
          activeOpacity={0.85}
          disabled={!canNext || submitting}
        >
          <LinearGradient
            colors={['#1A6B2E', '#2E8B4A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.nextBtnText}>
                {isStep3 ? 'Confirm & Pay' : 'Next'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === 4 ? (resultSuccess ? 'Booking Confirmed' : 'Payment Failed') : 'Book Equipment'}
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {step < 4 && <StepIndicator step={step} colors={colors} />}

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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
    headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },

    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.secondaryText, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },

    // Equipment card
    equipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.divider },
    equipAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    equipMiddle: { flex: 1 },
    equipName: { fontSize: 16, fontWeight: '700', color: colors.text },
    equipOwner: { fontSize: 13, color: colors.secondaryText, marginTop: 2 },
    equipRate: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen, marginTop: 4 },

    // Date pickers
    datesRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 14, padding: 12 },
    dateBoxIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    dateBoxText: { flex: 1 },
    dateBoxLabel: { fontSize: 11, color: colors.secondaryText, fontWeight: '600' },
    dateBoxValue: { fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 2 },

    // Cost summary
    costSummaryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.divider },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    costLabel: { fontSize: 14, color: colors.secondaryText },
    costValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    costTotal: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 6, paddingTop: 12 },
    costTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    costTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primaryGreen },

    noteText: { fontSize: 12, color: colors.secondaryText, textAlign: 'center', fontStyle: 'italic' },

    // Payment tabs
    tabRow: { flexDirection: 'row', backgroundColor: colors.inputBackground, borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    tabText: { fontSize: 14, color: colors.secondaryText, fontWeight: '600' },
    tabTextActive: { color: colors.primaryGreen, fontWeight: '700' },

    // MoMo
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.secondaryText, marginBottom: 8, marginTop: 4 },
    networkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1.5, borderColor: colors.divider },
    networkBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    networkBadgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    networkCardLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    networkDropdown: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: colors.divider, marginBottom: 10, overflow: 'hidden' },
    networkDropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
    networkDropdownLabel: { fontSize: 15, fontWeight: '600', color: colors.text },

    // Input
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 12 },
    input: { flex: 1, fontSize: 15, color: colors.text },

    // Bank
    bankSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.inputBackground, borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 12 },
    bankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    bankBadgeLetter: { color: '#fff', fontWeight: '700', fontSize: 13 },
    bankName: { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1 },
    bankPlaceholder: { fontSize: 14, color: colors.secondaryText },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    verifiedName: { fontSize: 13, color: colors.primaryGreen, fontWeight: '600' },

    // Confirm card
    confirmCard: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.divider },
    confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    confirmKey: { fontSize: 13, color: colors.secondaryText, width: 120 },
    confirmVal: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' },
    confirmDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 2 },
    escrowNote: { fontSize: 12, color: colors.secondaryText, textAlign: 'center', lineHeight: 18, fontStyle: 'italic', marginTop: 4 },

    // Result
    resultIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    resultTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
    resultSub: { fontSize: 14, color: colors.secondaryText, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    resultCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: colors.divider },
    resultCardLabel: { fontSize: 12, color: colors.secondaryText, marginBottom: 4 },
    resultCardValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    resultBtn: { width: '100%', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    resultBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Bottom bar
    bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider, paddingHorizontal: 20, paddingTop: 12 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
    backBtnText: { fontSize: 15, fontWeight: '600', color: colors.primaryGreen },
    nextBtn: { flex: 1, marginLeft: 16, borderRadius: 14, overflow: 'hidden' },
    nextBtnGradient: { height: 50, alignItems: 'center', justifyContent: 'center' },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  });
}

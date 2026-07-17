import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated,
  Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarketplaceStackParamList } from '../../types';
import { purchaseMarketplaceListing } from '../../api/produceApi';
import { verifyBankAccount } from '../../api/earningsApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MarketplacePayment'>;

const FEE_RATE = 0.05;

const NETWORKS = [
  { id: 'MTN', label: 'MTN MoMo', color: '#FFC107' },
  { id: 'VODAFONE', label: 'Vodafone Cash', color: '#E53935' },
  { id: 'AIRTELTIGO', label: 'AirtelTigo Money', color: '#FF5722' },
];

const GHANA_BANKS = [
  { code: 'GCB', name: 'GCB Bank', color: '#1A6B2E', letter: 'G' },
  { code: 'ABSA', name: 'Absa Bank Ghana', color: '#E53935', letter: 'A' },
  { code: 'STANCHART', name: 'Standard Chartered', color: '#006FCF', letter: 'S' },
  { code: 'ECOBANK', name: 'Ecobank Ghana', color: '#003087', letter: 'E' },
  { code: 'FIDELITY', name: 'Fidelity Bank', color: '#FF6B00', letter: 'F' },
  { code: 'CAL', name: 'CAL Bank', color: '#8B0000', letter: 'C' },
  { code: 'ZENITH', name: 'Zenith Bank', color: '#E53935', letter: 'Z' },
  { code: 'UBA', name: 'UBA Ghana', color: '#E53935', letter: 'U' },
  { code: 'SOCIETE', name: 'Société Générale', color: '#E53935', letter: 'S' },
  { code: 'ACCESS', name: 'Access Bank Ghana', color: '#E53935', letter: 'A' },
  { code: 'PRUDENTIAL', name: 'Prudential Bank', color: '#003087', letter: 'P' },
  { code: 'ADB', name: 'Agricultural Development Bank', color: '#1A6B2E', letter: 'A' },
  { code: 'NIB', name: 'National Investment Bank', color: '#003087', letter: 'N' },
  { code: 'REPUBLIC', name: 'Republic Bank Ghana', color: '#003087', letter: 'R' },
  { code: 'FIRST_ATLANTIC', name: 'First Atlantic Bank', color: '#FF6B00', letter: 'F' },
  { code: 'OMB', name: 'Omni Bank', color: '#1A6B2E', letter: 'O' },
  { code: 'UNIVERSAL', name: 'Universal Merchant Bank', color: '#8B0000', letter: 'U' },
  { code: 'CONSOLIDATED', name: 'Consolidated Bank Ghana', color: '#003087', letter: 'C' },
];

function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bank.color, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{bank.letter}</Text>
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
export default function MarketplacePaymentScreen({ route, navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const { listingId, listingName, price, sellerId, sellerName, imageUrl } = route.params;

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [resultError, setResultError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: Order summary ───────────────────────────────────────────────
  const [quantity, setQuantity] = useState(1);

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

  const subtotal = price * quantity;
  const fee = subtotal * FEE_RATE;
  const total = subtotal + fee;
  const sellerReceives = subtotal - fee;

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
      const result = await purchaseMarketplaceListing(listingId, {
        quantity,
        paymentMethod: payMethod,
        network: payMethod === 'MOMO' ? selectedNetwork : undefined,
        phoneNumber: payMethod === 'MOMO' ? phoneNumber : undefined,
        bankCode: payMethod === 'BANK' ? selectedBank?.code : undefined,
        accountNumber: payMethod === 'BANK' ? accountNumber : undefined,
        accountName: payMethod === 'BANK' ? accountName : undefined,
      });
      setOrderId(result.orderId);
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

  const paymentDesc = payMethod === 'MOMO'
    ? `${NETWORKS.find(n => n.id === selectedNetwork)?.label ?? selectedNetwork} — ${phoneNumber}`
    : `${selectedBank?.name ?? ''} — ${accountNumber}`;

  const sellerInitial = sellerName?.charAt(0)?.toUpperCase() ?? '?';

  // ── Step 1 UI ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <View style={styles.listingCard}>
        <View style={styles.listingEmoji}>
          <Text style={{ fontSize: 28 }}>🛒</Text>
        </View>
        <View style={styles.listingMiddle}>
          <Text style={styles.listingName} numberOfLines={2}>{listingName}</Text>
          <Text style={styles.listingSeller}>Seller: {sellerName}</Text>
          <Text style={styles.listingPrice}>{formatCurrency(price)} per unit</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Order Summary</Text>

      <View style={styles.quantityCard}>
        <Text style={styles.quantityLabel}>Quantity</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.4 }]}
            onPress={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Ionicons name="remove" size={20} color={colors.primaryGreen} />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
            <Ionicons name="add" size={20} color={colors.primaryGreen} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.costSummaryCard}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Unit Price</Text>
          <Text style={styles.costValue}>{formatCurrency(price)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Quantity</Text>
          <Text style={styles.costValue}>× {quantity}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Subtotal</Text>
          <Text style={styles.costValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>AgroChain Fee (5%)</Text>
          <Text style={styles.costValue}>{formatCurrency(fee)}</Text>
        </View>
        <View style={[styles.costRow, styles.costTotal]}>
          <Text style={styles.costTotalLabel}>Total to Pay</Text>
          <Text style={styles.costTotalValue}>{formatCurrency(total)}</Text>
        </View>
        <View style={[styles.costRow, { paddingTop: 4 }]}>
          <Text style={[styles.costLabel, { fontSize: 12 }]}>Seller receives</Text>
          <Text style={[styles.costValue, { fontSize: 12 }]}>{formatCurrency(sellerReceives)}</Text>
        </View>
      </View>
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
                    <View style={[styles.networkBadge, { backgroundColor: activeNet.color }]}>
                      <Text style={styles.networkBadgeText}>{activeNet.id.charAt(0)}</Text>
                    </View>
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
                          <View style={[styles.networkBadge, { backgroundColor: net.color }]}>
                            <Text style={styles.networkBadgeText}>{net.id.charAt(0)}</Text>
                          </View>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.bankBadge, { backgroundColor: selectedBank.color }]}>
                      <Text style={styles.bankBadgeLetter}>{selectedBank.letter}</Text>
                    </View>
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
  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text style={styles.sectionLabel}>Confirm Order</Text>

      <View style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Ionicons name="cube-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Item</Text>
          <Text style={styles.confirmVal} numberOfLines={1}>{listingName}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="person-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Seller</Text>
          <Text style={styles.confirmVal}>{sellerName}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="layers-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Quantity</Text>
          <Text style={styles.confirmVal}>{quantity}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Ionicons name="cash-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>Subtotal</Text>
          <Text style={styles.confirmVal}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.confirmKey}>AgroChain Fee (5%)</Text>
          <Text style={styles.confirmVal}>{formatCurrency(fee)}</Text>
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
        Funds are held in escrow by AgroChain until the seller confirms your order.
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
        {resultSuccess ? 'Order Placed!' : 'Payment Failed'}
      </Text>
      {resultSuccess ? (
        <>
          <Text style={styles.resultSub}>Your order has been placed successfully.</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultCardLabel}>Order ID</Text>
            <Text style={styles.resultCardValue}>{orderId}</Text>
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 10 }} />
            <Text style={styles.resultCardLabel}>Amount Paid</Text>
            <Text style={[styles.resultCardValue, { color: colors.primaryGreen }]}>{formatCurrency(total)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: colors.primaryGreen }]}
            onPress={() => navigation.navigate('MarketplaceList')}
            activeOpacity={0.85}
          >
            <Text style={styles.resultBtnText}>Back to Marketplace</Text>
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
    const canNext = step === 2 ? canProceedStep2() : true;

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
            if (step === 3) handleConfirm();
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
                {step === 3 ? 'Confirm & Pay' : 'Next'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === 4 ? (resultSuccess ? 'Order Confirmed' : 'Payment Failed') : 'Purchase Item'}
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

    // Listing card
    listingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.divider },
    listingEmoji: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    listingMiddle: { flex: 1 },
    listingName: { fontSize: 16, fontWeight: '700', color: colors.text },
    listingSeller: { fontSize: 13, color: colors.secondaryText, marginTop: 2 },
    listingPrice: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen, marginTop: 4 },

    // Quantity
    quantityCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.divider },
    quantityLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    qtyValue: { fontSize: 18, fontWeight: '800', color: colors.text, minWidth: 32, textAlign: 'center' },

    // Cost summary
    costSummaryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.divider },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    costLabel: { fontSize: 14, color: colors.secondaryText },
    costValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    costTotal: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 6, paddingTop: 12 },
    costTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    costTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primaryGreen },

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

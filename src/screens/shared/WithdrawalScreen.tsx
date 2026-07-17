import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getEarnings, initiateWithdrawal, verifyBankAccount, EarningsSummary } from '../../api/earningsApi';
import { BANK_LOGOS, NETWORK_LOGOS } from '../../config/logoRegistry';

const NETWORKS = [
  { id: 'MTN', name: 'MTN Mobile Money', color: '#FFC107', logoKey: 'mtn' },
  { id: 'VOD', name: 'Vodafone Cash', color: '#E53935', logoKey: 'vodafone' },
  { id: 'ATL', name: 'AirtelTigo Money', color: '#FF5722', logoKey: 'airteltigo' },
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

type Method = 'MOMO' | 'BANK';
type Step = 1 | 2 | 3 | 4;

export default function WithdrawalScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>('MOMO');

  // MoMo fields
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Bank fields
  const [selectedBank, setSelectedBank] = useState<typeof GHANA_BANKS[0] | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // Common
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    getEarnings().then(r => setEarnings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      setVerifying(true);
      setVerified(false);
      setAccountName('');
      verifyBankAccount(selectedBank.code, accountNumber)
        .then(r => { setAccountName(r.data.accountName); setVerified(true); })
        .catch(() => { setAccountName(''); setVerified(false); })
        .finally(() => setVerifying(false));
    } else {
      setVerified(false);
      setAccountName('');
    }
  }, [accountNumber, selectedBank]);

  const canProceedStep2 = () => {
    if (method === 'MOMO') return phoneNumber.length >= 10;
    return verified && selectedBank !== null;
  };

  const canProceedStep3 = () => {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 10 && num <= (earnings?.availableBalance ?? 0);
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await initiateWithdrawal({
        method,
        amount: parseFloat(amount),
        ...(method === 'MOMO'
          ? { network: selectedNetwork.id, phoneNumber }
          : { bankCode: selectedBank!.code, accountNumber, accountName }),
      });
      setSuccess(true);
      setStep(4);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message ?? 'Something went wrong. Please try again.');
      setSuccess(false);
      setStep(4);
    } finally {
      setWithdrawing(false);
    }
  };

  const s = styles(colors);
  const available = earnings?.availableBalance ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => (step === 1 ? navigation.goBack() : setStep((step - 1) as Step))} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Withdraw Funds</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step 4: Result */}
      {step === 4 && (
        <View style={s.resultWrap}>
          {success ? (
            <>
              <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
              <Text style={s.resultTitle}>Withdrawal Initiated!</Text>
              <Text style={s.resultBody}>
                GHS {parseFloat(amount).toFixed(2)} sent to{' '}
                {method === 'MOMO' ? selectedNetwork.name : selectedBank?.name}{'\n'}
                {method === 'MOMO' ? phoneNumber : accountNumber}
              </Text>
              <Text style={s.resultSub}>Processing time: 1–5 minutes</Text>
              <Pressable onPress={() => navigation.goBack()} style={s.resultBtn}>
                <Text style={s.resultBtnText}>Back to Profile</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="close-circle" size={80} color="#DC2626" />
              <Text style={s.resultTitle}>Withdrawal Failed</Text>
              <Text style={s.resultBody}>{errorMessage}</Text>
              <Pressable onPress={() => setStep(3)} style={s.resultBtn}>
                <Text style={s.resultBtnText}>Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {step !== 4 && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Step indicator */}
          <View style={s.stepRow}>
            {[1, 2, 3].map(n => (
              <View key={n} style={s.stepItem}>
                <View style={[s.stepDot, step >= n && s.stepDotActive]}>
                  <Text style={[s.stepNum, step >= n && s.stepNumActive]}>{n}</Text>
                </View>
                <Text style={[s.stepLabel, step >= n && s.stepLabelActive]}>
                  {n === 1 ? 'Method' : n === 2 ? 'Details' : 'Amount'}
                </Text>
                {n < 3 && <View style={[s.stepLine, step > n && s.stepLineActive]} />}
              </View>
            ))}
          </View>

          {/* Step 1: Method */}
          {step === 1 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Select Payment Method</Text>
              <View style={s.methodRow}>
                {(['MOMO', 'BANK'] as Method[]).map(m => (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[s.methodCard, method === m && s.methodCardActive]}
                  >
                    <Text style={s.methodEmoji}>{m === 'MOMO' ? '📱' : '🏦'}</Text>
                    <Text style={[s.methodLabel, method === m && s.methodLabelActive]}>
                      {m === 'MOMO' ? 'Mobile Money' : 'Bank Account'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.balanceCard}>
                <Text style={s.balanceLabel}>Available Balance</Text>
                <Text style={s.balanceValue}>GHS {available.toFixed(2)}</Text>
              </View>
              <Pressable onPress={() => setStep(2)} style={s.nextBtn}>
                <Text style={s.nextBtnText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* Step 2: Details */}
          {step === 2 && method === 'MOMO' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Mobile Money Details</Text>
              <Text style={s.fieldLabel}>Select Network</Text>
              <View style={s.networkList}>
                {NETWORKS.map(net => (
                  <Pressable
                    key={net.id}
                    onPress={() => setSelectedNetwork(net)}
                    style={[s.networkRow, selectedNetwork.id === net.id && s.networkRowActive]}
                  >
                    <LogoImage logoKey={net.logoKey} type="network" color={net.color} initial={net.name.charAt(0)} size={40} radius={8} />
                    <Text style={s.networkName}>{net.name}</Text>
                    {selectedNetwork.id === net.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#1A6B2E" />
                    )}
                  </Pressable>
                ))}
              </View>
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Phone Number</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 0241234567"
                placeholderTextColor={colors.secondaryText}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
              />
              <Pressable
                onPress={() => setStep(3)}
                disabled={!canProceedStep2()}
                style={[s.nextBtn, !canProceedStep2() && s.nextBtnDisabled]}
              >
                <Text style={s.nextBtnText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {step === 2 && method === 'BANK' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Bank Account Details</Text>
              <Text style={s.fieldLabel}>Select Bank</Text>
              <Pressable onPress={() => setShowBankModal(true)} style={s.bankSelector}>
                {selectedBank ? (
                  <View style={s.bankSelectorInner}>
                    <LogoImage logoKey={selectedBank.logoKey} type="bank" color={selectedBank.color} initial={selectedBank.name.charAt(0)} size={40} radius={8} />
                    <Text style={s.bankSelectorName}>{selectedBank.name}</Text>
                  </View>
                ) : (
                  <Text style={s.bankSelectorPlaceholder}>Tap to select a bank</Text>
                )}
                <Ionicons name="chevron-down" size={18} color={colors.secondaryText} />
              </Pressable>

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Account Number</Text>
              <TextInput
                style={s.input}
                placeholder="10-digit account number"
                placeholderTextColor={colors.secondaryText}
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
                maxLength={10}
              />

              <Text style={[s.fieldLabel, { marginTop: 12 }]}>Account Name</Text>
              <View style={s.verifyWrap}>
                <TextInput
                  style={[s.input, { borderColor: verified ? '#16A34A' : colors.border }]}
                  value={verifying ? 'Verifying...' : accountName}
                  editable={false}
                  placeholder="Auto-filled after verification"
                  placeholderTextColor={colors.secondaryText}
                />
                {verifying && <ActivityIndicator style={s.verifyIcon} color="#1A6B2E" />}
                {!verifying && accountNumber.length === 10 && verified && (
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" style={s.verifyIcon} />
                )}
                {!verifying && accountNumber.length === 10 && !verified && (
                  <Ionicons name="close-circle" size={20} color="#DC2626" style={s.verifyIcon} />
                )}
              </View>

              <Pressable
                onPress={() => setStep(3)}
                disabled={!canProceedStep2()}
                style={[s.nextBtn, !canProceedStep2() && s.nextBtnDisabled]}
              >
                <Text style={s.nextBtnText}>Continue</Text>
              </Pressable>

              <Modal visible={showBankModal} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                  <View style={s.bankModalHeader}>
                    <Text style={s.bankModalTitle}>Select Bank</Text>
                    <Pressable onPress={() => setShowBankModal(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                  </View>
                  <View style={{ paddingHorizontal: 16 }}>
                    <TextInput
                      placeholder="Search bank..."
                      placeholderTextColor={colors.secondaryText}
                      value={bankSearch}
                      onChangeText={setBankSearch}
                      style={s.bankSearchInput}
                    />
                  </View>
                  <FlatList
                    data={GHANA_BANKS.filter(b =>
                      b.name.toLowerCase().includes(bankSearch.toLowerCase())
                    )}
                    keyExtractor={b => b.code}
                    renderItem={({ item: bank }) => (
                      <Pressable
                        onPress={() => { setSelectedBank(bank); setShowBankModal(false); setBankSearch(''); }}
                        style={s.bankListRow}
                      >
                        <LogoImage logoKey={bank.logoKey} type="bank" color={bank.color} initial={bank.name.charAt(0)} size={40} radius={8} />
                        <Text style={s.bankListName}>{bank.name}</Text>
                      </Pressable>
                    )}
                  />
                </SafeAreaView>
              </Modal>
            </View>
          )}

          {/* Step 3: Amount + confirm */}
          {step === 3 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Enter Amount</Text>
              <View style={s.balanceCard}>
                <Text style={s.balanceLabel}>Available</Text>
                <Text style={s.balanceValue}>GHS {available.toFixed(2)}</Text>
              </View>

              <Text style={s.fieldLabel}>Amount (GHS)</Text>
              <TextInput
                style={s.input}
                placeholder="Minimum GHS 10.00"
                placeholderTextColor={colors.secondaryText}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              {parseFloat(amount) > available && (
                <Text style={s.amountError}>Exceeds available balance</Text>
              )}

              {canProceedStep3() && (
                <View style={s.confirmCard}>
                  <Text style={s.confirmTitle}>Confirm Withdrawal</Text>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Method</Text>
                    <Text style={s.confirmValue}>{method === 'MOMO' ? selectedNetwork.name : selectedBank?.name}</Text>
                  </View>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>{method === 'MOMO' ? 'Number' : 'Account'}</Text>
                    <Text style={s.confirmValue}>{method === 'MOMO' ? phoneNumber : accountNumber}</Text>
                  </View>
                  {method === 'BANK' && accountName ? (
                    <View style={s.confirmRow}>
                      <Text style={s.confirmLabel}>Name</Text>
                      <Text style={s.confirmValue}>{accountName}</Text>
                    </View>
                  ) : null}
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Amount</Text>
                    <Text style={[s.confirmValue, { color: '#1A6B2E', fontSize: 16, fontWeight: '700' }]}>
                      GHS {parseFloat(amount).toFixed(2)}
                    </Text>
                  </View>
                  <View style={s.confirmButtons}>
                    <Pressable onPress={() => setStep(2)} style={s.cancelBtn}>
                      <Text style={s.cancelBtnText}>Back</Text>
                    </Pressable>
                    <Pressable onPress={handleWithdraw} disabled={withdrawing} style={s.confirmBtn}>
                      {withdrawing ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Confirm</Text>}
                    </Pressable>
                  </View>
                </View>
              )}

              {!canProceedStep3() && (
                <Pressable
                  disabled
                  style={[s.nextBtn, s.nextBtnDisabled]}
                >
                  <Text style={s.nextBtnText}>Confirm</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function styles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 0,
    },
    stepItem: { alignItems: 'center', position: 'relative', flex: 1 },
    stepDot: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.inputBackground,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    stepDotActive: { backgroundColor: '#1A6B2E', borderColor: '#1A6B2E' },
    stepNum: { fontSize: 13, fontWeight: '700', color: colors.secondaryText },
    stepNumActive: { color: '#fff' },
    stepLabel: { fontSize: 11, color: colors.secondaryText, marginTop: 4 },
    stepLabelActive: { color: '#1A6B2E', fontWeight: '600' },
    stepLine: {
      position: 'absolute',
      top: 16, right: -30,
      width: 60, height: 2,
      backgroundColor: colors.border,
    },
    stepLineActive: { backgroundColor: '#1A6B2E' },
    section: { paddingHorizontal: 16, paddingTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    methodRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    methodCard: {
      flex: 1, padding: 20, borderRadius: 16, alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 2, borderColor: colors.border,
    },
    methodCardActive: { backgroundColor: '#E8F5E9', borderColor: '#1A6B2E' },
    methodEmoji: { fontSize: 32, marginBottom: 8 },
    methodLabel: { fontSize: 14, fontWeight: '600', color: colors.secondaryText },
    methodLabelActive: { color: '#1A6B2E' },
    balanceCard: {
      backgroundColor: '#E8F5E9', borderRadius: 14, padding: 16,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 20,
    },
    balanceLabel: { fontSize: 14, color: '#1A6B2E', fontWeight: '600' },
    balanceValue: { fontSize: 20, fontWeight: '800', color: '#1A6B2E' },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.secondaryText, marginBottom: 8 },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      padding: 13, fontSize: 15, color: colors.text,
      backgroundColor: colors.inputBackground, marginBottom: 4,
    },
    networkList: { gap: 8, marginBottom: 4 },
    networkRow: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.inputBackground, gap: 12,
    },
    networkRowActive: { borderColor: '#1A6B2E', backgroundColor: '#E8F5E9' },
    networkDot: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    networkLetter: { color: '#fff', fontWeight: '700', fontSize: 16 },
    networkName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
    bankSelector: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      padding: 13, backgroundColor: colors.inputBackground,
    },
    bankSelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bankSelectorName: { fontSize: 14, fontWeight: '600', color: colors.text },
    bankSelectorPlaceholder: { fontSize: 14, color: colors.secondaryText },
    verifyWrap: { position: 'relative', marginBottom: 4 },
    verifyIcon: { position: 'absolute', right: 12, top: 14 },
    amountError: { fontSize: 12, color: '#DC2626', marginBottom: 8 },
    confirmCard: {
      backgroundColor: '#F0FFF4', borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: '#1A6B2E', marginTop: 16,
    },
    confirmTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    confirmRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: 6,
      borderBottomWidth: 0.5, borderBottomColor: '#D1FAE5',
    },
    confirmLabel: { fontSize: 13, color: '#6B7280' },
    confirmValue: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right', marginLeft: 8 },
    confirmButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    },
    cancelBtnText: { color: colors.secondaryText, fontWeight: '600', fontSize: 15 },
    confirmBtn: {
      flex: 1, padding: 14, borderRadius: 12,
      backgroundColor: '#1A6B2E', alignItems: 'center',
    },
    confirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    nextBtn: {
      backgroundColor: '#1A6B2E', borderRadius: 14,
      padding: 16, alignItems: 'center', marginTop: 20,
    },
    nextBtnDisabled: { backgroundColor: '#E5E7EB' },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    bankModalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    bankModalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    bankSearchInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 12,
      padding: 12, marginBottom: 12, color: colors.text,
      backgroundColor: colors.inputBackground, fontSize: 15,
    },
    bankListRow: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      borderBottomWidth: 0.5, borderBottomColor: colors.border, gap: 12,
    },
    bankListName: { fontSize: 14, fontWeight: '500', color: colors.text },
    resultWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    resultTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, color: colors.text },
    resultBody: {
      fontSize: 14, color: colors.secondaryText, textAlign: 'center',
      marginTop: 8, lineHeight: 22,
    },
    resultSub: { fontSize: 12, color: colors.secondaryText, marginTop: 8 },
    resultBtn: {
      marginTop: 24, paddingVertical: 14, paddingHorizontal: 32,
      backgroundColor: '#1A6B2E', borderRadius: 14,
    },
    resultBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  });
}

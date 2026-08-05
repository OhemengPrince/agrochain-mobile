import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  getMySubscription,
  initiateSubscription,
  verifySubscription,
  cancelSubscription,
  Subscription,
  SubscriptionPlan,
  BillingCycle,
} from '../../api/subscriptionApi';

const PLANS: { key: SubscriptionPlan; label: string }[] = [
  { key: 'FREE', label: 'Free' },
  { key: 'PRO', label: 'Pro' },
  { key: 'BUSINESS', label: 'Business' },
];

const PRICING: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  PRO: { monthly: 2, yearly: 18 },
  BUSINESS: { monthly: 5, yearly: 45 },
};

const BENEFITS: Partial<Record<UserRole, Record<SubscriptionPlan, string[]>>> = {
  FARMER: {
    FREE: ['Up to 3 produce listings'],
    PRO: ['Unlimited listings', 'Verified badge', '10% commission'],
    BUSINESS: ['Featured listings', 'Advanced analytics', '7% commission'],
  },
  EQUIPMENT_OWNER: {
    FREE: ['Up to 2 equipment listings'],
    PRO: ['Up to 10 listings', 'Verified badge', '10% commission'],
    BUSINESS: ['Unlimited listings', 'Featured listings', '7% commission'],
  },
  BUYER: {
    FREE: ['Browse and purchase'],
    PRO: ['Verified badge', '10% transaction fee', 'Early access'],
    BUSINESS: ['Bulk discounts', '7% transaction fee', 'Dedicated support'],
  },
};

// GENERAL accounts shop the marketplace the same way buyers do, so they get
// the same benefit tiers as BUYER.
BENEFITS.GENERAL = BENEFITS.BUYER;

function extractReference(url: string): string | null {
  const match = url.match(/[?&]reference=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function SubscriptionScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [billing, setBilling] = useState<BillingCycle>('MONTHLY');
  const [subscribingPlan, setSubscribingPlan] = useState<SubscriptionPlan | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadSubscription = useCallback(async () => {
    try {
      const res = await getMySubscription();
      setSubscription(res.data);
    } catch {
      setSubscription({ plan: 'FREE', status: 'ACTIVE' });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Refresh whenever the screen is visited, not just on first mount.
  useFocusEffect(
    useCallback(() => {
      loadSubscription();
    }, [loadSubscription])
  );

  const handleVerify = useCallback(async (reference: string) => {
    setVerifying(true);
    try {
      await verifySubscription(reference);
      Alert.alert('Success', 'Your subscription has been activated!');
      loadSubscription();
    } catch {
      Alert.alert('Error', 'Could not verify your payment. If you were charged, please contact support.');
    } finally {
      setVerifying(false);
    }
  }, [loadSubscription]);

  // Deep-link callback after the user completes checkout in the browser.
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const reference = extractReference(url);
      if (reference) handleVerify(reference);
    };

    const urlListener = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => urlListener.remove();
  }, [handleVerify]);

  const handleSubscribe = async (plan: SubscriptionPlan, cycle: BillingCycle) => {
    try {
      setSubscribingPlan(plan);
      const response = await initiateSubscription(plan, cycle);
      const { authorizationUrl } = response.data;
      if (!authorizationUrl) throw new Error('No payment URL returned');
      await Linking.openURL(authorizationUrl);
    } catch (e) {
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    } finally {
      setSubscribingPlan(null);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'No refund — active until expiry date.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await cancelSubscription();
              setSubscription(res.data);
              Alert.alert('Cancelled', 'Your subscription has been cancelled.');
            } catch {
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const currentPlan = subscription?.plan ?? 'FREE';
  const isPaidPlan = currentPlan !== 'FREE' && subscription?.status === 'ACTIVE';
  const roleBenefits = (user?.role && BENEFITS[user.role]) || BENEFITS.BUYER!;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.primaryGreen, colors.primaryGreenLight]}
        style={[styles.hero, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.backRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.iconBadge}>
            <Ionicons name="diamond-outline" size={26} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>AgroChain Pro</Text>
          <Text style={styles.heroSubtitle}>Unlock more listings, lower fees and a verified badge</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.card}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Current status ── */}
        {loadingStatus ? (
          <ActivityIndicator color={colors.primaryGreen} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Current Plan</Text>
              <Text style={styles.statusValuePlan}>{PLANS.find((p) => p.key === currentPlan)?.label ?? currentPlan}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={[styles.statusBadge, subscription?.status === 'ACTIVE' && styles.statusBadgeActive]}>
                <Text style={[styles.statusBadgeText, subscription?.status === 'ACTIVE' && styles.statusBadgeTextActive]}>
                  {subscription?.status ?? 'ACTIVE'}
                </Text>
              </View>
            </View>
            {!!subscription?.expiresAt && (
              <>
                <View style={styles.statusDivider} />
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Expiry Date</Text>
                  <Text style={styles.statusValue}>{formatDate(subscription.expiresAt)}</Text>
                </View>
              </>
            )}

            {isPaidPlan && (
              <Pressable onPress={handleCancel} disabled={cancelling} style={styles.cancelButton}>
                {cancelling ? (
                  <ActivityIndicator size="small" color={colors.errorRed} />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {verifying && (
          <View style={styles.verifyingBanner}>
            <ActivityIndicator size="small" color={colors.primaryGreen} />
            <Text style={styles.verifyingText}>Verifying your payment…</Text>
          </View>
        )}

        {/* ── Billing toggle ── */}
        <View style={styles.billingToggle}>
          {(['MONTHLY', 'YEARLY'] as BillingCycle[]).map((cycle) => (
            <Pressable
              key={cycle}
              onPress={() => setBilling(cycle)}
              style={[styles.billingOption, billing === cycle && styles.billingOptionActive]}
            >
              <Text style={[styles.billingOptionText, billing === cycle && styles.billingOptionTextActive]}>
                {cycle === 'MONTHLY' ? 'Monthly' : 'Yearly'}
              </Text>
              {cycle === 'YEARLY' && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 25%</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* ── Plans ── */}
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key && subscription?.status === 'ACTIVE';
          const price = PRICING[plan.key][billing === 'MONTHLY' ? 'monthly' : 'yearly'];
          const priceLabel = plan.key === 'FREE' ? 'GHS 0' : `GHS ${price}`;
          const periodLabel = plan.key === 'FREE' ? '' : billing === 'MONTHLY' ? '/month' : '/year';
          const benefits = roleBenefits[plan.key] ?? [];
          const busy = subscribingPlan === plan.key;

          return (
            <View key={plan.key} style={[styles.planCard, isCurrent && styles.planCardActive]}>
              <View style={styles.planHeaderRow}>
                <Text style={styles.planName}>{plan.label}</Text>
                {isCurrent && (
                  <View style={styles.currentPill}>
                    <Ionicons name="checkmark-circle" size={13} color="#fff" />
                    <Text style={styles.currentPillText}>Current Plan</Text>
                  </View>
                )}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>{priceLabel}</Text>
                {!!periodLabel && <Text style={styles.pricePeriod}>{periodLabel}</Text>}
              </View>

              <View style={styles.benefitsList}>
                {benefits.map((b) => (
                  <View key={b} style={styles.benefitRow}>
                    <Ionicons name="checkmark" size={15} color={colors.primaryGreen} />
                    <Text style={styles.benefitText}>{b}</Text>
                  </View>
                ))}
              </View>

              {plan.key !== 'FREE' && !isCurrent && (
                <Pressable
                  onPress={() => handleSubscribe(plan.key, billing)}
                  disabled={busy}
                  style={styles.subscribeButtonWrap}
                >
                  <LinearGradient
                    colors={[colors.primaryGreen, colors.primaryGreenLight]}
                    style={[styles.subscribeButton, busy && { opacity: 0.7 }]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.subscribeButtonText}>
                        {currentPlan === 'FREE' ? 'Subscribe' : 'Upgrade'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: { alignItems: 'center', paddingBottom: 24, paddingHorizontal: 12 },
    backRow: { width: '100%', flexDirection: 'row', marginBottom: 4 },
    backButton: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
    },
    heroContent: { alignItems: 'center', paddingHorizontal: 32, marginTop: 2 },
    iconBadge: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.20)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center',
      marginBottom: 10,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4, lineHeight: 18 },
    card: { flex: 1, backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 },
    content: { paddingHorizontal: 20, paddingTop: 24 },

    statusCard: {
      backgroundColor: colors.inputBackground,
      borderRadius: 18,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    statusLabel: { fontSize: 13, color: colors.secondaryText, fontWeight: '600' },
    statusValue: { fontSize: 13, fontWeight: '700', color: colors.text },
    statusValuePlan: { fontSize: 14, fontWeight: '800', color: colors.primaryGreen },
    statusDivider: { height: 1, backgroundColor: colors.divider },
    statusBadge: { backgroundColor: colors.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    statusBadgeActive: { backgroundColor: '#E8F5E9' },
    statusBadgeText: { fontSize: 11, fontWeight: '700', color: colors.secondaryText },
    statusBadgeTextActive: { color: '#16A34A' },
    cancelButton: {
      marginTop: 12, borderWidth: 1.5, borderColor: colors.errorRed, borderRadius: 12,
      paddingVertical: 12, alignItems: 'center',
    },
    cancelButtonText: { color: colors.errorRed, fontSize: 13, fontWeight: '700' },

    verifyingBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.lightGreen, borderRadius: 12, padding: 12, marginBottom: 16,
    },
    verifyingText: { fontSize: 12, fontWeight: '600', color: colors.text },

    billingToggle: {
      flexDirection: 'row', backgroundColor: colors.inputBackground, borderRadius: 14,
      padding: 4, marginBottom: 20,
    },
    billingOption: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: 11,
    },
    billingOptionActive: { backgroundColor: colors.card },
    billingOptionText: { fontSize: 13, fontWeight: '700', color: colors.secondaryText },
    billingOptionTextActive: { color: colors.primaryGreen },
    saveBadge: { backgroundColor: colors.accentAmber, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    planCard: {
      borderRadius: 20, padding: 18, marginBottom: 16,
      borderWidth: 1.5, borderColor: colors.divider, backgroundColor: colors.card,
    },
    planCardActive: { borderColor: colors.primaryGreen, backgroundColor: colors.lightGreen },
    planHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    planName: { fontSize: 17, fontWeight: '800', color: colors.text },
    currentPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primaryGreen, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    currentPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 14 },
    priceValue: { fontSize: 24, fontWeight: '800', color: colors.text },
    pricePeriod: { fontSize: 13, color: colors.secondaryText, marginBottom: 3 },
    benefitsList: { gap: 8, marginBottom: 14 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    benefitText: { fontSize: 13, color: colors.text, flex: 1 },
    subscribeButtonWrap: { marginTop: 4 },
    subscribeButton: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    subscribeButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}

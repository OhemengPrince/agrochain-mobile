import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getBatchById } from '../../api/produceApi';
import { formatDate, formatCurrency, getCropEmoji } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ProduceDetail'>;

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

export default function ProduceDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { batchId } = route.params;
  const [batch, setBatch] = useState<ProduceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBatchById(batchId);
        setBatch(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load produce details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  const contactPress = usePressAnimation();

  const handleContact = () => {
    if (!batch) return;
    navigation.navigate('Chat', { name: batch.farmerName, role: 'Farmer' });
  };

  const handleDownloadReport = () => {
    Alert.alert('Download PDF Report', 'PDF report generation is coming soon. This is a placeholder action.');
  };

  if (loading) {
    return <LoadingOverlay message="Loading produce details..." />;
  }

  if (!batch) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Produce batch not found.'} />
      </SafeAreaView>
    );
  }

  const batchRef = batch.id.slice(-6).toUpperCase();
  const farmerInitial = batch.farmerName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.headerRef}>REF #{batchRef}</Text>
        </View>
        <View style={styles.headerCropRow}>
          <Text style={styles.headerEmoji}>{getCropEmoji(batch.cropName)}</Text>
          <View>
            <Text style={styles.headerTitle}>{batch.cropName}</Text>
            {batch.variety ? <Text style={styles.headerVariety}>{batch.variety}</Text> : null}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ErrorMessage message={error} />

        {/* FARMER CARD */}
        <View style={styles.card}>
          <View style={styles.farmerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{farmerInitial}</Text>
            </View>
            <View style={styles.farmerBody}>
              <View style={styles.farmerNameRow}>
                <Text style={styles.farmerName}>{batch.farmerName}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.primaryGreen} />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.farmerRegion}>{batch.district}, {batch.region}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.accentAmber} />
                <Text style={styles.ratingText}>4.7</Text>
                <Text style={styles.ratingSubtext}>(illustrative rating)</Text>
              </View>
            </View>
          </View>
          <Animated.View style={{ transform: [{ scale: contactPress.scale }], opacity: contactPress.opacity }}>
            <Pressable
              style={styles.contactButtonSmall}
              onPress={handleContact}
              onPressIn={contactPress.onPressIn}
              onPressOut={contactPress.onPressOut}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color={colors.white} />
              <Text style={styles.contactButtonSmallText}>Contact</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* PRODUCE INFO */}
        <Text style={styles.sectionTitle}>Produce Info</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Crop</Text>
            <Text style={styles.value}>{batch.cropName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{batch.quantityKg} kg</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Harvest Date</Text>
            <Text style={styles.value}>
              {batch.harvestedDate ? formatDate(batch.harvestedDate) : 'Not yet harvested'}
            </Text>
          </View>
          <View style={[styles.row, !batch.pricePerKg && styles.rowLast]}>
            <Text style={styles.label}>Farm Location</Text>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={styles.locationValueRow}>
                <Ionicons name="location" size={13} color={colors.secondaryText} />
                <Text style={styles.value}>{batch.district}, {batch.region}</Text>
              </View>
              <Pressable
                style={styles.viewMapBtn}
                onPress={() => navigation.navigate('Map', {
                  title: batch.cropName,
                  subtitle: 'Farm',
                  district: batch.district,
                  region: batch.region,
                })}
              >
                <Ionicons name="map" size={11} color={colors.primaryGreen} />
                <Text style={[styles.viewMapText, { color: colors.primaryGreen }]}>View on Map</Text>
              </Pressable>
            </View>
          </View>
          {batch.pricePerKg !== undefined && (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>Price</Text>
              <Text style={styles.priceValue}>{formatCurrency(batch.pricePerKg)}/kg</Text>
            </View>
          )}
        </View>

        {/* TRACEABILITY TIMELINE */}
        <Text style={styles.sectionTitle}>Traceability Timeline</Text>
        {batch.processingStages.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No processing stages recorded yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {batch.processingStages.map((stage, index) => (
              <View
                key={stage.id}
                style={[styles.timelineItem, index === batch.processingStages.length - 1 && styles.rowLast]}
              >
                <View style={styles.timelineDotColumn}>
                  <View style={styles.timelineDot}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  </View>
                  {index !== batch.processingStages.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.stageName}>{stage.stageName}</Text>
                  <Text style={styles.stageDescription}>{stage.description}</Text>
                  <Text style={styles.stageDate}>{formatDate(stage.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* INPUTS USED */}
        <Text style={styles.sectionTitle}>Inputs Used</Text>
        {batch.inputs.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No inputs recorded for this batch.</Text>
          </View>
        ) : (
          <View style={styles.chipsWrap}>
            {batch.inputs.map((input, index) => (
              <View key={`${input.name}-${index}`} style={styles.inputChip}>
                <Ionicons name="flask-outline" size={13} color={colors.primaryGreen} />
                <Text style={styles.inputChipText}>{input.name} • {input.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CERTIFICATIONS */}
        <Text style={styles.sectionTitle}>Certifications</Text>
        <View style={styles.certRow}>
          <View style={styles.certBadge}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primaryGreen} />
            <Text style={styles.certBadgeText}>Quality Assured</Text>
          </View>
          <View style={styles.certBadge}>
            <Ionicons name="leaf" size={16} color={colors.primaryGreen} />
            <Text style={styles.certBadgeText}>Organic Practices</Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsSection}>
          <AppButton title="Contact Farmer" onPress={handleContact} style={styles.actionButton} />
          <AppButton
            title="Download PDF Report"
            onPress={handleDownloadReport}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
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
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRef: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.5,
    },
    headerCropRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
    },
    headerEmoji: {
      fontSize: 36,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.white,
    },
    headerVariety: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 120,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      ...cardShadow,
    },
    farmerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    avatarCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.white,
    },
    farmerBody: {
      flex: 1,
    },
    farmerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    farmerName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.lightGreen,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    verifiedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    farmerRegion: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 3,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    ratingText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    ratingSubtext: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    contactButtonSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primaryGreen,
      borderRadius: 12,
      paddingVertical: 10,
      marginTop: 14,
    },
    contactButtonSmallText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    label: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    value: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    locationValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    priceValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 13,
    },
    timelineItem: {
      flexDirection: 'row',
      paddingBottom: 14,
    },
    timelineDotColumn: {
      alignItems: 'center',
      marginRight: 12,
    },
    timelineDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginTop: 4,
    },
    timelineBody: {
      flex: 1,
      paddingTop: 1,
    },
    stageName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    stageDescription: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    stageDate: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    inputChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.lightGreen,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inputChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    certRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 8,
    },
    certBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    certBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    actionsSection: {
      marginTop: 12,
      gap: 12,
    },
    actionButton: {
      width: '100%',
    },
    viewMapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewMapText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
}

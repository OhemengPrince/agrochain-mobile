import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Animated, Share, Alert, Platform, Image, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { FarmerStackParamList, ProduceBatch, BatchStatus } from '../../types';
import { getBatchById, addProcessingStage, updateBatchStatus } from '../../api/produceApi';
import { formatDate } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'BatchDetail'>;

const STATUS_OPTIONS: BatchStatus[] = ['PLANTED', 'GROWING', 'HARVESTED', 'PROCESSING', 'READY_FOR_SALE', 'SOLD'];

interface CropMeta {
  emoji: string;
  color: string;
}

const CROP_META: Record<string, CropMeta> = {
  maize: { emoji: '🌽', color: '#FBC02D' },
  cassava: { emoji: '🍠', color: '#FB8C00' },
  cocoa: { emoji: '🍫', color: '#6D4C41' },
  tomato: { emoji: '🍅', color: '#E53935' },
  plantain: { emoji: '🍌', color: '#9E9D24' },
  pineapple: { emoji: '🍍', color: '#43A047' },
};

const DEFAULT_CROP_META: CropMeta = { emoji: '🌱', color: '#43A047' };

function getCropMeta(cropName: string): CropMeta {
  const lower = cropName.toLowerCase();
  const match = Object.keys(CROP_META).find((key) => lower.includes(key));
  return match ? CROP_META[match] : DEFAULT_CROP_META;
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
    scale,
    opacity,
    onPressIn: () => animateTo(0.97, 0.95, 100),
    onPressOut: () => animateTo(1, 1, 150),
  };
}

function AnimatedPressable({
  onPress,
  style,
  disabled,
  children,
}: {
  onPress: () => void;
  style?: any;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();
  const flattenedFlex = Array.isArray(style) ? style.find((s) => s?.flex)?.flex : style?.flex;
  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, flattenedFlex ? { flex: flattenedFlex } : null]}>
      <Pressable style={style} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function BatchDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { batchId } = route.params;
  const [batch, setBatch] = useState<ProduceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState('');
  const [stageDescription, setStageDescription] = useState('');
  const [showAddStage, setShowAddStage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadBatch = async () => {
    setError(null);
    try {
      const data = await getBatchById(batchId);
      setBatch(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load batch.');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadBatch(); } finally { setLoading(false); }
    })();
  }, [batchId]);

  const handleAddStage = async () => {
    if (!stageName || !stageDescription) {
      setError('Please enter a stage name and description.');
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      const updated = await addProcessingStage(batchId, {
        stageName,
        description: stageDescription,
      });
      setBatch(updated);
      setStageName('');
      setStageDescription('');
      setShowAddStage(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add processing stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: BatchStatus, pricePerKg?: number) => {
    if (!batch || batch.status === status) return;
    setError(null);
    setActionLoading(true);
    try {
      const updated = await updateBatchStatus(batchId, status, pricePerKg);
      setBatch(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // READY_FOR_SALE needs a price before it can go out — collect it inline,
  // right under the status chips, rather than updating right away. (A modal
  // here fought with the keyboard too unreliably; an inline box behaves
  // exactly like the existing "Add Stage" box, which already works fine.)
  const handleStatusChipPress = (status: BatchStatus) => {
    if (status === 'READY_FOR_SALE') {
      setPriceError(null);
      setPriceInput(batch?.pricePerKg?.toString() ?? '');
      setShowPriceInput(true);
      // Wait for the box (and the keyboard, from TextInput's autoFocus) to
      // actually mount/open before scrolling, or there's nothing yet to
      // scroll to.
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      return;
    }
    handleUpdateStatus(status);
  };

  const handlePostPrice = async () => {
    const price = Number(priceInput);
    if (!priceInput.trim() || Number.isNaN(price) || price <= 0) {
      setPriceError('Please enter a valid price.');
      return;
    }
    setShowPriceInput(false);
    await handleUpdateStatus('READY_FOR_SALE', price);
    Alert.alert('Success', `Batch marked as Ready for Sale at GHS ${price}/kg!`);
  };

  const handleShareQr = async () => {
    if (!batch) return;
    try {
      await Share.share({ message: batch.qrCodeValue || String(batch.id ?? '') || 'AGROCHAIN-UNKNOWN' });
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    Alert.alert('Download', 'Coming soon.');
  };

  if (loading) {
    return <LoadingOverlay message="Loading batch..." />;
  }

  if (!batch) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Batch not found.'} />
      </SafeAreaView>
    );
  }

  const cropMeta = getCropMeta(batch.cropName);
  const shortRef = String(batch.id).slice(-6).toUpperCase();
  const qrValue = batch.qrCodeValue || String(batch.id ?? '') || 'AGROCHAIN-UNKNOWN';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
        <Text style={styles.headerTitle}>Batch Details</Text>
        <Text style={styles.headerRef}>REF #{shortRef}</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
        <ErrorMessage message={error} />

        <View style={styles.card}>
          <View style={styles.qrBorderWrap}>
            <QRCode value={qrValue} size={180} />
          </View>
          <Text style={styles.batchIdText}>{batch.id}</Text>

          <View style={styles.qrButtonsRow}>
            <AnimatedPressable style={styles.outlineButton} onPress={handleShareQr}>
              <Ionicons name="share-social-outline" size={16} color={colors.primaryGreen} />
              <Text style={styles.outlineButtonText}>Share QR</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.outlineButton} onPress={handleDownload}>
              <Ionicons name="download-outline" size={16} color={colors.primaryGreen} />
              <Text style={styles.outlineButtonText}>Download</Text>
            </AnimatedPressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cropInfoRow}>
            <View style={[styles.cropCircle, { backgroundColor: `${cropMeta.color}26` }]}>
              {batch.photoUrl ? (
                <Image source={{ uri: batch.photoUrl }} style={styles.cropPhoto} resizeMode="cover" />
              ) : (
                <Text style={styles.cropEmoji}>{cropMeta.emoji}</Text>
              )}
            </View>
            <View style={styles.cropInfoBody}>
              <Text style={styles.cropName}>{batch.cropName}</Text>
              {batch.variety ? <Text style={styles.variety}>{batch.variety}</Text> : null}
              <Text style={styles.cropMeta}>{batch.quantityKg} kg</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color={colors.secondaryText} />
                <Text style={styles.metaText}>{batch.district}, {batch.region}</Text>
              </View>
              <Pressable
                style={styles.metaRow}
                onPress={() => navigation.navigate('Map', {
                  title: batch.cropName,
                  subtitle: 'Farm',
                  district: batch.district,
                  region: batch.region,
                })}
              >
                <Ionicons name="map" size={12} color={colors.primaryGreen} />
                <Text style={[styles.metaText, { color: colors.primaryGreen, fontWeight: '600' }]}>View on Map</Text>
              </Pressable>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} />
                <Text style={styles.metaText}>{formatDate(batch.harvestedDate ?? batch.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Processing Timeline</Text>
          {batch.processingStages.length === 0 ? (
            <Text style={styles.emptyText}>No processing stages recorded yet.</Text>
          ) : (
            batch.processingStages.map((stage, index) => {
              const isLast = index === batch.processingStages.length - 1;
              return (
                <View key={stage.id} style={styles.timelineRow}>
                  <View style={styles.timelineDotWrap}>
                    <View style={[styles.timelineDot, styles.timelineDotGreen]} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineStage}>{stage.stageName}</Text>
                    <Text style={styles.timelineDate}>{formatDate(stage.timestamp)}</Text>
                    {stage.description ? <Text style={styles.timelineNotes}>{stage.description}</Text> : null}
                  </View>
                </View>
              );
            })
          )}

          {showAddStage ? (
            <View style={styles.addStageForm}>
              <TextInput
                style={styles.input}
                value={stageName}
                onChangeText={setStageName}
                placeholder="Stage name (e.g. Drying)"
                placeholderTextColor={colors.secondaryText}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={stageDescription}
                onChangeText={setStageDescription}
                placeholder="Description"
                placeholderTextColor={colors.secondaryText}
                multiline
              />
              <View style={styles.qrButtonsRow}>
                <AnimatedPressable style={styles.outlineButton} onPress={() => setShowAddStage(false)}>
                  <Text style={styles.outlineButtonText}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.outlineButton, styles.filledButton]}
                  onPress={handleAddStage}
                  disabled={actionLoading}
                >
                  <Text style={styles.filledButtonText}>{actionLoading ? 'Saving...' : 'Save Stage'}</Text>
                </AnimatedPressable>
              </View>
            </View>
          ) : (
            <AnimatedPressable style={styles.outlineButtonFull} onPress={() => setShowAddStage(true)}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primaryGreen} />
              <Text style={styles.outlineButtonText}>Add Stage</Text>
            </AnimatedPressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusChipsRow}>
            {STATUS_OPTIONS.map((status) => {
              const active = batch.status === status;
              return (
                <AnimatedPressable
                  key={status}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  onPress={() => handleStatusChipPress(status)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                    {status.replace(/_/g, ' ')}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {showPriceInput && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Set Price Per KG</Text>
            <Text style={styles.priceBoxSubtitle}>Enter your selling price per kilogram (GHS)</Text>
            <TextInput
              style={styles.priceBoxInput}
              value={priceInput}
              onChangeText={(v) => { setPriceInput(v); setPriceError(null); }}
              placeholder="0.00"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
              autoFocus
            />
            {priceError ? <Text style={styles.priceModalError}>{priceError}</Text> : null}
            <View style={styles.qrButtonsRow}>
              <AnimatedPressable style={styles.outlineButton} onPress={() => setShowPriceInput(false)}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.outlineButton, styles.filledButton]}
                onPress={handlePostPrice}
                disabled={actionLoading}
              >
                <Text style={styles.filledButtonText}>Post</Text>
              </AnimatedPressable>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
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
      paddingTop: 50,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 10,
    },
    headerRef: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
      fontWeight: '600',
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
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    qrBorderWrap: {
      alignSelf: 'center',
      padding: 12,
      borderWidth: 2,
      borderColor: colors.primaryGreen,
      borderRadius: 16,
    },
    batchIdText: {
      textAlign: 'center',
      marginTop: 12,
      fontSize: 13,
      color: colors.secondaryText,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    qrButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    outlineButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      borderRadius: 12,
      height: 46,
      backgroundColor: colors.card,
    },
    outlineButtonFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      borderRadius: 12,
      height: 48,
      backgroundColor: colors.card,
      marginTop: 12,
    },
    outlineButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    filledButton: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    filledButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    cropInfoRow: {
      flexDirection: 'row',
    },
    cropCircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      overflow: 'hidden',
    },
    cropEmoji: {
      fontSize: 26,
    },
    cropPhoto: {
      width: '100%',
      height: '100%',
    },
    cropInfoBody: {
      flex: 1,
    },
    cropName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    variety: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    cropMeta: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 13,
    },
    timelineRow: {
      flexDirection: 'row',
    },
    timelineDotWrap: {
      width: 24,
      alignItems: 'center',
    },
    timelineDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    timelineDotGreen: {
      backgroundColor: colors.primaryGreen,
    },
    timelineDotAmber: {
      backgroundColor: colors.accentAmber,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      backgroundColor: colors.border,
      marginTop: 2,
      minHeight: 30,
    },
    timelineBody: {
      flex: 1,
      paddingBottom: 16,
    },
    timelineStage: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    timelineDate: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    timelineNotes: {
      fontSize: 12,
      color: colors.secondaryText,
      fontStyle: 'italic',
      marginTop: 4,
    },
    addStageForm: {
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      fontSize: 15,
      marginBottom: 10,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    textArea: {
      height: 80,
      paddingTop: 10,
    },
    priceBoxSubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
      marginBottom: 16,
    },
    priceBoxInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 50,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    priceModalError: {
      fontSize: 12,
      color: colors.errorRed,
      marginTop: 8,
    },
    statusChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    statusChipActive: {
      backgroundColor: colors.primaryGreen,
      borderColor: colors.primaryGreen,
    },
    statusChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    statusChipTextActive: {
      color: '#FFFFFF',
    },
  });
}

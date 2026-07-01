import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Animated, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { FarmerStackParamList, InputItem } from '../../types';
import { createBatch } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'CreateBatch'>;

const CROP_CHIPS: { label: string; emoji: string }[] = [
  { label: 'Maize', emoji: '🌽' },
  { label: 'Cassava', emoji: '🍠' },
  { label: 'Cocoa', emoji: '🍫' },
  { label: 'Tomato', emoji: '🍅' },
  { label: 'Plantain', emoji: '🍌' },
  { label: 'Pineapple', emoji: '🍍' },
  { label: 'Other', emoji: '🌱' },
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

function StepIndicator({ step, styles }: { step: number; styles: ReturnType<typeof createStyles> }) {
  const steps = [
    { num: 1, label: 'Crop Info' },
    { num: 2, label: 'Location' },
    { num: 3, label: 'Inputs' },
  ];

  return (
    <View style={styles.progressRow}>
      {steps.map((s, idx) => {
        const isCompleted = step > s.num;
        const isActive = step === s.num;
        return (
          <React.Fragment key={s.num}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  isActive && styles.progressCircleActive,
                  isCompleted && styles.progressCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.progressCircleText, isActive && styles.progressCircleTextActive]}>
                    {s.num}
                  </Text>
                )}
              </View>
              <Text style={[styles.progressLabel, (isActive || isCompleted) && styles.progressLabelActive]}>
                {s.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={[styles.progressLine, step > s.num && styles.progressLineActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SubmitButton({
  title,
  onPress,
  loading,
  styles,
}: {
  title: string;
  onPress: () => void;
  loading: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={loading}>
        <LinearGradient colors={['#2E8B4A', '#1A6B2E']} style={[styles.submitButton, loading && styles.submitButtonDisabled]}>
          <Text style={styles.submitButtonText}>{loading ? 'Saving...' : title}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function LocationButton({
  onPress,
  loading,
  styles,
}: {
  onPress: () => void;
  loading: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (loading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.05, duration: 400, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [loading, pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Pressable style={styles.locationButton} onPress={onPress} disabled={loading}>
        <Ionicons name="location" size={16} color="#1A6B2E" />
        <Text style={styles.locationButtonText}>
          {loading ? 'Capturing location...' : 'Capture My Location'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CreateBatchScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [plantedDate] = useState(new Date().toISOString().slice(0, 10));
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [inputName, setInputName] = useState('');
  const [inputQuantity, setInputQuantity] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to photograph your harvest.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.82,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to choose a harvest image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.82,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const currentStep = !cropName || !quantityKg ? 1 : !region || !district ? 2 : 3;

  const handleCaptureLocation = () => {
    setCapturingLocation(true);
    setTimeout(() => {
      setRegion('Ashanti');
      setDistrict('Kumasi');
      setCapturingLocation(false);
    }, 1200);
  };

  const handleAddInput = () => {
    if (!inputName || !inputQuantity) return;
    setInputs((prev) => [...prev, { name: inputName, quantity: inputQuantity, appliedDate: new Date().toISOString().slice(0, 10) }]);
    setInputName('');
    setInputQuantity('');
  };

  const handleRemoveInput = (index: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setError(null);
    const quantity = parseFloat(quantityKg);
    if (!cropName || !quantityKg || !region || !district || Number.isNaN(quantity)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    setLoading(true);
    try {
      await createBatch({ cropName, variety, quantityKg: quantity, region, district, plantedDate, inputs });
      navigation.navigate('FarmerBatchesList');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Log New Harvest</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <StepIndicator step={currentStep} styles={styles} />

        <ErrorMessage message={error} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crop Info</Text>

          <Text style={styles.label}>Crop Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {CROP_CHIPS.map((chip) => {
              const active = cropName === chip.label;
              return (
                <Pressable
                  key={chip.label}
                  style={[styles.cropChip, active && styles.cropChipActive]}
                  onPress={() => setCropName(chip.label)}
                >
                  <Text style={styles.cropChipEmoji}>{chip.emoji}</Text>
                  <Text style={[styles.cropChipText, active && styles.cropChipTextActive]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Harvest Photo ── */}
          <Text style={styles.label}>Harvest Photo <Text style={styles.optionalTag}>(optional)</Text></Text>
          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <Pressable style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                <Ionicons name="close-circle" size={28} color="#fff" />
              </Pressable>
              <View style={styles.imagePreviewBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text style={styles.imagePreviewBadgeText}>Photo added</Text>
              </View>
            </View>
          ) : (
            <View style={styles.imagePickerRow}>
              <Pressable style={styles.imagePickerBtn} onPress={handleTakePhoto} activeOpacity={0.75}>
                <LinearGradient
                  colors={[colors.primaryGreen, colors.primaryGreenLight]}
                  style={styles.imagePickerBtnInner}
                >
                  <Ionicons name="camera-outline" size={22} color="#fff" />
                  <Text style={styles.imagePickerBtnText}>Camera</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.imagePickerBtn} onPress={handlePickFromGallery} activeOpacity={0.75}>
                <View style={[styles.imagePickerBtnInner, styles.imagePickerBtnGallery, { borderColor: colors.primaryGreen, backgroundColor: colors.lightGreen }]}>
                  <Ionicons name="images-outline" size={22} color={colors.primaryGreen} />
                  <Text style={[styles.imagePickerBtnText, { color: colors.primaryGreen }]}>Gallery</Text>
                </View>
              </Pressable>
            </View>
          )}

          <Text style={styles.label}>Variety (optional)</Text>
          <TextInput
            style={styles.input}
            value={variety}
            onChangeText={setVariety}
            placeholder="Obatanpa"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={styles.quantityInput}
              value={quantityKg}
              onChangeText={setQuantityKg}
              placeholder="500"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
            <Text style={styles.kgSuffix}>kg</Text>
          </View>

          <Text style={styles.label}>Harvest Date</Text>
          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={16} color={colors.primaryGreen} />
            <Text style={styles.dateDisplayText}>{plantedDate}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>

          <LocationButton onPress={handleCaptureLocation} loading={capturingLocation} styles={styles} />

          <Text style={styles.label}>Region</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="Ashanti"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>District</Text>
          <TextInput
            style={styles.input}
            value={district}
            onChangeText={setDistrict}
            placeholder="Kumasi"
            placeholderTextColor={colors.secondaryText}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inputs Used</Text>

          {inputs.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.inputRow}>
              <View style={styles.inputRowBody}>
                <Text style={styles.inputRowName}>{item.name}</Text>
                <Text style={styles.inputRowMeta}>{item.quantity} • {item.appliedDate}</Text>
              </View>
              <Pressable onPress={() => handleRemoveInput(index)}>
                <Ionicons name="trash-outline" size={18} color={colors.errorRed} />
              </Pressable>
            </View>
          ))}

          <View style={styles.addInputRow}>
            <TextInput
              style={[styles.input, styles.addInputField]}
              value={inputName}
              onChangeText={setInputName}
              placeholder="Seed / Fertiliser / Pesticide"
              placeholderTextColor={colors.secondaryText}
            />
            <TextInput
              style={[styles.input, styles.addInputQty]}
              value={inputQuantity}
              onChangeText={setInputQuantity}
              placeholder="Qty"
              placeholderTextColor={colors.secondaryText}
            />
            <Pressable style={styles.addInputButton} onPress={handleAddInput}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <SubmitButton title="Submit Harvest Log" onPress={handleCreate} loading={loading} styles={styles} />
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
      paddingTop: 50,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 120,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    progressStep: {
      alignItems: 'center',
      width: 80,
    },
    progressCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressCircleActive: {
      backgroundColor: colors.primaryGreen,
    },
    progressCircleCompleted: {
      backgroundColor: colors.primaryGreen,
    },
    progressCircleText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    progressCircleTextActive: {
      color: '#FFFFFF',
    },
    progressLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: 'center',
    },
    progressLabelActive: {
      color: colors.primaryGreen,
      fontWeight: '700',
    },
    progressLine: {
      height: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginTop: 13,
      marginHorizontal: -10,
    },
    progressLineActive: {
      backgroundColor: colors.primaryGreen,
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
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 12,
    },
    chipsRow: {
      flexGrow: 0,
    },
    cropChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 8,
      backgroundColor: colors.inputBackground,
    },
    cropChipActive: {
      backgroundColor: colors.lightGreen,
      borderColor: colors.primaryGreen,
    },
    cropChipEmoji: {
      fontSize: 16,
    },
    cropChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    cropChipTextActive: {
      color: colors.primaryGreen,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      paddingRight: 14,
    },
    quantityInput: {
      flex: 1,
      paddingHorizontal: 14,
      height: 48,
      fontSize: 15,
      color: colors.text,
    },
    kgSuffix: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    dateDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
      backgroundColor: colors.inputBackground,
    },
    dateDisplayText: {
      fontSize: 15,
      color: colors.text,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      borderRadius: 12,
      height: 48,
      backgroundColor: colors.card,
    },
    locationButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    inputRowBody: {
      flex: 1,
    },
    inputRowName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    inputRowMeta: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    addInputRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      alignItems: 'center',
    },
    addInputField: {
      flex: 2,
    },
    addInputQty: {
      flex: 1,
    },
    addInputButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButton: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#1A6B2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ── Image picker ──
    optionalTag: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.secondaryText,
    },
    imagePickerRow: {
      flexDirection: 'row',
      gap: 12,
    },
    imagePickerBtn: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
    },
    imagePickerBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 56,
      borderRadius: 14,
    },
    imagePickerBtnGallery: {
      borderWidth: 1.5,
      borderStyle: 'dashed' as const,
    },
    imagePickerBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    imagePreviewWrap: {
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: 190,
      borderRadius: 14,
    },
    removeImageBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 14,
    },
    imagePreviewBadge: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0,0,0,0.52)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    imagePreviewBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
  });
}

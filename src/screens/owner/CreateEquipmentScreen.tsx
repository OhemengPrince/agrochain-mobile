import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Animated, Image, Alert, KeyboardAvoidingView, Platform, Keyboard, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, EquipmentCategory } from '../../types';
import { createEquipment } from '../../api/equipmentApi';
import { uploadImage } from '../../api/fileApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';
import { SafeAreaView } from 'react-native-safe-area-context';

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

function CategoryChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.chip, active && styles.chipActive]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

type Props = NativeStackScreenProps<OwnerStackParamList, 'CreateEquipment'>;

const CATEGORIES: EquipmentCategory[] = [
  'TRACTOR',
  'HARVESTER',
  'TILLER',
  'SPRAYER',
  'IRRIGATION',
  'SHELLER',
  'OTHER',
];

export default function CreateEquipmentScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('TRACTOR');
  const [description, setDescription] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Listing...');
  const [error, setError] = useState<string | null>(null);
  const [showTnC, setShowTnC] = useState(false);

  const submitAnim = usePressAnimation();

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add an equipment photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleShowTnC = () => {
    setError(null);
    const rate = parseFloat(dailyRate);
    if (!name || !description || !dailyRate || !region || !district || Number.isNaN(rate)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    setShowTnC(true);
  };

  const handleCreate = async () => {
    setShowTnC(false);
    const rate = parseFloat(dailyRate);
    setLoading(true);

    let remoteImageUrl: string | undefined;
    if (photoUri) {
      setLoadingText('Uploading image...');
      try {
        remoteImageUrl = await uploadImage(photoUri);
      } catch {
        // Upload failed — proceed without image
      }
    }

    setLoadingText('Listing...');
    try {
      await createEquipment({
        name,
        category,
        description,
        dailyRate: rate,
        region,
        district,
        imageUrl: remoteImageUrl,
      });
      navigation.navigate('OwnerEquipmentList');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create equipment listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Equipment</Text>
        <View style={styles.backButtonSpacer} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ErrorMessage message={error} />

        <Text style={styles.label}>Photo</Text>
        <Pressable style={styles.photoUpload} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={28} color={colors.primaryGreen} />
              <Text style={styles.photoPlaceholderText}>Add a photo</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>Equipment Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Deere Tractor"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                label={c.replace(/_/g, ' ')}
                active={category === c}
                onPress={() => setCategory(c)}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.label}>Daily Rate (GHS)</Text>
          <TextInput
            style={styles.input}
            value={dailyRate}
            onChangeText={setDailyRate}
            placeholder="150"
            placeholderTextColor={colors.secondaryText}
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Region</Text>
              <TextInput
                style={styles.input}
                value={region}
                onChangeText={setRegion}
                placeholder="Ashanti"
                placeholderTextColor={colors.secondaryText}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>District</Text>
              <TextInput
                style={styles.input}
                value={district}
                onChangeText={setDistrict}
                placeholder="Kumasi"
                placeholderTextColor={colors.secondaryText}
              />
            </View>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the equipment's condition and capabilities"
            placeholderTextColor={colors.secondaryText}
            multiline
            blurOnSubmit
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <Animated.View style={{ transform: [{ scale: submitAnim.scale }], opacity: submitAnim.opacity }}>
          <Pressable
            onPress={handleShowTnC}
            onPressIn={submitAnim.onPressIn}
            onPressOut={submitAnim.onPressOut}
            disabled={loading}
          >
            <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>{loading ? loadingText : 'List Equipment'}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions Modal */}
      <Modal visible={showTnC} transparent animationType="slide" onRequestClose={() => setShowTnC(false)} statusBarTranslucent>
        <View style={styles.tncOverlay}>
          <View style={styles.tncSheet}>
            <Text style={styles.tncTitle}>Terms & Conditions</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const rate = parseFloat(dailyRate) || 0;
                const fee = rate * 0.05;
                const buyerPays = rate + fee;
                const sellerReceives = rate - fee;
                return (
                  <>
                    <View style={styles.tncPriceRow}>
                      <Text style={styles.tncPriceKey}>Your Daily Rate</Text>
                      <Text style={styles.tncPriceVal}>GHS {rate.toFixed(2)}</Text>
                    </View>
                    <View style={styles.tncPriceRow}>
                      <Text style={styles.tncPriceKey}>Farmer pays (rate + 5% fee)</Text>
                      <Text style={styles.tncPriceVal}>GHS {buyerPays.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.tncPriceRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.tncPriceKey}>You receive (rate − 5% fee)</Text>
                      <Text style={[styles.tncPriceVal, { color: colors.primaryGreen }]}>GHS {sellerReceives.toFixed(2)}</Text>
                    </View>
                  </>
                );
              })()}
              <Text style={styles.tncBody}>
                {'Funds are held in escrow by AgroChain until you confirm the equipment rental.\n\nBy listing your equipment, you confirm that:\n• The information provided is accurate.\n• The equipment is in the condition described.\n• You agree to AgroChain\'s Terms of Service and Equipment Rental Policy.'}
              </Text>
            </ScrollView>
            <View style={styles.tncBtnRow}>
              <TouchableOpacity style={styles.tncCancelBtn} onPress={() => setShowTnC(false)}>
                <Text style={styles.tncCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tncAcceptBtn} onPress={handleCreate}>
                <LinearGradient colors={[colors.primaryGreen, '#1B8B50']} style={styles.tncAcceptGradient}>
                  <Text style={styles.tncAcceptText}>I Agree & List</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 56,
      paddingBottom: 18,
      paddingHorizontal: 16,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonSpacer: {
      width: 36,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    content: {
      padding: 16,
      paddingBottom: 120,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 12,
    },
    photoUpload: {
      height: 140,
      borderRadius: 16,
      marginBottom: 4,
      overflow: 'hidden',
    },
    photoPreview: {
      width: '100%',
      height: '100%',
    },
    photoPlaceholder: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    photoPlaceholderText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginTop: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 4,
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
    textArea: {
      height: 96,
      paddingTop: 12,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    rowItem: {
      flex: 1,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.lightGreen,
      borderColor: colors.primaryGreen,
    },
    chipText: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    chipTextActive: {
      color: colors.primaryGreen,
      fontWeight: '700',
    },
    submitButton: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    tncOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    tncSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
    tncTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
    tncPriceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
    tncPriceKey: { fontSize: 13, color: colors.secondaryText },
    tncPriceVal: { fontSize: 13, fontWeight: '700', color: colors.text },
    tncBody: { fontSize: 13, color: colors.secondaryText, lineHeight: 20, marginTop: 16 },
    tncBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    tncCancelBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    tncCancelText: { fontSize: 15, fontWeight: '600', color: colors.secondaryText },
    tncAcceptBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    tncAcceptGradient: { height: 50, alignItems: 'center', justifyContent: 'center' },
    tncAcceptText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}

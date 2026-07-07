import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, Pressable, Animated, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Equipment } from '../../types';
import { getEquipmentById, updateEquipment, deleteEquipment } from '../../api/equipmentApi';
import { uploadImage } from '../../api/fileApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import LoadingOverlay from '../../components/LoadingOverlay';
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

type Props = NativeStackScreenProps<OwnerStackParamList, 'EditEquipment'>;

export default function EditEquipmentScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { equipmentId } = route.params;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingText, setSavingText] = useState('Saving...');
  const [error, setError] = useState<string | null>(null);

  const saveAnim = usePressAnimation();
  const deleteAnim = usePressAnimation();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEquipmentById(equipmentId);
        setEquipment(data);
        setName(data.name);
        setDescription(data.description);
        setDailyRate(String(data.dailyRate));
        setIsAvailable(data.isAvailable);
        setPhotoUri(data.imageUrl ?? null);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load equipment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId]);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to update the equipment photo.');
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

  const handleSave = async () => {
    setError(null);
    const rate = parseFloat(dailyRate);
    if (!name || !description || Number.isNaN(rate)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    setSaving(true);

    let finalImageUrl: string | undefined = photoUri ?? undefined;
    const isLocalPick = photoUri && (photoUri.startsWith('file://') || photoUri.startsWith('content://'));
    if (isLocalPick) {
      setSavingText('Uploading image...');
      try {
        finalImageUrl = await uploadImage(photoUri!);
      } catch {
        // Upload failed — keep original value
      }
    }

    setSavingText('Saving...');
    try {
      await updateEquipment(equipmentId, {
        name,
        description,
        dailyRate: rate,
        isAvailable,
        imageUrl: finalImageUrl,
      });
      navigation.navigate('OwnerEquipmentList');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update equipment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this equipment listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setSaving(true);
          try {
            await deleteEquipment(equipmentId);
            navigation.navigate('OwnerEquipmentList');
          } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to delete equipment.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingOverlay message="Loading equipment..." />;
  }

  if (!equipment) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorMessage message={error ?? 'Equipment not found.'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Equipment</Text>
        <View style={styles.backButtonSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>Daily Rate (GHS)</Text>
          <TextInput
            style={styles.input}
            value={dailyRate}
            onChangeText={setDailyRate}
            placeholderTextColor={colors.secondaryText}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.secondaryText}
            multiline
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Available for Booking</Text>
            <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primaryGreen }} />
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: saveAnim.scale }], opacity: saveAnim.opacity }}>
          <Pressable
            onPress={handleSave}
            onPressIn={saveAnim.onPressIn}
            onPressOut={saveAnim.onPressOut}
            disabled={saving}
          >
            <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>{saving ? savingText : 'Save Changes'}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: deleteAnim.scale }], opacity: deleteAnim.opacity }}>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            onPressIn={deleteAnim.onPressIn}
            onPressOut={deleteAnim.onPressOut}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={styles.deleteButtonText}>Delete Listing</Text>
          </Pressable>
        </Animated.View>
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
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
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
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: '#DC2626',
      marginTop: 12,
    },
    deleteButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#DC2626',
    },
  });
}

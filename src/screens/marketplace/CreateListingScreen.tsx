import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Image,
  Alert,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MarketplaceStackParamList,
  MarketplaceCategory,
  MarketplacePriceType,
  MarketplaceContactPreference,
} from '../../types';
import { createMarketplaceListing, updateMarketplaceListing, getMarketplaceListingById } from '../../api/produceApi';
import { uploadImage } from '../../api/fileApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';
import { getApiErrorMessage } from '../../utils/apiError';

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

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'CreateListing'>;

const CATEGORIES: { label: string; value: MarketplaceCategory }[] = [
  { label: 'Produce', value: 'PRODUCE' },
  { label: 'Equipment', value: 'EQUIPMENT' },
  { label: 'Seeds', value: 'SEEDS' },
  { label: 'Tools', value: 'TOOLS' },
  { label: 'Other Agric', value: 'OTHER' },
];

const PRICE_TYPES: { label: string; value: MarketplacePriceType }[] = [
  { label: 'Fixed Price', value: 'FIXED' },
  { label: 'Per Day', value: 'PER_DAY' },
  { label: 'Negotiable', value: 'NEGOTIABLE' },
];

const CONTACT_PREFERENCES: { label: string; value: MarketplaceContactPreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Call', value: 'CALL', icon: 'call-outline' },
  { label: 'WhatsApp', value: 'WHATSAPP', icon: 'logo-whatsapp' },
  { label: 'In-App', value: 'IN_APP', icon: 'chatbubble-outline' },
];

const MAX_PHOTOS = 5;

const CATEGORY_HINTS: Record<MarketplaceCategory, { name: string; description: string }> = {
  PRODUCE: {
    name: 'e.g. Fresh Maize, Ripe Tomatoes, Cocoa Beans…',
    description: 'Describe the crop: variety, quality grade, harvest date, packaging, and storage conditions.',
  },
  EQUIPMENT: {
    name: 'e.g. Massey Ferguson Tractor, Combine Harvester…',
    description: 'Describe the equipment: brand, model, year, working condition, hours used, and what is included.',
  },
  SEEDS: {
    name: 'e.g. Hybrid Maize Seed, Improved Tomato Seed…',
    description: 'Describe the seed: variety, germination rate, treatment status, source, and packaging size.',
  },
  TOOLS: {
    name: 'e.g. Cutlass, Hand Hoe, Knapsack Sprayer…',
    description: 'Describe the tool: brand, condition (new/used), size or capacity, and any accessories included.',
  },
  OTHER: {
    name: 'e.g. Fertiliser, Pesticide, Irrigation Pipe, Crates…',
    description: 'Describe the item clearly: what it is, its condition, quantity available, and relevant specifications.',
  },
};

function Chip({
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

function LocationButton({
  onPress,
  loading,
  captured,
  styles,
  colors,
}: {
  onPress: () => void;
  loading: boolean;
  captured: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
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
        <Ionicons
          name={captured ? 'checkmark-circle' : 'location-outline'}
          size={18}
          color={colors.primaryGreen}
        />
        <Text style={styles.locationButtonText}>
          {loading ? 'Capturing location...' : captured ? 'Location Captured' : 'Capture My Location'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CreateListingScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const editingListingId = route.params?.listingId;
  const isEditing = !!editingListingId;

  const [category, setCategory] = useState<MarketplaceCategory>('PRODUCE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<MarketplacePriceType>('FIXED');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [contactPreference, setContactPreference] = useState<MarketplaceContactPreference>('CALL');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Posting...');
  const [error, setError] = useState<string | null>(null);
  const [showTnC, setShowTnC] = useState(false);
  const [prefilling, setPrefilling] = useState(isEditing);

  useEffect(() => {
    if (!editingListingId) return;
    (async () => {
      try {
        const listing = await getMarketplaceListingById(editingListingId);
        setCategory(listing.category);
        setName(listing.name);
        setDescription(listing.description);
        setPriceType(listing.priceType);
        setPrice(listing.priceType === 'NEGOTIABLE' ? '' : String(listing.price));
        setQuantity(listing.quantity ?? '');
        setExistingPhotoUrls(listing.photoUrls ?? []);
        setRegion(listing.region);
        setDistrict(listing.district);
        setContactPreference(listing.contactPreference);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Failed to load listing for editing.'));
      } finally {
        setPrefilling(false);
      }
    })();
  }, [editingListingId]);

  const submitAnim = usePressAnimation();
  const addPhotoAnim = usePressAnimation();

  const handleCaptureLocation = () => {
    setCapturingLocation(true);
    setTimeout(() => {
      setRegion('Ashanti');
      setDistrict('Kumasi');
      setCapturingLocation(false);
    }, 1200);
  };

  const totalPhotoCount = photos.length + existingPhotoUrls.length;

  const handleAddPhoto = async () => {
    if (totalPhotoCount >= MAX_PHOTOS) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add listing photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleRemoveExistingPhoto = (url: string) => {
    setExistingPhotoUrls((prev) => prev.filter((p) => p !== url));
  };

  const handleShowTnC = () => {
    setError(null);
    const parsedPrice = parseFloat(price);
    const hasValidPrice = !Number.isNaN(parsedPrice) && parsedPrice > 0;

    if (!category || !name.trim() || !description.trim()) {
      setError('Please fill in the category, name, and description.');
      return;
    }
    if (priceType !== 'NEGOTIABLE' && !hasValidPrice) {
      setError('Please enter a valid price, or switch to Negotiable.');
      return;
    }
    if (!region || !district) {
      setError('Please capture your location before posting.');
      return;
    }
    if (!contactPreference) {
      setError('Please choose a contact preference.');
      return;
    }
    setShowTnC(true);
  };

  const handleSubmit = async () => {
    setShowTnC(false);
    setError(null);

    const parsedPrice = parseFloat(price);
    const hasValidPrice = !Number.isNaN(parsedPrice) && parsedPrice > 0;

    if (!category || !name.trim() || !description.trim()) {
      setError('Please fill in the category, name, and description.');
      return;
    }
    if (priceType !== 'NEGOTIABLE' && !hasValidPrice) {
      setError('Please enter a valid price, or switch to Negotiable.');
      return;
    }
    if (!region || !district) {
      setError('Please capture your location before posting.');
      return;
    }
    if (!contactPreference) {
      setError('Please choose a contact preference.');
      return;
    }

    setLoading(true);

    let newlyUploadedUrls: string[] = [];
    if (photos.length > 0) {
      setLoadingText('Uploading photos...');
      const results = await Promise.allSettled(photos.map((uri) => uploadImage(uri)));
      newlyUploadedUrls = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value);
    }
    const photoUrls = [...existingPhotoUrls, ...newlyUploadedUrls];

    setLoadingText(isEditing ? 'Saving changes...' : 'Posting...');
    try {
      const payload = {
        category,
        name: name.trim(),
        description: description.trim(),
        priceType,
        price: hasValidPrice ? parsedPrice : 0,
        quantity: quantity.trim() ? quantity.trim() : undefined,
        photoUrls,
        region,
        district,
        contactPreference,
      };
      if (isEditing) {
        await updateMarketplaceListing(editingListingId!, payload);
        Alert.alert('Listing updated', 'Your changes have been saved.', [
          { text: 'OK', onPress: () => navigation.navigate('MyMarketplaceListings') },
        ]);
      } else {
        await createMarketplaceListing(payload);
        Alert.alert('Listing posted', 'Your item is now live on the marketplace.', [
          { text: 'View My Listing', onPress: () => navigation.navigate('MyMarketplaceListings') },
          { text: 'Browse Marketplace', onPress: () => navigation.navigate('MarketplaceList') },
        ]);
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, `Failed to ${isEditing ? 'update' : 'post'} listing.`));
    } finally {
      setLoading(false);
    }
  };

  if (prefilling) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Listing</Text>
          <View style={styles.backButtonSpacer} />
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.secondaryText }}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Listing' : 'List an Item'}</Text>
        <View style={styles.backButtonSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeBanner}>
          <Ionicons name="warning-outline" size={18} color={colors.accentAmber} />
          <Text style={styles.noticeBannerText}>Agriculture items only</Text>
        </View>

        <ErrorMessage message={error} />

        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                active={category === c.value}
                onPress={() => setCategory(c.value)}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={CATEGORY_HINTS[category].name}
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={CATEGORY_HINTS[category].description}
            placeholderTextColor={colors.secondaryText}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Price Type</Text>
          <View style={styles.chipRow}>
            {PRICE_TYPES.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                active={priceType === p.value}
                onPress={() => setPriceType(p.value)}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.label}>
            Price {priceType === 'NEGOTIABLE' ? '(optional asking price)' : ''}
          </Text>
          <View style={styles.priceRow}>
            <View style={styles.pricePrefixBox}>
              <Text style={styles.pricePrefixText}>GHS</Text>
            </View>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={price}
              onChangeText={setPrice}
              placeholder={priceType === 'NEGOTIABLE' ? 'Open to offers' : '0.00'}
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.label}>Quantity (optional)</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="500kg, 10 bags..."
            placeholderTextColor={colors.secondaryText}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Photos ({totalPhotoCount}/{MAX_PHOTOS})</Text>
          <View style={styles.photoGrid}>
            {existingPhotoUrls.map((url) => (
              <View key={url} style={styles.photoTile}>
                <Image source={{ uri: url }} style={styles.photoImage} resizeMode="cover" />
                <Pressable style={styles.photoRemoveButton} onPress={() => handleRemoveExistingPhoto(url)}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {photos.map((uri) => (
              <View key={uri} style={styles.photoTile}>
                <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                <Pressable style={styles.photoRemoveButton} onPress={() => handleRemovePhoto(uri)}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {totalPhotoCount < MAX_PHOTOS && (
              <Animated.View style={{ transform: [{ scale: addPhotoAnim.scale }], opacity: addPhotoAnim.opacity }}>
                <Pressable
                  style={styles.addPhotoTile}
                  onPress={handleAddPhoto}
                  onPressIn={addPhotoAnim.onPressIn}
                  onPressOut={addPhotoAnim.onPressOut}
                >
                  <Ionicons name="camera-outline" size={24} color={colors.primaryGreen} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Location</Text>
          <LocationButton
            onPress={handleCaptureLocation}
            loading={capturingLocation}
            captured={!!(region && district)}
            styles={styles}
            colors={colors}
          />
          {region && district ? (
            <Text style={styles.locationResultText}>{district}, {region}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Contact Preference</Text>
          <View style={styles.chipRow}>
            {CONTACT_PREFERENCES.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                active={contactPreference === c.value}
                onPress={() => setContactPreference(c.value)}
                styles={styles}
              />
            ))}
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: submitAnim.scale }], opacity: submitAnim.opacity }}>
          <Pressable
            onPress={handleShowTnC}
            onPressIn={submitAnim.onPressIn}
            onPressOut={submitAnim.onPressOut}
            disabled={loading}
          >
            <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>{loading ? loadingText : (isEditing ? 'Save Changes' : 'Post Listing')}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal visible={showTnC} transparent animationType="slide" onRequestClose={() => setShowTnC(false)} statusBarTranslucent>
        <View style={styles.tncOverlay}>
          <View style={styles.tncSheet}>
            <Text style={styles.tncTitle}>Terms & Conditions</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const parsedPrice = parseFloat(price) || 0;
                const fee = parsedPrice * 0.05;
                const buyerPays = parsedPrice + fee;
                const sellerReceives = parsedPrice - fee;
                const isNeg = priceType === 'NEGOTIABLE';
                return (
                  <>
                    <View style={styles.tncPriceRow}>
                      <Text style={styles.tncPriceKey}>Listed Price</Text>
                      <Text style={styles.tncPriceVal}>{isNeg ? 'Negotiable' : `GHS ${parsedPrice.toFixed(2)}`}</Text>
                    </View>
                    {!isNeg && (
                      <>
                        <View style={styles.tncPriceRow}>
                          <Text style={styles.tncPriceKey}>Buyer pays (price + 5% fee)</Text>
                          <Text style={styles.tncPriceVal}>GHS {buyerPays.toFixed(2)}</Text>
                        </View>
                        <View style={[styles.tncPriceRow, { borderBottomWidth: 0 }]}>
                          <Text style={styles.tncPriceKey}>You receive (price − 5% fee)</Text>
                          <Text style={[styles.tncPriceVal, { color: colors.primaryGreen }]}>GHS {sellerReceives.toFixed(2)}</Text>
                        </View>
                      </>
                    )}
                  </>
                );
              })()}
              <Text style={styles.tncBody}>
                {'Funds are held in escrow by AgroChain until you confirm the buyer\'s order.\n\nBy posting this listing, you confirm that:\n• The information provided is accurate.\n• The item matches its description and photos.\n• You agree to AgroChain\'s Terms of Service and Marketplace Policy.'}
              </Text>
            </ScrollView>
            <View style={styles.tncBtnRow}>
              <TouchableOpacity style={styles.tncCancelBtn} onPress={() => setShowTnC(false)}>
                <Text style={styles.tncCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tncAcceptBtn} onPress={handleSubmit}>
                <LinearGradient colors={[colors.primaryGreen, '#1B8B50']} style={styles.tncAcceptGradient}>
                  <Text style={styles.tncAcceptText}>{isEditing ? 'I Agree & Save' : 'I Agree & Post'}</Text>
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
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    noticeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.lightAmber,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    noticeBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accentAmber,
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
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 12,
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
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      overflow: 'hidden',
    },
    pricePrefixBox: {
      paddingHorizontal: 14,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    pricePrefixText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryGreen,
    },
    priceInput: {
      flex: 1,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    photoTile: {
      width: 88,
      height: 88,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    photoRemoveButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPhotoTile: {
      width: 88,
      height: 88,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    addPhotoText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primaryGreen,
      backgroundColor: colors.lightGreen,
    },
    locationButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryGreen,
    },
    locationResultText: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 8,
      textAlign: 'center',
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

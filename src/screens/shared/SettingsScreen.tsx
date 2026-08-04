import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { GHANA_REGIONS } from '../../constants/ghanaRegions';
import { updateProfile, updatePhotoUrl } from '../../api/userApi';
import { uploadImage } from '../../api/fileApi';
import { formatRole, formatDate } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiError';
import { SheetSectionLabel } from '../../components/FullScreenSheet';

const PLACEHOLDER_COLOR = '#9CA3AF';

export default function SettingsScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [region, setRegion] = useState(user?.region ?? '');
  const [district, setDistrict] = useState(user?.district ?? '');
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const initial = (user?.fullName || '?').trim().charAt(0).toUpperCase();

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setAvatarUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri);
      await updatePhotoUrl(url);
      await updateUser({ profilePhotoUrl: url });
      Alert.alert('Success', 'Your profile photo has been updated.');
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Could not update your photo. Please try again.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    if (!fullName.trim()) {
      setProfileError('Full name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setProfileError('Phone number is required.');
      return;
    }
    setSavingProfile(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        region,
        district: district.trim(),
      };
      const fresh = await updateProfile(payload);
      await updateUser({ ...payload, ...(fresh ?? {}) });
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (err) {
      setProfileError(getApiErrorMessage(err, 'Could not update your profile. Please try again.'));
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) return null;

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
            <Ionicons name="settings-outline" size={26} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>Manage your profile and account details</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.card}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile photo ── */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handlePickPhoto} disabled={avatarUploading} style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                {user.profilePhotoUrl ? (
                  <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
              <View style={styles.avatarCameraBadge}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Tap the photo to upload a new one</Text>
          </View>

          {/* ── Personal information ── */}
          <SheetSectionLabel text="Personal Information" />

          {profileError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{profileError}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Kwame Asante"
            placeholderTextColor={PLACEHOLDER_COLOR}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="e.g. 0244000001"
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Region</Text>
          <Pressable style={styles.selectInput} onPress={() => setShowRegionPicker(true)}>
            <Text style={[styles.selectInputText, !region && { color: PLACEHOLDER_COLOR }]}>
              {region || 'Select your region'}
            </Text>
            <Ionicons name="chevron-down-outline" size={18} color={colors.secondaryText} />
          </Pressable>

          <Text style={styles.label}>District / Town</Text>
          <TextInput
            style={styles.input}
            value={district}
            onChangeText={setDistrict}
            placeholder="e.g. Kumasi"
            placeholderTextColor={PLACEHOLDER_COLOR}
          />

          <Pressable onPress={handleSaveProfile} disabled={savingProfile}>
            <LinearGradient
              colors={[colors.primaryGreen, colors.primaryGreenLight]}
              style={[styles.primaryButton, savingProfile && { opacity: 0.7 }]}
            >
              {savingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* ── Account info (read-only) ── */}
          <SheetSectionLabel text="Account Information" />

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="mail-outline" size={18} color={colors.primaryGreen} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="briefcase-outline" size={18} color={colors.primaryGreen} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{formatRole(user.role)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="calendar-outline" size={18} color={colors.primaryGreen} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showRegionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Region</Text>
            <FlatList
              data={GHANA_REGIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setRegion(item);
                    setShowRegionPicker(false);
                  }}
                  style={styles.regionItem}
                >
                  <Text style={styles.regionText}>{item}</Text>
                  {region === item && <Ionicons name="checkmark" size={20} color={colors.primaryGreen} />}
                </Pressable>
              )}
            />
            <Pressable onPress={() => setShowRegionPicker(false)} style={styles.cancelButton}>
              <Text style={{ color: colors.errorRed, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    avatarSection: { alignItems: 'center', marginBottom: 8 },
    avatarWrap: { marginBottom: 8 },
    avatarCircle: {
      width: 92, height: 92, borderRadius: 46, backgroundColor: colors.primaryGreen,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      borderWidth: 3, borderColor: colors.lightGreen,
    },
    avatarImage: { width: 92, height: 92 },
    avatarInitial: { fontSize: 36, fontWeight: '800', color: '#fff' },
    avatarCameraBadge: {
      position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.primaryGreenDark, borderWidth: 2, borderColor: colors.card,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarHint: { fontSize: 12, color: colors.secondaryText },
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2',
      borderRadius: 10, padding: 10, marginBottom: 14,
    },
    errorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontWeight: '600' },
    label: { fontSize: 12, fontWeight: '700', color: colors.secondaryText, marginBottom: 6, marginTop: 12 },
    input: {
      height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontSize: 14, color: colors.text,
    },
    selectInput: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.inputBackground, paddingHorizontal: 14,
    },
    selectInputText: { fontSize: 14, color: colors.text },
    primaryButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    infoCard: {
      backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16,
      borderWidth: 1, borderColor: colors.divider,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    infoIconCircle: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F7F2',
      alignItems: 'center', justifyContent: 'center',
    },
    infoTextWrap: { flex: 1 },
    infoLabel: { fontSize: 12, color: colors.secondaryText },
    infoValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.divider },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxHeight: '65%',
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },
    regionItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    regionText: { fontSize: 15, color: colors.text },
    cancelButton: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  });
}

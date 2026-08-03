import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { getCertifications, addCertification, removeCertification, StoredCertification } from '../utils/storage';
import FullScreenSheet, { SheetSectionLabel } from './FullScreenSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Device-local — there's no backend endpoint for storing certifications yet.
export default function MyCertificationsModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [certs, setCerts] = useState<StoredCertification[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) getCertifications().then(setCerts);
  }, [visible]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to attach a certificate photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the name written on your certificate — for example "Organic Farming Certificate".');
      return;
    }
    const created = await addCertification({ name: name.trim(), issuer: issuer.trim() || undefined, photoUri: photoUri ?? undefined });
    setCerts((prev) => [...prev, created]);
    setName('');
    setIssuer('');
    setPhotoUri(null);
    setAdding(false);
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remove Certification', 'Are you sure you want to remove this? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await removeCertification(id);
          setCerts((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  return (
    <FullScreenSheet
      visible={visible}
      onClose={onClose}
      title="My Certifications"
      icon="ribbon-outline"
      description="Certifications and licenses — like an Organic Farming Certificate or a Good Agricultural Practice (GAP) certificate — show up on your public profile. They help buyers and other users trust you and your listings."
    >
      <SheetSectionLabel text={certs.length > 0 ? `Your Certifications (${certs.length})` : 'Your Certifications'} />

      <FlatList
        data={certs}
        keyExtractor={(c) => c.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="ribbon-outline" size={28} color={colors.primaryGreen} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>
              You haven't added any certifications yet. Tap "Add Certification" below to add your first one.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.certRow}>
            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.certPhoto} />
            ) : (
              <View style={styles.certPhotoPlaceholder}>
                <Ionicons name="ribbon-outline" size={20} color={colors.primaryGreen} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.certName}>{item.name}</Text>
              {item.issuer ? <Text style={styles.certIssuer}>Issued by {item.issuer}</Text> : null}
            </View>
            <Pressable onPress={() => handleRemove(item.id)} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        )}
      />

      {adding ? (
        <View style={styles.addForm}>
          <SheetSectionLabel text="Add a New Certification" />

          <Text style={styles.fieldLabel}>Certification Name</Text>
          <Text style={styles.fieldHelper}>
            The name written on the certificate itself — e.g. "Organic Farming Certificate" or "Good Agricultural Practice (GAP) Certificate".
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Organic Farming Certificate"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.fieldLabel}>Issued By (optional)</Text>
          <Text style={styles.fieldHelper}>
            The organization or body that gave you this certificate — e.g. "Ghana Standards Authority".
          </Text>
          <TextInput
            style={styles.input}
            value={issuer}
            onChangeText={setIssuer}
            placeholder="e.g. Ghana Standards Authority"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.fieldLabel}>Certificate Photo (optional)</Text>
          <Text style={styles.fieldHelper}>
            Add a clear photo of the certificate so others can see it's genuine.
          </Text>
          <Pressable style={styles.photoPickBtn} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPickIcon}>
                <Ionicons name="camera-outline" size={20} color={colors.primaryGreen} />
              </View>
            )}
            <Text style={styles.photoPickText}>
              {photoUri ? 'Photo selected — tap to change' : 'Tap to choose a photo from your gallery'}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Pressable style={styles.cancelBtn} onPress={() => { setAdding(false); setName(''); setIssuer(''); setPhotoUri(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Save Certification</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle" size={20} color={colors.primaryGreen} />
          <Text style={styles.addBtnText}>Add Certification</Text>
        </Pressable>
      )}
    </FullScreenSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 12 },
    emptyText: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', lineHeight: 19 },
    certRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
      paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.inputBackground, marginBottom: 10,
    },
    certPhoto: { width: 44, height: 44, borderRadius: 10 },
    certPhotoPlaceholder: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    certName: { fontSize: 14, fontWeight: '700', color: colors.text },
    certIssuer: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    removeBtn: { padding: 4 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primaryGreen, borderStyle: 'dashed' },
    addBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
    addForm: { marginTop: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 16 },
    fieldHelper: { fontSize: 12, color: colors.secondaryText, marginTop: 2, marginBottom: 8, lineHeight: 17 },
    input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontSize: 14, color: colors.text },
    photoPickBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground,
    },
    photoPickIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    photoPreview: { width: 40, height: 40, borderRadius: 10 },
    photoPickText: { flex: 1, fontSize: 12, color: colors.primaryGreen, fontWeight: '600' },
    cancelBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBackground },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.secondaryText },
    saveBtn: { flex: 2, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryGreen },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

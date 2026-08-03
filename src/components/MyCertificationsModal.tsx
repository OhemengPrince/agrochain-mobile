import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { getCertifications, addCertification, removeCertification, StoredCertification } from '../utils/storage';
import FullScreenSheet from './FullScreenSheet';

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
      Alert.alert('Name required', 'Enter the certification name.');
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
    Alert.alert('Remove Certification', 'Are you sure you want to remove this?', [
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
    <FullScreenSheet visible={visible} onClose={onClose} title="My Certifications">
      <FlatList
        data={certs}
        keyExtractor={(c) => c.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No certifications added yet.</Text>
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
              {item.issuer ? <Text style={styles.certIssuer}>{item.issuer}</Text> : null}
            </View>
            <Pressable onPress={() => handleRemove(item.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        )}
      />

      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Certification name" placeholderTextColor={colors.secondaryText} />
          <TextInput style={styles.input} value={issuer} onChangeText={setIssuer} placeholder="Issued by (optional)" placeholderTextColor={colors.secondaryText} />
          <Pressable style={styles.photoPickBtn} onPress={pickPhoto}>
            <Ionicons name="camera-outline" size={16} color={colors.primaryGreen} />
            <Text style={styles.photoPickText}>{photoUri ? 'Photo selected' : 'Add photo (optional)'}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable style={styles.cancelBtn} onPress={() => { setAdding(false); setName(''); setIssuer(''); setPhotoUri(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Save</Text>
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
    emptyText: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', paddingVertical: 24 },
    certRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
    certPhoto: { width: 40, height: 40, borderRadius: 10 },
    certPhotoPlaceholder: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' },
    certName: { fontSize: 14, fontWeight: '700', color: colors.text },
    certIssuer: { fontSize: 12, color: colors.secondaryText, marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primaryGreen, borderStyle: 'dashed' },
    addBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
    addForm: { marginTop: 16, gap: 10 },
    input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontSize: 14, color: colors.text },
    photoPickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
    photoPickText: { fontSize: 12, color: colors.primaryGreen, fontWeight: '600' },
    cancelBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBackground },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.secondaryText },
    saveBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryGreen },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, EquipmentCategory } from '../../types';
import { createEquipment } from '../../api/equipmentApi';
import { colors } from '../../constants/colors';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<OwnerStackParamList, 'CreateEquipment'>;

const CATEGORIES: EquipmentCategory[] = [
  'TRACTOR',
  'HARVESTER',
  'PLOUGH',
  'SPRAYER',
  'IRRIGATION_PUMP',
  'TRAILER',
  'OTHER',
];

export default function CreateEquipmentScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('TRACTOR');
  const [description, setDescription] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    const rate = parseFloat(dailyRate);
    if (!name || !description || !dailyRate || !region || !district || Number.isNaN(rate)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    setLoading(true);
    try {
      await createEquipment({ name, category, description, dailyRate: rate, region, district });
      navigation.navigate('OwnerEquipmentList');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create equipment listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>List New Equipment</Text>

      <ErrorMessage message={error} />

      <Text style={styles.label}>Equipment Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Deere Tractor" />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
              {c.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the equipment's condition and capabilities"
        multiline
      />

      <Text style={styles.label}>Daily Rate (GHS)</Text>
      <TextInput
        style={styles.input}
        value={dailyRate}
        onChangeText={setDailyRate}
        placeholder="150"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Region</Text>
      <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="Ashanti" />

      <Text style={styles.label}>District</Text>
      <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="Kumasi" />

      <AppButton title="List Equipment" onPress={handleCreate} loading={loading} style={styles.button} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.darkText,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
  },
  textArea: {
    height: 90,
    paddingTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
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
    color: colors.gray,
  },
  chipTextActive: {
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  button: {
    marginTop: 24,
  },
});

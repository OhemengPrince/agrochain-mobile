import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FarmerStackParamList } from '../../types';
import { createBatch } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<FarmerStackParamList, 'CreateBatch'>;

export default function CreateBatchScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    const quantity = parseFloat(quantityKg);
    if (!cropName || !quantityKg || !region || !district || Number.isNaN(quantity)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    setLoading(true);
    try {
      await createBatch({ cropName, variety, quantityKg: quantity, region, district });
      navigation.navigate('FarmerBatchesList');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Produce Batch</Text>

      <ErrorMessage message={error} />

      <Text style={styles.label}>Crop Name</Text>
      <TextInput style={styles.input} value={cropName} onChangeText={setCropName} placeholder="Maize" />

      <Text style={styles.label}>Variety (optional)</Text>
      <TextInput style={styles.input} value={variety} onChangeText={setVariety} placeholder="Obatanpa" />

      <Text style={styles.label}>Quantity (kg)</Text>
      <TextInput
        style={styles.input}
        value={quantityKg}
        onChangeText={setQuantityKg}
        placeholder="500"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Region</Text>
      <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="Ashanti" />

      <Text style={styles.label}>District</Text>
      <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="Kumasi" />

      <AppButton title="Create Batch" onPress={handleCreate} loading={loading} style={styles.button} />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      color: colors.text,
      marginBottom: 16,
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
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 46,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    button: {
      marginTop: 24,
    },
  });
}

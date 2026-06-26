import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, Equipment } from '../../types';
import { getEquipmentById, updateEquipment, deleteEquipment } from '../../api/equipmentApi';
import { colors } from '../../constants/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<OwnerStackParamList, 'EditEquipment'>;

export default function EditEquipmentScreen({ route, navigation }: Props) {
  const { equipmentId } = route.params;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load equipment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId]);

  const handleSave = async () => {
    setError(null);
    const rate = parseFloat(dailyRate);
    if (!name || !description || Number.isNaN(rate)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    setSaving(true);
    try {
      await updateEquipment(equipmentId, { name, description, dailyRate: rate, isAvailable });
      navigation.navigate('OwnerEquipmentList');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update equipment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
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
  };

  if (loading) {
    return <LoadingOverlay message="Loading equipment..." />;
  }

  if (!equipment) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error ?? 'Equipment not found.'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Equipment</Text>

      <ErrorMessage message={error} />

      <Text style={styles.label}>Equipment Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Daily Rate (GHS)</Text>
      <TextInput
        style={styles.input}
        value={dailyRate}
        onChangeText={setDailyRate}
        keyboardType="numeric"
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Available for Booking</Text>
        <Switch
          value={isAvailable}
          onValueChange={setIsAvailable}
          trackColor={{ true: colors.primaryGreen }}
        />
      </View>

      <AppButton title="Save Changes" onPress={handleSave} loading={saving} style={styles.button} />
      <AppButton
        title="Delete Listing"
        variant="outline"
        onPress={handleDelete}
        loading={saving}
        style={styles.button}
      />
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    marginTop: 16,
  },
});

import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OwnerStackParamList, EquipmentCategory } from '../../types';
import { createEquipment } from '../../api/equipmentApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import AppButton from '../../components/AppButton';
import ErrorMessage from '../../components/ErrorMessage';

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
  'PLOUGH',
  'SPRAYER',
  'IRRIGATION_PUMP',
  'TRAILER',
  'OTHER',
];

export default function CreateEquipmentScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the equipment's condition and capabilities"
        placeholderTextColor={colors.secondaryText}
        multiline
      />

      <Text style={styles.label}>Daily Rate (GHS)</Text>
      <TextInput
        style={styles.input}
        value={dailyRate}
        onChangeText={setDailyRate}
        placeholder="150"
        placeholderTextColor={colors.secondaryText}
        keyboardType="numeric"
      />

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

      <AppButton title="List Equipment" onPress={handleCreate} loading={loading} style={styles.button} />
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
      color: colors.secondaryText,
    },
    chipTextActive: {
      color: colors.primaryGreen,
      fontWeight: '600',
    },
    button: {
      marginTop: 24,
    },
  });
}

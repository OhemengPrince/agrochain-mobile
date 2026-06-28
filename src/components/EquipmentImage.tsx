import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EquipmentCategory } from '../types';
import { getEquipmentImage } from '../constants/equipmentImages';

interface EquipmentImageProps {
  category: EquipmentCategory;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
}

export default function EquipmentImage({ category, style, resizeMode = 'cover' }: EquipmentImageProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {!failed ? (
        <Image
          source={getEquipmentImage(category)}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      ) : (
        <Ionicons name="construct-outline" size={32} color="#1A6B2E" />
      )}
      {loading && !failed && <ActivityIndicator style={StyleSheet.absoluteFill} color="#1A6B2E" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

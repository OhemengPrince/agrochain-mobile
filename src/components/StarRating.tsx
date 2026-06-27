import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  onChange,
}: StarRatingProps) {
  const { colors } = useTheme();
  const stars = Array.from({ length: maxStars }, (_, index) => index + 1);

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const filled = star <= Math.round(rating);
        const StarComponent = onChange ? TouchableOpacity : View;
        return (
          <StarComponent
            key={star}
            onPress={onChange ? () => onChange(star) : undefined}
            style={{ marginRight: 1 }}
          >
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? colors.accentAmber : colors.border} />
          </StarComponent>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
});

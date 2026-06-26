import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
          >
            <Text style={{ fontSize: size, color: filled ? colors.accentAmber : colors.border, marginRight: 1 }}>
              {'★'}
            </Text>
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

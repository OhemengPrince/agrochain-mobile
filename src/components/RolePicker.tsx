import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../types';
import { ThemeColors } from '../context/ThemeContext';

export const ROLE_OPTIONS: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'FARMER', label: 'Farmer', icon: 'leaf-outline' },
  { value: 'EQUIPMENT_OWNER', label: 'Equipment Owner', icon: 'construct-outline' },
  { value: 'BUYER', label: 'Buyer', icon: 'cart-outline' },
];

function RoleCard({
  option,
  selected,
  scaleAnim,
  onPress,
  styles,
  colors,
}: {
  option: (typeof ROLE_OPTIONS)[number];
  selected: boolean;
  scaleAnim: Animated.Value;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  const animateOpacityTo = (toOpacity: number, duration: number) => {
    Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.roleCardWrap, { transform: [{ scale: scaleAnim }], opacity }]}>
      <Pressable
        style={[styles.roleCard, selected && styles.roleCardSelected]}
        onPress={onPress}
        onPressIn={() => animateOpacityTo(0.95, 100)}
        onPressOut={() => animateOpacityTo(1, 150)}
      >
        <Ionicons name={option.icon} size={26} color={selected ? colors.white : colors.secondaryText} />
        <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{option.label}</Text>
        {selected && <View style={styles.roleGoldBar} />}
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  value: UserRole;
  onChange: (role: UserRole) => void;
  colors: ThemeColors;
}

export default function RolePicker({ value, onChange, colors }: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const roleScaleAnims = useRef(ROLE_OPTIONS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    ROLE_OPTIONS.forEach((option, index) => {
      Animated.spring(roleScaleAnims[index], {
        toValue: option.value === value ? 1.05 : 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    });
  }, [value, roleScaleAnims]);

  return (
    <View style={styles.roleRow}>
      {ROLE_OPTIONS.map((option, index) => (
        <RoleCard
          key={option.value}
          option={option}
          selected={value === option.value}
          scaleAnim={roleScaleAnims[index]}
          onPress={() => onChange(option.value)}
          styles={styles}
          colors={colors}
        />
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    roleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    roleCardWrap: {
      width: '31%',
      height: 84,
      marginBottom: 12,
    },
    roleCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    roleCardSelected: {
      backgroundColor: colors.primaryGreen,
      borderWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    roleLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 8,
    },
    roleLabelSelected: {
      color: colors.white,
    },
    roleGoldBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: '#FFD700',
    },
  });
}

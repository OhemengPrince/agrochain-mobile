import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.logo}>AgroChain</Text>
      <Text style={styles.tagline}>From Farm to Market, Tracked.</Text>
      <ActivityIndicator color={colors.white} style={styles.spinner} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.white,
    },
    tagline: {
      fontSize: 14,
      color: colors.lightGreen,
      marginTop: 8,
    },
    spinner: {
      marginTop: 24,
    },
  });
}

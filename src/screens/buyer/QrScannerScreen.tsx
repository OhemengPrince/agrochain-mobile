import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList } from '../../types';
import { scanQrCode } from '../../api/produceApi';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingOverlay from '../../components/LoadingOverlay';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<BuyerStackParamList, 'BuyerQrScanner'>;

// The camera overlay stays dark for readability, but UI panels (bottom card, buttons)
// adapt to the current theme.
export default function QrScannerScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors, isDarkMode);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  const handleScan = async (result: BarcodeScanningResult) => {
    if (scanned || loading) return;
    setScanned(true);
    setError(null);
    setLoading(true);
    try {
      const batch = await scanQrCode(result.data);
      navigation.replace('ProduceDetail', { batchId: batch.id });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not find produce for this QR code.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTorch = () => {
    setTorchOn((prev) => !prev);
  };

  if (!permission) {
    return <LoadingOverlay message="Requesting camera permission..." />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.message}>Camera access is required to scan QR codes.</Text>
        <AppButton title="Grant Permission" onPress={requestPermission} style={styles.button} />
      </SafeAreaView>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 210],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.circleButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={isDarkMode ? '#FFFFFF' : '#1C1C1C'} />
          </Pressable>
          <Text style={styles.title}>Scan Produce QR Code</Text>
          <Pressable style={styles.circleButton} onPress={handleToggleTorch}>
            <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={20} color={isDarkMode ? '#FFFFFF' : '#1C1C1C'} />
          </Pressable>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]}
            />
          </View>
        </View>

        <View style={styles.bottomCard}>
          <Text style={styles.bottomCardText}>Point camera at QR code on produce packaging</Text>
        </View>
      </View>

      <ErrorMessage message={error} />
      {loading && <LoadingOverlay message="Looking up produce..." />}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isDarkMode: boolean) {
  // Glass tokens (same palette as ChatScreen)
  const GLASS_BG = 'rgba(255,255,255,0.09)';
  const GLASS_BORDER = 'rgba(255,255,255,0.16)';
  const GLASS_GLOSS = 'rgba(255,255,255,0.20)';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0E0E10',
    },
    camera: {
      flex: 1,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 56,
    },
    circleButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDarkMode ? GLASS_BG : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? GLASS_BORDER : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    frameWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: 240,
      height: 240,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 36,
      height: 36,
      borderColor: '#FFFFFF',
    },
    cornerTopLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 8,
      borderColor: colors.primaryGreen,
    },
    cornerTopRight: {
      top: 0,
      right: 0,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 8,
    },
    cornerBottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 8,
    },
    cornerBottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 8,
      borderColor: colors.primaryGreen,
    },
    scanLine: {
      position: 'absolute',
      left: 4,
      right: 4,
      height: 2,
      backgroundColor: colors.primaryGreen,
    },
    bottomCard: {
      backgroundColor: isDarkMode ? GLASS_BG : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: isDarkMode ? GLASS_GLOSS : 'transparent',
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 4,
    },
    bottomCardText: {
      fontSize: 14,
      color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
    },
    message: {
      color: colors.white,
      textAlign: 'center',
      margin: 20,
    },
    button: {
      margin: 20,
    },
  });
}

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert } from 'react-native';
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

// NOTE: this screen's overlay intentionally stays fixed-dark regardless of the app theme
// (camera UIs read best with a dark scrim no matter light/dark mode) — this matches the
// deliberate choice already made when dark mode was rolled out across the app.
export default function QrScannerScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
      <View style={styles.container}>
        <Text style={styles.message}>Camera access is required to scan QR codes.</Text>
        <AppButton title="Grant Permission" onPress={requestPermission} style={styles.button} />
      </View>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 210],
  });

  return (
    <View style={styles.container}>
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
            <Ionicons name="chevron-back" size={22} color="#1C1C1C" />
          </Pressable>
          <Text style={styles.title}>Scan Produce QR Code</Text>
          <Pressable style={styles.circleButton} onPress={handleToggleTorch}>
            <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={20} color="#1C1C1C" />
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
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#1C1C1C',
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
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
      borderColor: '#2E8B45',
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
      borderColor: '#2E8B45',
    },
    scanLine: {
      position: 'absolute',
      left: 4,
      right: 4,
      height: 2,
      backgroundColor: '#2E8B45',
    },
    bottomCard: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingVertical: 24,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    bottomCardText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
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

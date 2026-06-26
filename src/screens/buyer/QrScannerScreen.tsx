import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

export default function QrScannerScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

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

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
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

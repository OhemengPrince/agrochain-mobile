import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { FarmerStackParamList, ProduceBatch, BatchStatus } from '../../types';
import { getBatchById, addProcessingStage, updateBatchStatus } from '../../api/produceApi';
import { formatDate } from '../../utils/formatters';
import { colors } from '../../constants/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<FarmerStackParamList, 'BatchDetail'>;

const NEXT_STATUS: Record<BatchStatus, BatchStatus | null> = {
  PLANTED: 'GROWING',
  GROWING: 'HARVESTED',
  HARVESTED: 'PROCESSING',
  PROCESSING: 'READY_FOR_SALE',
  READY_FOR_SALE: 'SOLD',
  SOLD: null,
};

export default function BatchDetailScreen({ route }: Props) {
  const { batchId } = route.params;
  const [batch, setBatch] = useState<ProduceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState('');
  const [stageDescription, setStageDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatch = async () => {
    setError(null);
    try {
      const data = await getBatchById(batchId);
      setBatch(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load batch.');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBatch();
      setLoading(false);
    })();
  }, [batchId]);

  const handleAddStage = async () => {
    if (!stageName || !stageDescription) {
      setError('Please enter a stage name and description.');
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      const updated = await addProcessingStage(batchId, {
        stageName,
        description: stageDescription,
      });
      setBatch(updated);
      setStageName('');
      setStageDescription('');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add processing stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!batch) return;
    const next = NEXT_STATUS[batch.status];
    if (!next) return;
    setError(null);
    setActionLoading(true);
    try {
      const updated = await updateBatchStatus(batchId, next);
      setBatch(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading batch..." />;
  }

  if (!batch) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error ?? 'Batch not found.'} />
      </View>
    );
  }

  const nextStatus = NEXT_STATUS[batch.status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{batch.cropName}</Text>
      {batch.variety ? <Text style={styles.variety}>{batch.variety}</Text> : null}
      <Text style={styles.status}>{batch.status.replace(/_/g, ' ')}</Text>

      <View style={styles.qrContainer}>
        <QRCode value={batch.qrCodeValue} size={140} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Quantity</Text>
        <Text style={styles.value}>{batch.quantityKg} kg</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {batch.district}, {batch.region}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Created</Text>
        <Text style={styles.value}>{formatDate(batch.createdAt)}</Text>
      </View>

      <ErrorMessage message={error} />

      {nextStatus && (
        <AppButton
          title={`Mark as ${nextStatus.replace(/_/g, ' ')}`}
          onPress={handleAdvanceStatus}
          loading={actionLoading}
          style={styles.button}
        />
      )}

      <Text style={styles.sectionTitle}>Processing History</Text>
      {batch.processingStages.length === 0 ? (
        <Text style={styles.emptyText}>No processing stages recorded yet.</Text>
      ) : (
        batch.processingStages.map((stage) => (
          <View key={stage.id} style={styles.stageItem}>
            <Text style={styles.stageName}>{stage.stageName}</Text>
            <Text style={styles.stageDescription}>{stage.description}</Text>
            <Text style={styles.stageDate}>{formatDate(stage.timestamp)}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Add Processing Stage</Text>
      <TextInput
        style={styles.input}
        value={stageName}
        onChangeText={setStageName}
        placeholder="Stage name (e.g. Drying)"
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        value={stageDescription}
        onChangeText={setStageDescription}
        placeholder="Description"
        multiline
      />
      <AppButton title="Add Stage" onPress={handleAddStage} loading={actionLoading} style={styles.button} />
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
  },
  variety: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryGreen,
    marginTop: 6,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    color: colors.gray,
  },
  value: {
    fontSize: 13,
    color: colors.darkText,
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkText,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.gray,
    fontSize: 13,
  },
  stageItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stageName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
  },
  stageDescription: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
  },
  stageDate: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
    marginTop: 8,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
  },
});

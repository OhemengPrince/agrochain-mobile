import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuyerStackParamList, ProduceBatch } from '../../types';
import { getBatchById } from '../../api/produceApi';
import { formatDate, formatCurrency, getBatchStatusMeta, getCropEmoji } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { cardShadow } from '../../constants/shadows';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorMessage from '../../components/ErrorMessage';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ProduceDetail'>;

export default function ProduceDetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { batchId } = route.params;
  const [batch, setBatch] = useState<ProduceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBatchById(batchId);
        setBatch(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load produce details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  if (loading) {
    return <LoadingOverlay message="Loading produce details..." />;
  }

  if (!batch) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error ?? 'Produce batch not found.'} />
      </View>
    );
  }

  const statusMeta = getBatchStatusMeta(batch.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{getCropEmoji(batch.cropName)}</Text>
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.title}>{batch.cropName}</Text>
          {batch.variety ? <Text style={styles.variety}>{batch.variety}</Text> : null}
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.background }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Farmer</Text>
          <Text style={styles.value}>{batch.farmerName}</Text>
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
        {batch.pricePerKg !== undefined && (
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.value}>{formatCurrency(batch.pricePerKg)}/kg</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Traceability Timeline</Text>
      {batch.processingStages.length === 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.emptyText}>No processing stages recorded yet.</Text>
        </View>
      ) : (
        <View style={styles.infoCard}>
          {batch.processingStages.map((stage, index) => (
            <View
              key={stage.id}
              style={[styles.timelineItem, index === batch.processingStages.length - 1 && styles.rowLast]}
            >
              <View style={styles.timelineDot}>
                <Ionicons name="checkmark" size={12} color={colors.white} />
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.stageName}>{stage.stageName}</Text>
                <Text style={styles.stageDescription}>{stage.description}</Text>
                <Text style={styles.stageDate}>{formatDate(stage.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {batch.inputs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Inputs Used</Text>
          <View style={styles.infoCard}>
            {batch.inputs.map((input, index) => (
              <View
                key={`${input.name}-${index}`}
                style={[styles.row, index === batch.inputs.length - 1 && styles.rowLast]}
              >
                <Text style={styles.label}>{input.name}</Text>
                <Text style={styles.value}>
                  {input.quantity} • {formatDate(input.appliedDate)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
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
      padding: 16,
      paddingBottom: 32,
    },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      ...cardShadow,
    },
    emojiWrap: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    emoji: {
      fontSize: 28,
    },
    headerBody: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    variety: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 2,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      ...cardShadow,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    label: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    value: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 13,
    },
    timelineItem: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timelineDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 1,
    },
    timelineBody: {
      flex: 1,
    },
    stageName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    stageDescription: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    stageDate: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
    },
  });
}

import apiClient from './axios';
import {
  ProduceBatch,
  CreateBatchPayload,
  AddProcessingStagePayload,
  BatchStatus,
  CatalogueParams,
} from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_BATCHES } from '../mock/mockData';
import { mockDelay, generateMockId } from '../mock/mockHelpers';
import { getUser } from '../utils/storage';

export async function createBatch(payload: CreateBatchPayload): Promise<ProduceBatch> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const id = generateMockId('pb');
    const batch: ProduceBatch = {
      id,
      farmerId: user?.id ?? 'unknown',
      farmerName: user?.fullName ?? 'You',
      status: 'PLANTED',
      inputs: payload.inputs ?? [],
      processingStages: [],
      qrCodeValue: `AGROCHAIN-BATCH-${id.toUpperCase()}`,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    MOCK_BATCHES.unshift(batch);
    return mockDelay(batch);
  }
  const { data } = await apiClient.post<ProduceBatch>('/produce/batches', payload);
  return data;
}

export async function getMyBatches(): Promise<ProduceBatch[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const mine = MOCK_BATCHES.filter((b) => b.farmerId === user?.id);
    return mockDelay(mine);
  }
  const { data } = await apiClient.get<ProduceBatch[]>('/produce/batches/mine');
  return data;
}

export async function getBatchById(batchId: string): Promise<ProduceBatch> {
  if (USE_MOCK_DATA) {
    const found = MOCK_BATCHES.find((b) => b.id === batchId);
    if (!found) throw new Error('Produce batch not found');
    return mockDelay(found);
  }
  const { data } = await apiClient.get<ProduceBatch>(`/produce/batches/${batchId}`);
  return data;
}

export async function addProcessingStage(
  batchId: string,
  payload: AddProcessingStagePayload
): Promise<ProduceBatch> {
  if (USE_MOCK_DATA) {
    const index = MOCK_BATCHES.findIndex((b) => b.id === batchId);
    if (index === -1) throw new Error('Produce batch not found');
    MOCK_BATCHES[index] = {
      ...MOCK_BATCHES[index],
      processingStages: [
        ...MOCK_BATCHES[index].processingStages,
        { id: generateMockId('st'), timestamp: new Date().toISOString(), ...payload },
      ],
    };
    return mockDelay(MOCK_BATCHES[index]);
  }
  const { data } = await apiClient.post<ProduceBatch>(
    `/produce/batches/${batchId}/stages`,
    payload
  );
  return data;
}

export async function updateBatchStatus(
  batchId: string,
  status: BatchStatus
): Promise<ProduceBatch> {
  if (USE_MOCK_DATA) {
    const index = MOCK_BATCHES.findIndex((b) => b.id === batchId);
    if (index === -1) throw new Error('Produce batch not found');
    MOCK_BATCHES[index] = { ...MOCK_BATCHES[index], status };
    return mockDelay(MOCK_BATCHES[index]);
  }
  const { data } = await apiClient.patch<ProduceBatch>(
    `/produce/batches/${batchId}/status`,
    { status }
  );
  return data;
}

export async function getProduceCatalogue(params: CatalogueParams): Promise<ProduceBatch[]> {
  if (USE_MOCK_DATA) {
    const query = params.query?.toLowerCase();
    const filtered = MOCK_BATCHES.filter((batch) => {
      if (params.region && batch.region !== params.region) return false;
      if (params.district && batch.district !== params.district) return false;
      if (query && !batch.cropName.toLowerCase().includes(query)) return false;
      return true;
    });
    const limited = params.size ? filtered.slice(0, params.size) : filtered;
    return mockDelay(limited);
  }
  const { data } = await apiClient.get<ProduceBatch[]>('/produce/catalogue', { params });
  return data;
}

export async function scanQrCode(qrCodeValue: string): Promise<ProduceBatch> {
  if (USE_MOCK_DATA) {
    const found = MOCK_BATCHES.find((b) => b.qrCodeValue === qrCodeValue);
    if (!found) throw new Error('No produce batch found for this QR code');
    return mockDelay(found);
  }
  const { data } = await apiClient.get<ProduceBatch>('/produce/scan', {
    params: { qrCodeValue },
  });
  return data;
}

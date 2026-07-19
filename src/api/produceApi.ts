import apiClient, { extractArray } from './axios';
import {
  ProduceBatch,
  CreateBatchPayload,
  AddProcessingStagePayload,
  BatchStatus,
  CatalogueParams,
  MarketplaceListing,
  MarketplaceCategory,
  MarketplaceListingStatus,
  CreateMarketplaceListingPayload,
} from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_BATCHES, MOCK_MARKETPLACE_LISTINGS } from '../mock/mockData';
import { mockDelay, generateMockId } from '../mock/mockHelpers';
import { getUser } from '../utils/storage';

// Backend may omit inputs/processingStages entirely (or send null) when empty,
// and some endpoints reply 201/204 with no body at all — normalize defensively
// so screens can safely call .length on them without crashing on a real success.
function normalizeBatch(batch: ProduceBatch | null | undefined): ProduceBatch {
  return {
    ...(batch ?? ({} as ProduceBatch)),
    inputs: batch?.inputs ?? [],
    processingStages: batch?.processingStages ?? [],
  };
}

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
  return normalizeBatch(data);
}

export async function getMyBatches(): Promise<ProduceBatch[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const mine = MOCK_BATCHES.filter((b) => b.farmerId === user?.id);
    return mockDelay(mine);
  }
  console.log('[API] GET /produce/batches/mine');
  const { data } = await apiClient.get<any>('/produce/batches/mine');
  const result = extractArray<ProduceBatch>(data).map(normalizeBatch);
  console.log('[API] /produce/batches/mine ->', result.length, 'batches');
  return result;
}

export async function getBatchById(batchId: string): Promise<ProduceBatch> {
  if (USE_MOCK_DATA) {
    const found = MOCK_BATCHES.find((b) => b.id === batchId);
    if (!found) throw new Error('Produce batch not found');
    return mockDelay(found);
  }
  const { data } = await apiClient.get<ProduceBatch>(`/produce/batches/${batchId}`);
  return normalizeBatch(data);
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
  return normalizeBatch(data);
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
  return normalizeBatch(data);
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
  console.log('[API] GET /produce/catalogue', params);
  const { data } = await apiClient.get<any>('/produce/catalogue', { params });
  const result = extractArray<ProduceBatch>(data).map(normalizeBatch);
  console.log('[API] /produce/catalogue ->', result.length, 'batches');
  return result;
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
  return normalizeBatch(data);
}

// ===== Marketplace =====

export interface MarketplaceListingsParams {
  category?: MarketplaceCategory;
  query?: string;
}

export async function getMarketplaceListings(
  params: MarketplaceListingsParams = {}
): Promise<MarketplaceListing[]> {
  if (USE_MOCK_DATA) {
    const query = params.query?.toLowerCase();
    const filtered = MOCK_MARKETPLACE_LISTINGS.filter((listing) => {
      if (params.category && listing.category !== params.category) return false;
      if (query && !listing.name.toLowerCase().includes(query)) return false;
      return true;
    });
    return mockDelay(filtered);
  }
  console.log('[API] GET /marketplace/listings', params);
  const { data } = await apiClient.get<any>('/marketplace/listings', { params });
  const result = extractArray<MarketplaceListing>(data);
  console.log('[API] /marketplace/listings ->', result.length, 'listings');
  return result;
}

export async function getMarketplaceListingById(listingId: string): Promise<MarketplaceListing> {
  if (USE_MOCK_DATA) {
    const found = MOCK_MARKETPLACE_LISTINGS.find((l) => l.id === listingId);
    if (!found) throw new Error('Listing not found');
    found.viewsCount += 1;
    return mockDelay(found);
  }
  const { data } = await apiClient.get<MarketplaceListing>(`/marketplace/listings/${listingId}`);
  return data;
}

export async function getMyMarketplaceListings(): Promise<MarketplaceListing[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const mine = MOCK_MARKETPLACE_LISTINGS.filter((l) => l.sellerId === user?.id);
    return mockDelay(mine);
  }
  console.log('[API] GET /marketplace/listings/mine');
  const { data } = await apiClient.get<any>('/marketplace/listings/mine');
  const result = extractArray<MarketplaceListing>(data);
  console.log('[API] /marketplace/listings/mine ->', result.length, 'listings');
  return result;
}

export async function createMarketplaceListing(
  payload: CreateMarketplaceListingPayload
): Promise<MarketplaceListing> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const listing: MarketplaceListing = {
      id: generateMockId('ml'),
      sellerId: user?.id ?? 'unknown',
      sellerName: user?.fullName ?? 'You',
      status: 'ACTIVE',
      viewsCount: 0,
      inquiriesCount: 0,
      ordersCount: 0,
      photoUrls: [],
      createdAt: new Date().toISOString(),
      ...payload,
    };
    MOCK_MARKETPLACE_LISTINGS.unshift(listing);
    return mockDelay(listing);
  }
  const { data } = await apiClient.post<MarketplaceListing>('/marketplace/listings', payload);
  return data;
}

export async function updateMarketplaceListing(
  listingId: string,
  payload: CreateMarketplaceListingPayload
): Promise<MarketplaceListing> {
  if (USE_MOCK_DATA) {
    const index = MOCK_MARKETPLACE_LISTINGS.findIndex((l) => l.id === listingId);
    if (index === -1) throw new Error('Listing not found');
    MOCK_MARKETPLACE_LISTINGS[index] = { ...MOCK_MARKETPLACE_LISTINGS[index], ...payload };
    return mockDelay(MOCK_MARKETPLACE_LISTINGS[index]);
  }
  const { data } = await apiClient.put<MarketplaceListing>(
    `/marketplace/listings/${listingId}`,
    payload
  );
  return data;
}

export async function updateMarketplaceListingStatus(
  listingId: string,
  status: MarketplaceListingStatus
): Promise<MarketplaceListing> {
  if (USE_MOCK_DATA) {
    const index = MOCK_MARKETPLACE_LISTINGS.findIndex((l) => l.id === listingId);
    if (index === -1) throw new Error('Listing not found');
    MOCK_MARKETPLACE_LISTINGS[index] = { ...MOCK_MARKETPLACE_LISTINGS[index], status };
    return mockDelay(MOCK_MARKETPLACE_LISTINGS[index]);
  }
  const { data } = await apiClient.patch<MarketplaceListing>(
    `/marketplace/listings/${listingId}/status`,
    { status }
  );
  return data;
}

export async function deleteMarketplaceListing(listingId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const index = MOCK_MARKETPLACE_LISTINGS.findIndex((l) => l.id === listingId);
    if (index !== -1) MOCK_MARKETPLACE_LISTINGS.splice(index, 1);
    await mockDelay(undefined);
    return;
  }
  await apiClient.delete(`/marketplace/listings/${listingId}`);
}

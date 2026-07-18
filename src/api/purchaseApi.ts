import apiClient, { extractArray } from './axios';
import { MarketplacePurchase, ProducePurchase, InitiatePurchasePayload } from '../types';
import { USE_MOCK_DATA } from '../config';
import { mockDelay, generateMockId } from '../mock/mockHelpers';

// ===== Marketplace purchases =====

export async function initiateMarketplacePurchase(
  listingId: string,
  payload: InitiatePurchasePayload
): Promise<MarketplacePurchase> {
  if (USE_MOCK_DATA) {
    return mockDelay({
      id: generateMockId('mp'),
      status: 'PAID',
    } as MarketplacePurchase);
  }
  console.log('[API] POST /marketplace/listings/' + listingId + '/purchase');
  const { data } = await apiClient.post<MarketplacePurchase>(
    `/marketplace/listings/${listingId}/purchase`,
    payload
  );
  return data;
}

export async function markMarketplaceShipped(purchaseId: string): Promise<MarketplacePurchase> {
  const { data } = await apiClient.patch<MarketplacePurchase>(
    `/marketplace/purchases/${purchaseId}/mark-shipped`
  );
  return data;
}

export async function confirmMarketplaceReceipt(purchaseId: string): Promise<MarketplacePurchase> {
  const { data } = await apiClient.patch<MarketplacePurchase>(
    `/marketplace/purchases/${purchaseId}/confirm-receipt`
  );
  return data;
}

export async function cancelMarketplacePurchase(purchaseId: string): Promise<MarketplacePurchase> {
  const { data } = await apiClient.post<MarketplacePurchase>(
    `/marketplace/purchases/${purchaseId}/cancel`
  );
  return data;
}

export async function getMyMarketplacePurchases(): Promise<MarketplacePurchase[]> {
  if (USE_MOCK_DATA) return mockDelay([]);
  const { data } = await apiClient.get<any>('/marketplace/purchases/mine');
  return extractArray<MarketplacePurchase>(data);
}

export async function getIncomingMarketplacePurchases(): Promise<MarketplacePurchase[]> {
  if (USE_MOCK_DATA) return mockDelay([]);
  const { data } = await apiClient.get<any>('/marketplace/purchases/incoming');
  return extractArray<MarketplacePurchase>(data);
}

// ===== Produce purchases =====

export async function initiateProducePurchase(
  batchId: string,
  payload: InitiatePurchasePayload
): Promise<ProducePurchase> {
  if (USE_MOCK_DATA) {
    return mockDelay({
      id: generateMockId('pp'),
      status: 'PAID',
    } as ProducePurchase);
  }
  console.log('[API] POST /produce/batches/' + batchId + '/purchase');
  const { data } = await apiClient.post<ProducePurchase>(
    `/produce/batches/${batchId}/purchase`,
    payload
  );
  return data;
}

export async function markProduceDelivered(purchaseId: string): Promise<ProducePurchase> {
  const { data } = await apiClient.patch<ProducePurchase>(
    `/produce/purchases/${purchaseId}/mark-delivered`
  );
  return data;
}

export async function confirmProduceReceipt(purchaseId: string): Promise<ProducePurchase> {
  const { data } = await apiClient.patch<ProducePurchase>(
    `/produce/purchases/${purchaseId}/confirm-receipt`
  );
  return data;
}

export async function cancelProducePurchase(purchaseId: string): Promise<ProducePurchase> {
  const { data } = await apiClient.post<ProducePurchase>(
    `/produce/purchases/${purchaseId}/cancel`
  );
  return data;
}

export async function getMyProducePurchases(): Promise<ProducePurchase[]> {
  if (USE_MOCK_DATA) return mockDelay([]);
  const { data } = await apiClient.get<any>('/produce/purchases/mine');
  return extractArray<ProducePurchase>(data);
}

export async function getIncomingProducePurchases(): Promise<ProducePurchase[]> {
  if (USE_MOCK_DATA) return mockDelay([]);
  const { data } = await apiClient.get<any>('/produce/purchases/incoming');
  return extractArray<ProducePurchase>(data);
}

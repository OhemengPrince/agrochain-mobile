import apiClient, { extractArray } from './axios';
import {
  Equipment,
  CatalogueParams,
  CreateEquipmentPayload,
  UpdateEquipmentPayload,
} from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_EQUIPMENT } from '../mock/mockData';
import { mockDelay, generateMockId } from '../mock/mockHelpers';
import { getUser } from '../utils/storage';

// The backend has been observed returning the equipment photo under a few
// different keys depending on the endpoint/version (imageUrl, image_url,
// photoUrl, photo_url). Normalize whichever one is present onto `imageUrl`
// so every screen can rely on a single consistent field.
function normalizeEquipment<T extends Record<string, any>>(raw: T): T & { imageUrl?: string } {
  const imageUrl = raw.imageUrl ?? raw.image_url ?? raw.photoUrl ?? raw.photo_url ?? undefined;
  return { ...raw, imageUrl };
}

export async function searchEquipment(params: CatalogueParams): Promise<Equipment[]> {
  if (USE_MOCK_DATA) {
    const query = params.query?.toLowerCase();
    const filtered = MOCK_EQUIPMENT.filter((item) => {
      if (params.region && item.region !== params.region) return false;
      if (params.district && item.district !== params.district) return false;
      if (params.category && item.category !== params.category) return false;
      if (query && !item.name.toLowerCase().includes(query)) return false;
      return true;
    });
    return mockDelay(filtered);
  }
  console.log('[API] GET /equipment', params);
  const { data } = await apiClient.get<any>('/equipment', { params });
  const result = extractArray<any>(data).map(normalizeEquipment);
  console.log('[API] /equipment ->', result.length, 'items');
  return result;
}

export async function getEquipmentById(equipmentId: string): Promise<Equipment> {
  if (USE_MOCK_DATA) {
    const found = MOCK_EQUIPMENT.find((item) => item.id === equipmentId);
    if (!found) throw new Error('Equipment not found');
    return mockDelay(found);
  }
  console.log('[API] GET /equipment/' + equipmentId);
  const { data } = await apiClient.get<any>(`/equipment/${equipmentId}`);
  const normalized = normalizeEquipment(data);
  console.log('[API] /equipment/' + equipmentId + ' → ownerId:', normalized?.ownerId, '| imageUrl:', normalized?.imageUrl);
  return { ...normalized, viewsCount: normalized?.viewsCount ?? 0 } as Equipment;
}

export async function getMyListings(): Promise<Equipment[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const mine = MOCK_EQUIPMENT.filter((item) => item.ownerId === user?.id);
    return mockDelay(mine);
  }
  console.log('[API] GET /equipment/my-listings');
  const { data } = await apiClient.get<any>('/equipment/my-listings');
  const result = extractArray<any>(data).map(normalizeEquipment);
  console.log('[API] /equipment/my-listings ->', result.length, 'items', result.map((r) => r.imageUrl));
  return result;
}

export async function createEquipment(payload: CreateEquipmentPayload): Promise<Equipment> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const equipment: Equipment = {
      id: generateMockId('eq'),
      ownerId: user?.id ?? 'unknown',
      ownerName: user?.fullName ?? 'You',
      isAvailable: true,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    MOCK_EQUIPMENT.unshift(equipment);
    return mockDelay(equipment);
  }
  const { data } = await apiClient.post<any>('/equipment', payload);
  return normalizeEquipment(data);
}

export async function updateEquipment(
  equipmentId: string,
  payload: UpdateEquipmentPayload
): Promise<Equipment> {
  if (USE_MOCK_DATA) {
    const index = MOCK_EQUIPMENT.findIndex((item) => item.id === equipmentId);
    if (index === -1) throw new Error('Equipment not found');
    MOCK_EQUIPMENT[index] = { ...MOCK_EQUIPMENT[index], ...payload };
    return mockDelay(MOCK_EQUIPMENT[index]);
  }
  const { data } = await apiClient.put<any>(`/equipment/${equipmentId}`, payload);
  return normalizeEquipment(data);
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const index = MOCK_EQUIPMENT.findIndex((item) => item.id === equipmentId);
    if (index !== -1) MOCK_EQUIPMENT.splice(index, 1);
    await mockDelay(undefined);
    return;
  }
  await apiClient.delete(`/equipment/${equipmentId}`);
}

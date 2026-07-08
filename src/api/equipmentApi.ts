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
  const result = extractArray<Equipment>(data);
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
  console.log('[API] /equipment/' + equipmentId + ' raw response keys:', Object.keys(data ?? {}));
  console.log('[API] /equipment/' + equipmentId + ' ownerId:', (data as any)?.ownerId, '| owner:', JSON.stringify((data as any)?.owner));
  return data as Equipment;
}

export async function getMyListings(): Promise<Equipment[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const mine = MOCK_EQUIPMENT.filter((item) => item.ownerId === user?.id);
    return mockDelay(mine);
  }
  console.log('[API] GET /equipment/my-listings');
  const { data } = await apiClient.get<any>('/equipment/my-listings');
  const result = extractArray<Equipment>(data);
  console.log('[API] /equipment/my-listings ->', result.length, 'items');
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
  const { data } = await apiClient.post<Equipment>('/equipment', payload);
  return data;
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
  const { data } = await apiClient.put<Equipment>(`/equipment/${equipmentId}`, payload);
  return data;
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

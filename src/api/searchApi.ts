import apiClient from './axios';
import { USE_MOCK_DATA } from '../config';
import { MOCK_FARMERS, MOCK_EQUIPMENT, MOCK_BATCHES, MOCK_MARKETPLACE_LISTINGS } from '../mock/mockData';
import { mockDelay } from '../mock/mockHelpers';
import { User, Equipment, ProduceBatch, MarketplaceListing } from '../types';

export interface SearchResults {
  people: User[];
  equipment: Equipment[];
  produce: ProduceBatch[];
  marketplace: MarketplaceListing[];
  totalResults: number;
}

const mockSearchResults = (query: string): SearchResults => {
  const q = query.toLowerCase();
  const people = MOCK_FARMERS.filter((u) => u.fullName.toLowerCase().includes(q));
  const equipment = MOCK_EQUIPMENT.filter((e) => e.name.toLowerCase().includes(q));
  const produce = MOCK_BATCHES.filter((b) => b.cropName.toLowerCase().includes(q));
  const marketplace = MOCK_MARKETPLACE_LISTINGS.filter((l) => l.name.toLowerCase().includes(q));
  return {
    people,
    equipment,
    produce,
    marketplace,
    totalResults: people.length + equipment.length + produce.length + marketplace.length,
  };
};

export async function globalSearch(query: string, limit = 5): Promise<SearchResults> {
  if (USE_MOCK_DATA) {
    return mockDelay(mockSearchResults(query));
  }
  const { data } = await apiClient.get<SearchResults>('/search', { params: { query, limit } });
  return data;
}

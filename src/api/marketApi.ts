import apiClient, { extractArray } from './axios';
import { USE_MOCK_DATA } from '../config';

export interface MarketPrice {
  crop: string;
  price: number;
  unit: string;
  currency: string;
  change: number;       // percentage change; positive = up, negative = down
  trend: 'UP' | 'DOWN' | 'STABLE';
  source: string;
  lastUpdated: string;  // ISO date string
}

const MOCK_PRICES: MarketPrice[] = [
  { crop: 'Maize',     price: 350,  unit: 'per bag',   currency: 'GHS', change: 12.5, trend: 'UP',   source: 'Manual', lastUpdated: new Date().toISOString() },
  { crop: 'Cocoa',     price: 1200, unit: 'per bag',   currency: 'GHS', change: -3.2, trend: 'DOWN', source: 'Manual', lastUpdated: new Date().toISOString() },
  { crop: 'Tomato',    price: 180,  unit: 'per crate', currency: 'GHS', change: 9.8,  trend: 'UP',   source: 'Manual', lastUpdated: new Date().toISOString() },
  { crop: 'Cassava',   price: 85,   unit: 'per bag',   currency: 'GHS', change: -1.5, trend: 'DOWN', source: 'Manual', lastUpdated: new Date().toISOString() },
  { crop: 'Rice',      price: 520,  unit: 'per bag',   currency: 'GHS', change: 4.2,  trend: 'UP',   source: 'Manual', lastUpdated: new Date().toISOString() },
  { crop: 'Groundnut', price: 290,  unit: 'per bag',   currency: 'GHS', change: 6.7,  trend: 'UP',   source: 'Manual', lastUpdated: new Date().toISOString() },
];

export async function getMarketPrices(): Promise<MarketPrice[]> {
  if (USE_MOCK_DATA) {
    return MOCK_PRICES;
  }
  try {
    const { data } = await apiClient.get<any>('/market/prices');
    return extractArray<MarketPrice>(data);
  } catch {
    // always return something — fall back to mock data when backend unavailable
    return MOCK_PRICES;
  }
}

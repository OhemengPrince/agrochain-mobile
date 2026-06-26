import { BatchStatus, EquipmentCategory, UserRole } from '../types';
import { colors } from '../constants/colors';

export function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatRole(role: UserRole): string {
  switch (role) {
    case 'FARMER':
      return 'Farmer';
    case 'EQUIPMENT_OWNER':
      return 'Equipment Owner';
    case 'BUYER':
      return 'Buyer';
    default:
      return role;
  }
}

export interface BatchStatusMeta {
  label: string;
  color: string;
  background: string;
}

export function getBatchStatusMeta(status: BatchStatus): BatchStatusMeta {
  switch (status) {
    case 'PROCESSING':
      return { label: 'PROCESSING', color: colors.statusAmber, background: colors.statusAmberLight };
    case 'READY_FOR_SALE':
      return { label: 'READY', color: colors.statusGreen, background: colors.statusGreenLight };
    case 'SOLD':
      return { label: 'SOLD', color: colors.statusGray, background: colors.statusGrayLight };
    case 'PLANTED':
    case 'GROWING':
    case 'HARVESTED':
    default:
      return { label: 'LOGGED', color: colors.statusBlue, background: colors.statusBlueLight };
  }
}

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽',
  corn: '🌽',
  rice: '🌾',
  millet: '🌾',
  sorghum: '🌾',
  wheat: '🌾',
  tomato: '🍅',
  pepper: '🌶️',
  cassava: '🥔',
  yam: '🥔',
  potato: '🥔',
  cocoa: '🍫',
  cashew: '🌰',
  banana: '🍌',
  plantain: '🍌',
  mango: '🥭',
  pineapple: '🍍',
  onion: '🧅',
  groundnut: '🥜',
  peanut: '🥜',
  bean: '🫘',
  cotton: '☁️',
};

export function getCropEmoji(cropName: string): string {
  const lower = cropName.toLowerCase();
  const match = Object.keys(CROP_EMOJI).find((key) => lower.includes(key));
  return match ? CROP_EMOJI[match] : '🌾';
}

export function formatCategory(category: EquipmentCategory): string {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

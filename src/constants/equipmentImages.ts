import { EquipmentCategory } from '../types';

export const EQUIPMENT_IMAGES: Record<EquipmentCategory, any> = {
  TRACTOR: require('../assets/equipment/tractor.jpg'),
  HARVESTER: require('../assets/equipment/harvester.jpg'),
  IRRIGATION: require('../assets/equipment/irrigation.jpg'),
  SPRAYER: require('../assets/equipment/sprayer.jpg'),
  TILLER: require('../assets/equipment/tiller.jpg'),
  SHELLER: require('../assets/equipment/sheller.jpg'),
  OTHER: require('../assets/equipment/tractor.jpg'),
};

export function getEquipmentImage(category: EquipmentCategory) {
  return EQUIPMENT_IMAGES[category] ?? EQUIPMENT_IMAGES.OTHER;
}

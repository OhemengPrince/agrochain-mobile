// ===== User & Auth =====

export type UserRole = 'FARMER' | 'EQUIPMENT_OWNER' | 'BUYER' | 'GENERAL' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  region?: string;
  district?: string;
  profileImageUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  region?: string;
  district?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

// ===== Equipment =====

export type EquipmentCategory =
  | 'TRACTOR'
  | 'HARVESTER'
  | 'TILLER'
  | 'SPRAYER'
  | 'IRRIGATION'
  | 'SHELLER'
  | 'OTHER';

export interface Equipment {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  category: EquipmentCategory;
  description: string;
  dailyRate: number;
  region: string;
  district: string;
  imageUrl?: string;
  image?: any;
  isAvailable: boolean;
  averageRating?: number;
  totalReviews?: number;
  createdAt: string;
}

export interface CreateEquipmentPayload {
  name: string;
  category: EquipmentCategory;
  description: string;
  dailyRate: number;
  region: string;
  district: string;
  imageUrl?: string;
}

export interface UpdateEquipmentPayload extends Partial<CreateEquipmentPayload> {
  isAvailable?: boolean;
}

export interface CatalogueParams {
  region?: string;
  district?: string;
  category?: EquipmentCategory;
  query?: string;
  page?: number;
  size?: number;
}

// ===== Booking =====

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'REJECTED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  farmerId: string;
  farmerName: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface CreateBookingPayload {
  equipmentId: string;
  startDate: string;
  endDate: string;
}

export interface ReviewPayload {
  bookingId: string;
  rating: number;
  comment?: string;
}

// ===== Produce / Traceability =====

export type BatchStatus =
  | 'PLANTED'
  | 'GROWING'
  | 'HARVESTED'
  | 'PROCESSING'
  | 'READY_FOR_SALE'
  | 'SOLD';

export interface InputItem {
  name: string;
  quantity: string;
  appliedDate: string;
}

export interface ProcessingStage {
  id: string;
  stageName: string;
  description: string;
  location?: string;
  timestamp: string;
}

export interface ProduceBatch {
  id: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  variety?: string;
  quantityKg: number;
  region: string;
  district: string;
  status: BatchStatus;
  inputs: InputItem[];
  processingStages: ProcessingStage[];
  qrCodeValue: string;
  plantedDate?: string;
  harvestedDate?: string;
  pricePerKg?: number;
  createdAt: string;
}

export interface CreateBatchPayload {
  cropName: string;
  variety?: string;
  quantityKg: number;
  region: string;
  district: string;
  plantedDate?: string;
  inputs?: InputItem[];
}

export interface AddProcessingStagePayload {
  stageName: string;
  description: string;
  location?: string;
}

// ===== Notifications =====

export type NotificationType =
  | 'BOOKING'
  | 'PAYMENT'
  | 'BATCH'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// ===== Marketplace =====

export type MarketplaceCategory = 'PRODUCE' | 'EQUIPMENT' | 'SEEDS' | 'TOOLS' | 'OTHER';

export type MarketplacePriceType = 'FIXED' | 'PER_DAY' | 'NEGOTIABLE';

export type MarketplaceListingStatus = 'ACTIVE' | 'SOLD' | 'RENTED' | 'PENDING';

export type MarketplaceContactPreference = 'CALL' | 'WHATSAPP' | 'IN_APP';

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  category: MarketplaceCategory;
  name: string;
  description: string;
  priceType: MarketplacePriceType;
  price: number;
  quantity?: string;
  photoUrls: string[];
  region: string;
  district: string;
  contactPreference: MarketplaceContactPreference;
  status: MarketplaceListingStatus;
  viewsCount: number;
  inquiriesCount: number;
  ordersCount: number;
  createdAt: string;
}

export interface CreateMarketplaceListingPayload {
  category: MarketplaceCategory;
  name: string;
  description: string;
  priceType: MarketplacePriceType;
  price: number;
  quantity?: string;
  photoUrls?: string[];
  region: string;
  district: string;
  contactPreference: MarketplaceContactPreference;
}

export interface MarketplaceListingOrder {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

// ===== Navigation =====

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  CreateAccount: undefined;
  OtpVerify: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type MarketplaceStackParamList = {
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: undefined;
  MyMarketplaceListings: undefined;
};

export type FarmerStackParamList = {
  FarmerHome: undefined;
  FarmerHomeMain: undefined;
  FarmerEquipment: { query?: string } | undefined;
  FarmerEquipmentList: { query?: string } | undefined;
  EquipmentDetail: { equipmentId: string };
  FarmerBookings: undefined;
  FarmerBookingsList: undefined;
  BookingDetail: { bookingId: string };
  CreateBatch: undefined;
  FarmerBatches: undefined;
  FarmerBatchesList: undefined;
  BatchDetail: { batchId: string };
  FarmerProfile: undefined;
  FarmerProfileMain: undefined;
  FarmerNotifications: undefined;
  FarmerMarket: undefined;
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: undefined;
  MyMarketplaceListings: undefined;
};

export type OwnerStackParamList = {
  OwnerDashboard: undefined;
  OwnerDashboardMain: undefined;
  OwnerEquipment: undefined;
  OwnerEquipmentList: undefined;
  CreateEquipment: undefined;
  EditEquipment: { equipmentId: string };
  OwnerBookings: undefined;
  OwnerBookingsList: undefined;
  BookingDetail: { bookingId: string };
  OwnerProfile: undefined;
  OwnerProfileMain: undefined;
  OwnerNotifications: undefined;
  OwnerSettings: undefined;
  OwnerMarket: undefined;
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: undefined;
  MyMarketplaceListings: undefined;
};

export type BuyerStackParamList = {
  BuyerHome: undefined;
  BuyerHomeMain: undefined;
  BuyerCatalogue: undefined;
  BuyerCatalogueList: undefined;
  ProduceDetail: { batchId: string };
  BuyerScanner: undefined;
  BuyerQrScanner: undefined;
  BuyerProfile: undefined;
  BuyerProfileMain: undefined;
  BuyerNotifications: undefined;
  BuyerSettings: undefined;
  BuyerMarket: undefined;
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: undefined;
  MyMarketplaceListings: undefined;
};

export type GeneralStackParamList = {
  GeneralHome: undefined;
  GeneralHomeMain: undefined;
  GeneralMarket: undefined;
  GeneralList: undefined;
  GeneralBrowse: undefined;
  GeneralEquipmentList: { query?: string } | undefined;
  EquipmentDetail: { equipmentId: string };
  GeneralProfile: undefined;
  GeneralProfileMain: undefined;
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: undefined;
  MyMarketplaceListings: undefined;
};

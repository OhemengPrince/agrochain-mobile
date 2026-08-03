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
  profilePhotoUrl?: string;
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

// Mirrors the backend's GoogleLoginResponse exactly: newUser=false means
// token/user are populated (treat like a normal login); newUser=true means
// email/fullName/profilePhotoUrl are populated instead (verified by Google,
// not yet an account) — collect role/region/etc. and call googleRegister.
export interface GoogleAuthResult {
  newUser: boolean;
  token?: string;
  user?: User;
  email?: string;
  fullName?: string;
  profilePhotoUrl?: string;
}

export interface GoogleRegisterPayload {
  idToken: string;
  role: UserRole;
  phoneNumber?: string;
  region?: string;
  district?: string;
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
  viewsCount?: number;
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
  reviewed?: boolean;
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

export interface UserReview {
  id: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
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
  photoUrl?: string;
  createdAt: string;
}

export interface CreateBatchPayload {
  cropName: string;
  variety?: string;
  quantityKg: number;
  region: string;
  district: string;
  plantedDate?: string;
  photoUrl?: string;
  inputs?: InputItem[];
}

export interface AddProcessingStagePayload {
  stageName: string;
  description: string;
  location?: string;
}

// ===== Chat =====

export interface ChatRoom {
  id: string;
  participant1: User;
  participant2: User;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  replyToId?: string;
  deleted?: boolean;
  reactions?: ReactionSummary[];
  myReaction?: string | null;
}

export interface ChatSocketMessage {
  id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  audioUrl?: string;
  audioDuration?: number;
  messageType?: string;
  replyToId?: string;
  deleted?: boolean;
  reactions?: ReactionSummary[];
  myReaction?: string | null;
}

export type ItemType = 'EQUIPMENT' | 'LISTING';

export interface ItemComment {
  id: string;
  itemType: ItemType;
  itemId: string;
  authorId: string;
  authorName: string;
  text: string;
  parentId?: string;
  createdAt: string;
  reactions: ReactionSummary[];
  myReaction?: string | null;
}

// ===== Notifications =====

export type NotificationType =
  | 'BOOKING'
  | 'PAYMENT'
  | 'BATCH'
  | 'SYSTEM'
  | 'NEW_EQUIPMENT'
  | 'NEW_LISTING'
  | 'NEW_PRODUCE'
  | 'PRICE_CHANGE'
  | 'BOOKING_ACCEPTED'
  | 'NEW_FOLLOWER'
  | 'NEW_ORDER'
  | 'ORDER_SHIPPED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RELEASED';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId?: string;
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

// ===== Purchases (Marketplace & Produce) =====

export type PurchaseStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface InitiatePurchasePayload {
  quantity: number;
  paymentMethod: 'MOMO' | 'BANK';
  network?: string;
  phoneNumber?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface MarketplacePurchase {
  id: string;
  buyerId: string;
  buyerName: string;
  listingId: string;
  listingName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  baseAmount: number;
  totalAmount: number;
  agrochainFee: number;
  sellerNet: number;
  status: PurchaseStatus;
  paystackReference?: string;
  paymentMethod?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  buyerConfirmedAt?: string;
  autoConfirmAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ProducePurchase {
  id: string;
  buyerId: string;
  buyerName: string;
  batchId: string;
  cropName: string;
  farmerId: string;
  farmerName: string;
  quantityKg: number;
  pricePerKg: number;
  baseAmount: number;
  totalAmount: number;
  agrochainFee: number;
  sellerNet: number;
  status: PurchaseStatus;
  paystackReference?: string;
  paymentMethod?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  buyerConfirmedAt?: string;
  autoConfirmAt?: string;
  completedAt?: string;
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
  ResetPassword: { identifier: string; method: 'email' | 'sms' };
  RoleSelection: { email: string; fullName: string; profilePhotoUrl?: string };
};

export type MapRouteParams = {
  title: string;
  subtitle: string;
  district: string;
  region: string;
};

export type BookingPaymentParams = {
  equipmentId: string;
  equipmentName: string;
  dailyRate: number;
  ownerId: string;
  ownerName: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
};

export type MarketplacePaymentParams = {
  listingId: string;
  listingName: string;
  price: number;
  sellerId: string;
  sellerName: string;
  imageUrl?: string;
  kind?: 'listing' | 'produce';
  quantityUnit?: string;
};

export type MarketplaceStackParamList = {
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: { listingId?: string } | undefined;
  MyMarketplaceListings: undefined;
  Map: MapRouteParams;
  Chat: { name: string; role?: string; otherUserId?: string };
  MarketplacePayment: MarketplacePaymentParams;
};

export type FarmerStackParamList = {
  FarmerHome: undefined;
  FarmerHomeMain: undefined;
  GlobalSearch: { query?: string } | undefined;
  PublicProfile: { userId: string };
  FollowList: { userId: string; type: 'followers' | 'following'; userName: string };
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
  CreateListing: { listingId?: string } | undefined;
  MyMarketplaceListings: undefined;
  FarmerNews: undefined;
  NewsMain: undefined;
  NewsArticle: { url: string; title: string };
  Chat: { name: string; role?: string; otherUserId?: string };
  ChatRooms: undefined;
  Map: MapRouteParams;
  Withdrawal: undefined;
  TransactionHistory: undefined;
  BookingPayment: BookingPaymentParams;
  MarketplacePayment: MarketplacePaymentParams;
};

export type OwnerStackParamList = {
  OwnerDashboard: undefined;
  OwnerDashboardMain: undefined;
  GlobalSearch: { query?: string } | undefined;
  PublicProfile: { userId: string };
  FollowList: { userId: string; type: 'followers' | 'following'; userName: string };
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
  CreateListing: { listingId?: string } | undefined;
  MyMarketplaceListings: undefined;
  OwnerNews: undefined;
  NewsMain: undefined;
  NewsArticle: { url: string; title: string };
  Chat: { name: string; role?: string; otherUserId?: string };
  ChatRooms: undefined;
  Map: MapRouteParams;
  Withdrawal: undefined;
  TransactionHistory: undefined;
  BookingPayment: BookingPaymentParams;
  MarketplacePayment: MarketplacePaymentParams;
};

export type BuyerStackParamList = {
  BuyerHome: undefined;
  BuyerHomeMain: undefined;
  GlobalSearch: { query?: string } | undefined;
  PublicProfile: { userId: string };
  FollowList: { userId: string; type: 'followers' | 'following'; userName: string };
  BuyerCatalogue: undefined;
  BuyerCatalogueList: undefined;
  ProduceDetail: { batchId: string };
  BuyerScanner: undefined;
  BuyerQrScanner: undefined;
  BuyerEquipmentList: { query?: string } | undefined;
  EquipmentDetail: { equipmentId: string };
  BuyerProfile: undefined;
  BuyerProfileMain: undefined;
  BuyerNotifications: undefined;
  BuyerSettings: undefined;
  BuyerMarket: undefined;
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: { listingId?: string } | undefined;
  MyMarketplaceListings: undefined;
  BuyerNews: undefined;
  NewsMain: undefined;
  NewsArticle: { url: string; title: string };
  Chat: { name: string; role?: string; otherUserId?: string };
  ChatRooms: undefined;
  Map: MapRouteParams;
  Withdrawal: undefined;
  TransactionHistory: undefined;
  BookingPayment: BookingPaymentParams;
  MarketplacePayment: MarketplacePaymentParams;
};

export type GeneralStackParamList = {
  GeneralHome: undefined;
  GeneralHomeMain: undefined;
  GlobalSearch: { query?: string } | undefined;
  PublicProfile: { userId: string };
  FollowList: { userId: string; type: 'followers' | 'following'; userName: string };
  GeneralMarket: undefined;
  GeneralList: undefined;
  GeneralBrowse: undefined;
  GeneralEquipmentList: { query?: string } | undefined;
  EquipmentDetail: { equipmentId: string };
  GeneralProfile: undefined;
  GeneralProfileMain: undefined;
  MarketplaceList: undefined;
  MarketplaceListingDetail: { listingId: string };
  CreateListing: { listingId?: string } | undefined;
  MyMarketplaceListings: undefined;
  GeneralNews: undefined;
  GeneralNotifications: undefined;
  NewsMain: undefined;
  NewsArticle: { url: string; title: string };
  Chat: { name: string; role?: string; otherUserId?: string };
  ChatRooms: undefined;
  Map: MapRouteParams;
  Withdrawal: undefined;
  TransactionHistory: undefined;
  BookingPayment: BookingPaymentParams;
  MarketplacePayment: MarketplacePaymentParams;
};

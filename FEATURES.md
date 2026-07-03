# AgroChain Mobile — Feature Documentation

> **Status:** Mock mode (`USE_MOCK_DATA = true` in `src/config.ts`). All API calls are intercepted locally; no live backend is required to run the app. Flip the flag to `false` and point `BASE_URL` in `src/api/axios.ts` to the real server to go live.

---

## 1. PROJECT OVERVIEW

| Field | Value |
|---|---|
| **App name** | AgroChain |
| **Expo slug** | `agrochain-mobile` |
| **Version** | 1.0.0 |
| **Orientation** | Portrait only |
| **Purpose** | Agricultural marketplace and traceability platform for Ghana — connects farmers, equipment owners, and produce buyers |
| **Target users** | Smallholder farmers, equipment rental owners, produce buyers, and general agricultural stakeholders across Ghana |
| **Current status** | Full UI/UX complete; running entirely on mock data; backend integration ready (all API functions written, just gated behind `USE_MOCK_DATA`) |

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK ~54 (React Native 0.81.5) |
| Language | TypeScript ~5.9 |
| UI | React Native core + custom components |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| State / Auth | React Context API (`AuthContext`, `ThemeContext`) |
| Storage | `@react-native-async-storage/async-storage` |
| HTTP client | Axios 1.18 |
| Blur / Glass UI | `expo-blur` ~15 |
| Gradients | `expo-linear-gradient` ~15 |
| Image picker | `expo-image-picker` ~17 |
| Camera / QR | `expo-camera` ~17, `expo-barcode-scanner` ^13 |
| Maps | `react-native-maps` 1.20 |
| QR generation | `react-native-qrcode-svg` ^6 |
| Forms | `react-hook-form` ^7 |
| Location | `expo-location` ~19 |
| Notifications | `expo-notifications` ~0.32 |
| Haptics | `expo-haptics` ~15 |
| News API | The Guardian (`content.guardianapis.com`) — gated by `GUARDIAN_API_KEY` env var |
| Safe area | `react-native-safe-area-context` ~5.6 |
| Icons | `@expo/vector-icons` ^15 (Ionicons) |

---

## 2. USER ROLES & DASHBOARDS

The app supports **five role values** (`UserRole` type) but ships UI for four:

| Role | Email (demo) | Dashboard persona | Password |
|---|---|---|---|
| `FARMER` | `farmer@agrochain.com` | Kwame Asante | any (mock accepts all) |
| `EQUIPMENT_OWNER` | `owner@agrochain.com` | Nana Yeboah | any |
| `BUYER` | `buyer@agrochain.com` | Kofi Agyemang | any |
| `GENERAL` | `general@agrochain.com` | Ama Boateng | any |
| `ADMIN` | — | No UI implemented | — |

> **Login shortcut:** entering any unknown email with text containing "owner", "buyer", or "general" routes to that role's demo account. Any other email routes to the Farmer dashboard.

### Farmer (`FARMER`)
Can rent equipment, trace produce batches, sell on the marketplace, read news, and chat.
- Tabs: **Home · Equipment · Market · Harvest · News**
- Hidden tabs (accessed from headers): **Bookings · Profile · Notifications**

### Equipment Owner (`EQUIPMENT_OWNER`)
Lists equipment for rental, manages incoming booking requests, sells on the marketplace.
- Tabs: **Dashboard · Equipment · Market · Bookings · News**
- Hidden tabs: **Notifications · Profile**

### Buyer (`BUYER`)
Browses produce catalogue, scans QR codes to verify produce provenance, buys on the marketplace.
- Tabs: **Home · Market · Scan QR · Catalogue · News**
- Hidden tabs: **Notifications · Profile**

### General User (`GENERAL`)
Can browse equipment, list items on the marketplace, and read news — no equipment rental or produce tracing.
- Tabs: **Home · Market · List Item · Browse · News**
- Hidden tab: **Profile**

---

## 3. ALL SCREENS LIST

### Auth Screens (`src/screens/auth/`)

| File | Screen name | Purpose |
|---|---|---|
| `SplashScreen.tsx` | `Splash` | Animated AgroChain logo splash; auto-navigates to Onboarding |
| `OnboardingScreen.tsx` | `Onboarding` | 3-slide onboarding carousel with hero images; navigates to Login |
| `LoginScreen.tsx` | `Login` | Email + password login; link to CreateAccount and ForgotPassword |
| `CreateAccountScreen.tsx` | `CreateAccount` | Registration form (name, email, phone, password, role, region, district); posts to `register()` then navigates to OtpVerify |
| `OtpVerifyScreen.tsx` | `OtpVerify` | 6-digit OTP digit-box entry with shake animation on error; 60-second countdown resend timer |
| `ForgotPasswordScreen.tsx` | `ForgotPassword` | Email or SMS recovery method selector; sends reset code via `forgotPassword()` or `forgotPasswordSms()` |
| `ResetPasswordScreen.tsx` | `ResetPassword` | OTP entry + new password; calls `verifyResetOtp()` + `resetPassword()` (or SMS variants) |

### Farmer Screens (`src/screens/farmer/`)

| File | Screen name | Purpose |
|---|---|---|
| `FarmerHomeScreen.tsx` | `FarmerHomeMain` | Dashboard with weather widget, quick stats, market prices, equipment shortcuts, recent notifications |
| `EquipmentListScreen.tsx` | `FarmerEquipmentList` / `GeneralEquipmentList` | Searchable + filterable equipment catalogue; filter by region/district/category |
| `EquipmentDetailScreen.tsx` | `EquipmentDetail` | Full equipment detail with hero image (tap to view full screen), date-picker booking flow, live day-count + total cost, owner card, map link, chat link |
| `MyBookingsScreen.tsx` | `FarmerBookingsList` | List of farmer's own bookings with status badges; navigates to BookingDetail |
| `MyBatchesScreen.tsx` | `FarmerBatchesList` | List of produce batches with status chips; create new batch FAB |
| `CreateBatchScreen.tsx` | `CreateBatch` | Form to log a new produce batch (crop, variety, quantity, region, dates, inputs) |
| `BatchDetailScreen.tsx` | `BatchDetail` | Full batch details, chronological processing timeline, QR code display, inputs list, status update |
| `FarmerProfileScreen.tsx` | `FarmerProfileMain` | Farmer profile with stats, personal info sheet, dark mode toggle, logout |

### Owner Screens (`src/screens/owner/`)

| File | Screen name | Purpose |
|---|---|---|
| `OwnerDashboardScreen.tsx` | `OwnerDashboardMain` | Summary dashboard with total revenue, active listings count, pending bookings count, recent booking cards |
| `MyListingsScreen.tsx` | `OwnerEquipmentList` | Owner's equipment listings with availability toggle, edit and delete actions |
| `CreateEquipmentScreen.tsx` | `CreateEquipment` | Form to add new equipment listing (name, category, description, daily rate, region, district) |
| `EditEquipmentScreen.tsx` | `EditEquipment` | Pre-filled form to edit an existing equipment listing |
| `IncomingBookingsScreen.tsx` | `OwnerBookingsList` | All booking requests for owner's equipment with confirm/cancel/complete actions |
| `OwnerProfileScreen.tsx` | `OwnerProfileMain` | Owner profile with stats (total equipment, total bookings, revenue), personal info, dark mode toggle, logout |

### Buyer Screens (`src/screens/buyer/`)

| File | Screen name | Purpose |
|---|---|---|
| `BuyerHomeScreen.tsx` | `BuyerHomeMain` | Dashboard with featured produce listings, quick scan button, market highlights |
| `CatalogueScreen.tsx` | `BuyerCatalogueList` | Searchable produce catalogue filtered by region/crop type |
| `ProduceDetailScreen.tsx` | `ProduceDetail` | Full batch detail for buyer: farmer info, growing history, input log, traceability timeline, QR display |
| `QrScannerScreen.tsx` | `BuyerQrScanner` | Live camera QR scanner; decodes `AGROCHAIN-BATCH-*` codes and navigates to ProduceDetail |
| `BuyerProfileScreen.tsx` | `BuyerProfileMain` | Buyer profile with personal info, contact buttons, dark mode toggle, logout |

### General Screens (`src/screens/general/`)

| File | Screen name | Purpose |
|---|---|---|
| `GeneralHomeScreen.tsx` | `GeneralHomeMain` | Landing dashboard with market highlights, marketplace shortcuts, news preview |
| `GeneralProfileScreen.tsx` | `GeneralProfileMain` | General user profile with personal info, dark mode toggle, logout |

### Marketplace Screens (`src/screens/marketplace/`)

| File | Screen name | Purpose |
|---|---|---|
| `MarketplaceScreen.tsx` | `MarketplaceList` | Browse all marketplace listings; filter by category (PRODUCE / EQUIPMENT / SEEDS / TOOLS / OTHER); search by name |
| `ListingDetailScreen.tsx` | `MarketplaceListingDetail` | Full listing detail with seller info, price, contact preference (Call / WhatsApp / In-App), location, view count |
| `CreateListingScreen.tsx` | `CreateListing` | Form to create a new marketplace listing (category, name, description, price type, price, quantity, region, contact preference) |
| `MyListingsScreen.tsx` | `MyMarketplaceListings` | Seller's own listings with status management (ACTIVE / SOLD / RENTED / PENDING) and delete |

### Shared Screens (`src/screens/shared/`)

| File | Screen name | Purpose | Roles |
|---|---|---|---|
| `ChatScreen.tsx` | `Chat` | Full WhatsApp-style glassmorphism chat with wallpaper background, voice message UI, search-in-chat with highlight, View Profile modal, contact options panel, call options panel, custom wallpaper picker | All |
| `NotificationsScreen.tsx` | `Notifications` | Notifications list grouped by type (BOOKING / PAYMENT / BATCH / SYSTEM); mark-as-read and mark-all-read | All |
| `BookingDetailScreen.tsx` | `BookingDetail` | Full booking detail with status timeline, payment status, equipment and farmer/owner info cards, action buttons (confirm / cancel / complete / review) | Farmer, Owner |
| `MapScreen.tsx` | `Map` | Full-screen map view centred on equipment/listing location with title overlay | All |
| `NewsScreen.tsx` | `News` | Live agriculture news feed from The Guardian API; topic filter chips (All / Farming / Harvest / Fertilizers / Livestock / Markets); article cards with thumbnail, headline, source, time | All |

---

## 4. FEATURES BUILT

### 4.1 Authentication
- **Login** — email + password (mock: accepts any password)
- **Registration** — full account creation with role selection, region/district, OTP email verification
- **OTP Verification** — 6-digit animated digit boxes, shake animation on error, 60-second resend countdown
- **Forgot Password (Email)** — sends reset code to email; OTP entry + new password
- **Forgot Password (SMS)** — sends reset code via SMS; same OTP + password flow
- **Persistent session** — token + user stored in AsyncStorage; auto-login on app relaunch
- **Auto-logout** — clears storage on 401 response from backend

### 4.2 Equipment Rental
- **Browse catalogue** — search by name, filter by region, district, category
- **Equipment detail** — hero image with full-screen viewer, owner card, rating display, daily rate
- **Date-range booking** — interactive month-grid calendar picker (Monday-first), auto-advances end date, live day count and total cost calculation
- **My Bookings** — farmer's booking history with status badges (PENDING / CONFIRMED / COMPLETED / CANCELLED)
- **Booking detail** — full detail with timeline, payment status, action buttons per role
- **Owner listings management** — create, edit, delete, toggle availability
- **Incoming bookings** — owner sees all requests; can confirm, complete, or cancel
- **Reviews** — star-rating + comment submission after completed booking

### 4.3 Produce Traceability
- **Create batch** — log a new produce batch with crop type, variety, quantity, region, plant date, and input records (fertiliser, pesticide, etc.)
- **Processing timeline** — add timestamped processing stages (Planted → Growing → Harvested → Processing → Ready for Sale → Sold)
- **QR code generation** — each batch gets a unique `AGROCHAIN-BATCH-{id}` QR code displayed in the app
- **QR code scanning** — buyer uses the camera to scan any AgroChain batch QR code and instantly views full provenance detail
- **Produce catalogue** — buyers can browse and search available batches by crop name or region

### 4.4 Universal Marketplace
- **Browse listings** — all roles can browse; filter by category and search by name
- **Listing detail** — price, quantity, location, contact preference, seller info, view counter
- **Create listing** — any role can list produce, equipment, seeds, tools, or other items
- **Contact seller** — Call (opens dialler), WhatsApp (deep link), In-App (opens Chat screen)
- **My listings** — manage own listings, change status, delete

### 4.5 Notifications
- In-app notification centre accessible from every home dashboard
- Notification types: BOOKING, PAYMENT, BATCH, SYSTEM
- Per-notification mark-as-read; mark-all-read button
- Unread count badge display

### 4.6 Dark Mode
- Full app-wide dark/light theme via `ThemeContext`
- Theme preference persisted to AsyncStorage
- Toggle available from every profile screen
- All screens, components, and modals respond to theme change instantly

### 4.7 Agriculture News Feed
- Live articles from **The Guardian API** (endpoint: `content.guardianapis.com/search`)
- Runs 4 parallel queries: crops, fertilizers, livestock, markets
- Filters to Ghana-tagged articles (`tag: world/ghana`)
- Headline filtering against 50+ agriculture keywords
- Topic classification into: All / Farming / Harvest / Fertilizers / Livestock / Markets
- Filter chip bar at top of screen
- Article cards with thumbnail, headline, source ("The Guardian"), relative time, summary
- Opens article in external browser on tap

### 4.8 Market Prices Feed
- Visible on Farmer Home and Buyer Home dashboards
- Horizontal scrollable price cards for key commodities (Maize, Cocoa, Cassava, Tomatoes, etc.)
- Shows price per unit and percentage change indicator

### 4.9 In-App Chat (WhatsApp-style)
- Glassmorphism UI with bundled wallpaper background (`assets/default message wallpaper background.jpg`)
- Custom wallpaper picker (photo library) per chat
- Voice message UI with animated waveform bars
- Search in chat with live text highlighting and result navigation (↑/↓)
- **Header tap (avatar/name)** → Contact options panel:
  - View Profile (full glassmorphism profile modal with slide animation)
  - Search in Chat
  - Mute / Unmute
  - Change Wallpaper / Restore Default Wallpaper
  - Clear Chat
  - Block / Report
- **Header three-dots (⋮)** → Call options panel: Voice Call / Video (both "coming soon")
- Contact Profile modal: full-screen with own wallpaper, contact actions (Message, Voice Call, Video), info rows (Role, Region, Phone, Member Since, Status)
- Active indicator, message read receipts (double-tick, green when read)

### 4.10 Profile Management
- Personalised per-role profile screens
- Stats cards (bookings count, batches count, listings count, revenue)
- Personal Info sheet — editable full name, email, phone, region, district
- Profile photo update via camera or photo library
- Dark mode toggle
- Logout

### 4.11 Map View
- Full-screen map (`react-native-maps`) centred on a passed location
- Title and subtitle overlay card
- Accessible from equipment detail, listing detail

### 4.12 Weather Widget
- Displayed on Farmer Home screen
- Location-aware (uses `expo-location`)
- Shows condition, temperature, humidity, wind speed
- Condition image (sunny/cloudy/rainy) from local assets

---

## 5. NAVIGATION STRUCTURE

```
RootNavigator
├── AuthNavigator  (when user === null)
│   ├── Splash
│   ├── Onboarding
│   ├── Login
│   ├── CreateAccount
│   ├── OtpVerify
│   ├── ForgotPassword
│   └── ResetPassword
│
├── FarmerNavigator  (role === FARMER)
│   ├── [Tab] Home (HomeStack)
│   │   ├── FarmerHomeMain
│   │   ├── EquipmentDetail
│   │   ├── FarmerNotifications
│   │   ├── Chat
│   │   └── Map
│   ├── [Tab] Equipment (EquipmentStack)
│   │   ├── FarmerEquipmentList
│   │   ├── EquipmentDetail
│   │   ├── Map
│   │   └── Chat
│   ├── [Hidden] Bookings (BookingsStack)
│   │   ├── FarmerBookingsList
│   │   ├── BookingDetail
│   │   └── Chat
│   ├── [Tab] Market (MarketStack)
│   │   ├── MarketplaceList
│   │   ├── MarketplaceListingDetail
│   │   ├── CreateListing
│   │   ├── MyMarketplaceListings
│   │   ├── Map
│   │   └── Chat
│   ├── [Tab] Harvest (TraceabilityStack)
│   │   ├── FarmerBatchesList
│   │   ├── CreateBatch
│   │   ├── BatchDetail
│   │   └── Map
│   ├── [Tab] News
│   └── [Hidden] Profile (ProfileStack)
│       ├── FarmerProfileMain
│       └── Chat
│
├── OwnerNavigator  (role === EQUIPMENT_OWNER)
│   ├── [Tab] Dashboard (DashboardStack)
│   │   ├── OwnerDashboardMain
│   │   └── Chat
│   ├── [Tab] Equipment (ListingsStack)
│   │   ├── OwnerEquipmentList
│   │   ├── CreateEquipment
│   │   └── EditEquipment
│   ├── [Tab] Market (MarketStack)
│   │   ├── MarketplaceList
│   │   ├── MarketplaceListingDetail
│   │   ├── CreateListing
│   │   ├── MyMarketplaceListings
│   │   ├── Map
│   │   └── Chat
│   ├── [Tab] Bookings (BookingsStack)
│   │   ├── OwnerBookingsList
│   │   ├── BookingDetail
│   │   └── Chat
│   ├── [Tab] News
│   ├── [Hidden] Notifications
│   └── [Hidden] Profile (ProfileStack)
│       ├── OwnerProfileMain
│       └── Chat
│
├── BuyerNavigator  (role === BUYER)
│   ├── [Tab] Home (HomeStack)
│   │   ├── BuyerHomeMain
│   │   ├── ProduceDetail
│   │   ├── BuyerQrScanner
│   │   ├── Chat
│   │   └── Map
│   ├── [Tab] Market (MarketStack)
│   │   ├── MarketplaceList
│   │   ├── MarketplaceListingDetail
│   │   ├── CreateListing
│   │   ├── MyMarketplaceListings
│   │   ├── Map
│   │   └── Chat
│   ├── [Tab] Scan QR (ScannerStack — tab bar hidden)
│   │   ├── BuyerQrScanner
│   │   ├── ProduceDetail
│   │   ├── Map
│   │   └── Chat
│   ├── [Tab] Catalogue (CatalogueStack)
│   │   ├── BuyerCatalogueList
│   │   ├── ProduceDetail
│   │   ├── Map
│   │   └── Chat
│   ├── [Tab] News
│   ├── [Hidden] Notifications
│   └── [Hidden] Profile (ProfileStack)
│       ├── BuyerProfileMain
│       └── Chat
│
└── GeneralUserNavigator  (role === GENERAL)
    ├── [Tab] Home (HomeStack)
    │   ├── GeneralHomeMain
    │   └── Chat
    ├── [Tab] Market (MarketStack)
    │   ├── MarketplaceList
    │   ├── MarketplaceListingDetail
    │   ├── MyMarketplaceListings
    │   ├── Map
    │   └── Chat
    ├── [Tab] List Item (ListStack)
    │   └── CreateListing
    ├── [Tab] Browse (BrowseStack)
    │   ├── GeneralEquipmentList
    │   ├── EquipmentDetail
    │   ├── Map
    │   └── Chat
    ├── [Tab] News
    └── [Hidden] Profile (ProfileStack)
        ├── GeneralProfileMain
        └── Chat
```

Custom tab bar: `src/navigation/CustomTabBar.tsx` — the tab bar auto-hides on screens that should not show it (Chat, QrScanner, full-screen modals).

---

## 6. MOCK DATA

All mock data lives in `src/mock/mockData.ts`. The `USE_MOCK_DATA = true` flag in `src/config.ts` directs every API call to this local data.

### Demo Accounts

| Role | Email | Password | Name | Region |
|---|---|---|---|---|
| Farmer | `farmer@agrochain.com` | any | Kwame Asante | Ashanti / Kumasi |
| Equipment Owner | `owner@agrochain.com` | any | Nana Yeboah | Ashanti / Ejisu |
| Buyer | `buyer@agrochain.com` | any | Kofi Agyemang | Greater Accra |
| General | `general@agrochain.com` | any | Ama Boateng | Greater Accra |

### Mock Dataset Summary

| Entity | Count | Key fields |
|---|---|---|
| Farmers | 5 | f1–f5, regions: Ashanti, Eastern, Brong-Ahafo, Central, Northern |
| Equipment Owners | 3 | o1–o3, regions: Ashanti, Greater Accra, Western |
| Buyers | 2 | by1–by2 |
| General Users | 1 | g1 |
| Equipment listings | 5 | Tractor (GHS 350/day), Harvester (GHS 600/day), Disc Plough (GHS 120/day), Sprayer (GHS 80/day, unavailable), Irrigation Pump (GHS 150/day) |
| Bookings | 5 | Statuses: CONFIRMED, PENDING, COMPLETED, CANCELLED, CONFIRMED |
| Produce batches | 5 | Maize (READY_FOR_SALE), Cocoa (PROCESSING), Cassava (HARVESTED), Tomato (GROWING), Plantain (SOLD) |
| Notifications | 5 | Types: BOOKING×2, PAYMENT×1, BATCH×1, SYSTEM×1 |
| Marketplace listings | 8 | PRODUCE×4, EQUIPMENT×3, OTHER×1 |

### Mock Behaviour
- `register()` stores the payload in a `Map<email, RegisterPayload>` in memory until OTP is verified
- `login()` accepts any password; routes to the matching demo account or infers role from email text
- `mockDelay()` adds a 500ms artificial delay to simulate network latency (`MOCK_DELAY_MS = 500`)
- `generateMockId(prefix)` creates `prefix-<timestamp>` IDs for new records

---

## 7. API ENDPOINTS NEEDED FROM BACKEND

Base URL configured in `src/api/axios.ts`: `http://192.168.x.x:8080/api`  
Auth: Bearer token in `Authorization` header (stored in AsyncStorage, injected by Axios interceptor).  
On 401, the interceptor auto-clears storage and forces logout.

### Authentication — `src/api/authApi.ts`

| Method | Endpoint | Description | Request body |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user | `{ fullName, email, phoneNumber, password, role, region?, district? }` |
| `POST` | `/auth/verify-otp` | Verify registration OTP | `{ email, otp }` → returns `{ token, user }` |
| `POST` | `/auth/login` | Login | `{ email, password }` → returns `{ token, user }` |
| `POST` | `/auth/forgot-password` | Send email reset code | `{ email }` |
| `POST` | `/auth/verify-reset-otp` | Verify email reset OTP | `{ email, otp }` |
| `POST` | `/auth/reset-password` | Set new password (email flow) | `{ email, otp, newPassword }` |
| `POST` | `/auth/forgot-password-sms` | Send SMS reset code | `{ phone }` |
| `POST` | `/auth/verify-reset-otp-sms` | Verify SMS reset OTP | `{ phone, otp }` |
| `POST` | `/auth/reset-password-sms` | Set new password (SMS flow) | `{ phone, otp, newPassword }` |

### Equipment — `src/api/equipmentApi.ts`

| Method | Endpoint | Description | Params / Body |
|---|---|---|---|
| `GET` | `/equipment` | Search/list equipment | Query: `{ region?, district?, category?, query?, page?, size? }` |
| `GET` | `/equipment/:id` | Get single equipment | Path param: `equipmentId` |
| `GET` | `/equipment/my-listings` | Owner's own listings | — |
| `POST` | `/equipment` | Create equipment listing | `{ name, category, description, dailyRate, region, district, imageUrl? }` |
| `PUT` | `/equipment/:id` | Update equipment listing | Partial `CreateEquipmentPayload` + `isAvailable?` |
| `DELETE` | `/equipment/:id` | Delete equipment listing | — |

### Bookings — `src/api/bookingApi.ts`

| Method | Endpoint | Description | Params / Body |
|---|---|---|---|
| `POST` | `/bookings` | Create booking | `{ equipmentId, startDate, endDate }` |
| `GET` | `/bookings/mine` | Farmer's own bookings | — |
| `GET` | `/bookings/incoming` | Owner's received bookings | — |
| `PATCH` | `/bookings/:id/confirm` | Confirm a booking | — |
| `PATCH` | `/bookings/:id/cancel` | Cancel a booking | — |
| `PATCH` | `/bookings/:id/complete` | Mark booking complete | — |
| `POST` | `/bookings/reviews` | Submit a review | `{ bookingId, rating, comment? }` |

### Produce / Traceability / Marketplace — `src/api/produceApi.ts`

| Method | Endpoint | Description | Params / Body |
|---|---|---|---|
| `POST` | `/produce/batches` | Create produce batch | `{ cropName, variety?, quantityKg, region, district, plantedDate?, inputs? }` |
| `GET` | `/produce/batches/mine` | Farmer's own batches | — |
| `GET` | `/produce/batches/:id` | Get single batch | — |
| `POST` | `/produce/batches/:id/stages` | Add processing stage | `{ stageName, description, location? }` |
| `PATCH` | `/produce/batches/:id/status` | Update batch status | `{ status: BatchStatus }` |
| `GET` | `/produce/catalogue` | Browse produce for buyers | Query: `{ region?, district?, query?, size? }` |
| `GET` | `/produce/scan` | Resolve QR code | Query: `{ qrCodeValue }` |
| `GET` | `/marketplace/listings` | Browse marketplace | Query: `{ category?, query? }` |
| `GET` | `/marketplace/listings/:id` | Get listing detail | — |
| `GET` | `/marketplace/listings/mine` | Own listings | — |
| `POST` | `/marketplace/listings` | Create listing | `{ category, name, description, priceType, price, quantity?, photoUrls?, region, district, contactPreference }` |
| `PATCH` | `/marketplace/listings/:id/status` | Update listing status | `{ status: MarketplaceListingStatus }` |
| `DELETE` | `/marketplace/listings/:id` | Delete listing | — |

### Notifications — `src/api/notificationApi.ts`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | Get all notifications for user |
| `PATCH` | `/notifications/:id/read` | Mark notification as read |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read |

### External API

| Service | Endpoint | Auth | Purpose |
|---|---|---|---|
| The Guardian | `https://content.guardianapis.com/search` | `api-key` query param (`GUARDIAN_API_KEY` env var) | Live Ghana agriculture news feed |

---

## 8. DESIGN SYSTEM

### Color Palette

| Token | Light mode | Dark mode | Usage |
|---|---|---|---|
| `background` | `#F2F4F3` | `#121212` | Screen backgrounds |
| `card` | `#FFFFFF` | `#1E1E1E` | Cards, panels |
| `text` | `#1C1C1C` | `#FFFFFF` | Primary text |
| `secondaryText` | `#6B7280` | `#9CA3AF` | Labels, hints |
| `border` | `#E5E7EB` | `#2C2C2C` | Dividers, input borders |
| `primaryGreen` | `#1A6B2E` | `#1A6B2E` | Primary brand colour |
| `primaryGreenDark` | `#124D21` | `#124D21` | Pressed states, dark accents |
| `primaryGreenLight` | `#2E8B45` | `#2E8B45` | Gradient end, highlights |
| `lightGreen` | `#E8F5E9` | `#1E2F22` | Tinted backgrounds |
| `accentAmber` | `#FF8F00` | `#FF8F00` | Warnings, status badges |
| `lightAmber` | `#FFF3E0` | `#332710` | Amber tinted backgrounds |
| `white` | `#FFFFFF` | `#FFFFFF` | Always-white elements |
| `errorRed` | `#B71C1C` | `#EF5350` | Error messages |
| `tabBarBackground` | `#FFFFFF` | `#1E1E1E` | Bottom tab bar |
| `divider` | `#F0F0F0` | `#2C2C2C` | List separators |
| `inputBackground` | `#F8F9FA` | `#1E1E1E` | Text input backgrounds |

### Chat Screen Glassmorphism Palette

| Layer | iOS | Android | Usage |
|---|---|---|---|
| Message area blur | `BlurView intensity: 18–20` | `rgba(4,10,5,0.48)` dark / `rgba(255,255,255,0.38)` light | Main message area |
| Input bar blur | `BlurView intensity: 60` | `rgba(4,10,5,0.88)` dark / `rgba(255,255,255,0.88)` light | Bottom input area |
| Sent bubble | `#0B6E36` (solid green) | — | Farmer/user sent messages |
| Received bubble | `rgba(255,255,255,0.18)` dark / `rgba(255,255,255,0.72)` light | — | Contact received messages |
| Glass cards | `rgba(255,255,255,0.14)` border | — | Profile modal cards |
| Chat root background | `#04331A` | — | Fallback while wallpaper loads |

### Typography
- Primary font: System default (San Francisco on iOS, Roboto on Android)
- Heading: `fontWeight: '800'`, sizes 22–28
- Body: `fontWeight: '400'/'600'`, sizes 13–16
- Labels: `fontWeight: '700'`, uppercase, `letterSpacing: 0.8`

### Components (`src/components/`)

| Component | Purpose |
|---|---|
| `ActiveIndicator` | Animated green pulsing dot — "Active now" status |
| `AppButton` | Gradient primary button with loading state |
| `BatchCard` | Card showing produce batch summary (crop, status, quantity, QR badge) |
| `BookingCard` | Card showing a booking (equipment name, dates, cost, status badge) |
| `EquipmentCard` | Equipment listing card (image, name, rate, rating, availability badge) |
| `EquipmentImage` | Image component with category-based fallback from `equipmentImages.ts` |
| `ErrorMessage` | Inline red error text with icon |
| `LoadingOverlay` | Full-screen semi-transparent loading spinner |
| `MarketNewsFeed` | Horizontal scroll of market price chips with change indicators |
| `NotificationItem` | Single notification row with type icon, title, message, time, read indicator |
| `PersonalInfoSheet` | Bottom-sheet style editable personal info form |
| `ProfileDropdownMenu` | Dropdown menu for profile header actions |
| `ProfileStatCard` | Stat display card (label + value) for profile dashboards |
| `ProfileTabs` | Tab switcher for profile sections |
| `StarRating` | Interactive (or display-only) 5-star rating component |
| `WeatherWidget` | Location-aware weather card with condition image |

### Shadow System (`src/constants/shadows.ts`)
Pre-defined shadow presets (small, medium, large) for consistent elevation across light/dark.

---

## 9. ASSETS

### Root `/assets/`

| File | Purpose |
|---|---|
| `icon.png` | iOS app icon |
| `android-icon-foreground.png` | Android adaptive icon foreground layer |
| `android-icon-background.png` | Android adaptive icon background layer |
| `android-icon-monochrome.png` | Android monochrome icon |
| `favicon.png` | Web favicon |
| `splash-icon.png` | Expo splash screen icon |
| `images/onboarding-hero.jpg` | Onboarding slide 1 hero image |
| `images/onboarding2.jpg` | Onboarding slide 2 hero image |
| `images/onboarding3.jpg` | Onboarding slide 3 hero image |
| `default message wallpaper background.jpg` | Default chat wallpaper (bundled, used across all 4 role chat screens) |

### Equipment Images — `src/assets/equipment/`

| File | Category |
|---|---|
| `tractor.jpg` | `TRACTOR` and `OTHER` (fallback) |
| `harvester.jpg` | `HARVESTER` |
| `tiller.jpg` | `TILLER` |
| `sprayer.jpg` | `SPRAYER` |
| `irrigation.jpg` | `IRRIGATION` |
| `sheller.jpg` | `SHELLER` |

### Weather Images — `src/assets/weather/`

| File | Condition |
|---|---|
| `sunny.jpg` | Clear / sunny weather |
| `cloudy.jpg` | Overcast / cloudy |
| `rainy.jpg` | Rain / storms |

---

## 10. KNOWN ISSUES & TODO

### Active Issues
- **Backend not connected** — `USE_MOCK_DATA = true`; `BASE_URL` in `axios.ts` is a placeholder (`192.168.x.x`)
- **GUARDIAN_API_KEY** — stored in `.env` (gitignored); the news feed will silently fail if the env var is absent or the key quota is exceeded
- **Voice Call / Video Call** — placeholders only; both show "Coming soon" alert
- **Block / Report** — placeholder only; shows "Coming soon" alert
- **Resend OTP** — `Resend` button in `ResetPasswordScreen` is a tappable `TouchableOpacity` but has no handler wired up
- **Chat messages not persisted** — chat history is seeded from a static `SEED` array and resets on every screen mount; no local or remote storage
- **Profile photo not persisted** — profile photo URI is local component state; resets on navigation
- **Market prices feed** — static mock data; no live commodity price API connected
- **Weather widget** — `expo-location` permission is requested but weather data is mock; no live weather API integrated
- **Map** — displays a static location passed via route params; no live GPS tracking of equipment

### Pending Improvements
- Wire up real backend (flip `USE_MOCK_DATA = false`, update `BASE_URL`)
- Implement push notifications via `expo-notifications` (package installed, not yet wired to backend events)
- Add pagination to equipment catalogue and marketplace listings (`page` / `size` params exist in API layer)
- Add image upload for equipment listings and marketplace (photo URLs are arrays in types but `photoUrls: []` in all mock data)
- Persist chat history (AsyncStorage or backend WebSocket)
- Add payment gateway integration (MoMo / card) — `paymentStatus` field exists in `Booking` type
- Implement Admin role UI
- Add unit and integration tests
- Implement deep linking for QR code shares

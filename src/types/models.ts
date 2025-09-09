// Centralized TypeScript models for Firebase entities
// Note: Keep in sync with Firestore security rules

export type UserRole = "user" | "mechanic" | "admin";

export interface GeoPointLite {
  lat: number;
  lng: number;
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName?: string;
  phone?: string;
  photoURL?: string;
  ratingAvg?: number;
  ratingCount?: number;
  servicesOffered?: string[]; // for mechanics
  vehicleTypes?: string[]; // e.g., ["Bicycle","Bike","Auto","Car"]
  location?: GeoPointLite; // simple lat/lng; consider geohash later
  createdAt: number; // ms epoch
  updatedAt: number; // ms epoch
}

export interface ServiceCatalogItem {
  id: string;
  title: string; // e.g., "Oil Change"
  vehicleType: string; // Bicycle | Bike | Auto | Car
  basePrice: number; // in smallest currency unit if integrating payments later
  durationMinutes?: number;
  description?: string;
  isEmergency?: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  userId: string;
  mechanicId: string;
  serviceId: string; // references ServiceCatalogItem
  vehicleType: string;
  status: BookingStatus;
  scheduledAt?: number;
  location?: GeoPointLite;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  mechanicId: string;
  rating: number; // 1..5
  comment?: string;
  createdAt: number;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number; // smallest unit (e.g., paise)
  stock: number;
  images?: string[];
  category?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type OrderStatus = "created" | "paid" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number; // snapshot price per unit
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number; // computed sum of items
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export type ChatRoomType = "support" | "booking";

export interface ChatRoom {
  id: string;
  participantIds: string[]; // 2+ users
  type: ChatRoomType;
  bookingId?: string;
  lastMessageAt?: number;
  createdAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  text?: string;
  attachments?: string[]; // storage URLs
  createdAt: number;
}

export type SosStatus = "open" | "assigned" | "resolved" | "cancelled";

export interface SosRequest {
  id: string;
  userId: string;
  vehicleType: string;
  location: GeoPointLite;
  notes?: string;
  status: SosStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | "booking_status"
    | "new_message"
    | "review_received"
    | "order_status"
    | "sos_update";
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: number;
}

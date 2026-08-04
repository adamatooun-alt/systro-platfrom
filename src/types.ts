export type ServiceType = 'fuel' | 'locksmith' | 'mechanic' | 'towing' | 'battery' | 'taxi';

export interface ServiceDetails {
  id: ServiceType;
  name: string;
  arName: string;
  heName?: string;
  description: string;
  arDescription: string;
  heDescription?: string;
  icon: string;
  basePrice: number;
  currency: string;
  estimatedTime: string;
  arEstimatedTime: string;
}

export type RequestStatus = 
  | 'idle'
  | 'pending_bids'
  | 'awaiting_deposit'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'released'
  | 'refunded'
  | 'bid_accepted'
  | 'accepted'
  | 'cancelled'
  | 'finished';

export interface RescueRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  requestedBy?: string;
  sessionId?: string;
  locationLat: number; // 0 to 100 for canvas coordinate mapping
  locationLng: number;
  locationName: string;
  arLocationName: string;
  serviceType: ServiceType;
  description: string;
  status: RequestStatus;
  escrowAmount: number;
  approximatePrice?: number;
  selectedTechnicianId: string | null;
  timestamp: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  isEmergency?: boolean;
  payerType?: 'client' | 'technician';
  paymentMethod?: 'gpay' | 'card' | 'whatsapp' | 'commission';
  commissionAmount?: number;
}

export interface Technician {
  id: string;
  name: string;
  arName: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  isOnline: boolean;
  lat: number; // 0 to 100 for canvas mapping
  lng: number;
  avatar: string;
  carModel: string;
  arCarModel: string;
  plateNumber: string;
  serviceId?: string;
  specialties?: string[];
  email?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  paymentPlan?: 'per_task' | 'monthly_subscription';
  commissionRate?: number; // e.g., 5 or 10 (%)
  subscriptionStatus?: 'active' | 'inactive' | 'pending';
  subscriptionExpiry?: string;
}

export interface Bid {
  id: string;
  requestId: string;
  technicianId: string;
  technicianName: string;
  technicianArName: string;
  price: number;
  etaMinutes: number;
  rating: number;
  avatar: string;
  carModel?: string;
  plateNumber?: string;
}

export interface ChatMsg {
  id: string;
  sender: 'client' | 'technician' | 'system';
  senderName?: string;
  text: string;
  timestamp: string;
  createdTime?: number;
}

export interface SystemStats {
  activeTechnicians: number;
  maxTechnicians: number;
  completedRescues: number;
  satisfactionRate: number;
  activeEmergencies: number;
}

export interface InAppNotification {
  id: string;
  titleAr: string;
  titleEn: string;
  titleHe?: string;
  bodyAr: string;
  bodyEn: string;
  bodyHe?: string;
  timestamp: string;
  isRead: boolean;
  type: 'new_request' | 'bid_submitted' | 'bid_accepted' | 'en_route' | 'arrived' | 'completed' | 'chat' | 'system';
  targetId: string;
}

export interface Product {
  id: string;
  title: string;
  arTitle?: string;
  price: number;
  image: string;
  description?: string;
  arDescription?: string;
  category?: string;
  arCategory?: string;
  inStock?: boolean;
  createdAt?: number;
}

export interface StoreOrderItem {
  id: string;
  title: string;
  arTitle?: string;
  price: number;
  quantity: number;
  image: string;
}

export interface PublicGroupMessage {
  id: string;
  senderName: string;
  senderEmail?: string;
  senderRole: 'client' | 'technician' | 'admin';
  senderAvatar?: string;
  text: string;
  timestamp: string;
  createdTime?: number;
}

export type StoreOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface StoreOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: 'cash' | 'card' | 'escrow';
  notes?: string;
  items: StoreOrderItem[];
  totalAmount: number;
  status: StoreOrderStatus;
  createdAt: number;
  createdAtFormatted?: string;
  userEmail?: string;
}


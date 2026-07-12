export type ServiceType = 'fuel' | 'locksmith' | 'mechanic' | 'towing' | 'battery';

export interface ServiceDetails {
  id: ServiceType;
  name: string;
  arName: string;
  description: string;
  arDescription: string;
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
  | 'refunded';

export interface RescueRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  locationLat: number; // 0 to 100 for canvas coordinate mapping
  locationLng: number;
  locationName: string;
  arLocationName: string;
  serviceType: ServiceType;
  description: string;
  status: RequestStatus;
  escrowAmount: number;
  selectedTechnicianId: string | null;
  timestamp: string;
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
}

export interface ChatMsg {
  id: string;
  sender: 'client' | 'technician' | 'system';
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

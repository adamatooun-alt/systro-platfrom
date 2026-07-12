import React, { useState, useEffect, useRef } from 'react';
import { translations } from './translations';
import { db, auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Clock, 
  Coins, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Star, 
  MessageSquare, 
  Send, 
  MapPin, 
  UserCheck, 
  ThumbsUp, 
  Lightbulb, 
  Globe, 
  Fuel, 
  Key, 
  Wrench, 
  Truck, 
  Zap, 
  Check, 
  Activity,
  AlertCircle,
  Home,
  LogOut,
  ExternalLink,
  X
} from 'lucide-react';
import { ServiceType, RequestStatus, RescueRequest, Technician, Bid, ChatMsg, SystemStats } from './types';
import TrustPortal from './components/TrustPortal';
import SmtpConfigPanel from './components/SmtpConfigPanel';
import LoginPortal from './components/LoginPortal';
import HomeTab from './components/HomeTab';
import ServicesTab from './components/ServicesTab';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  // Global Language State: 'ar' (Arabic is default as shown in screenshots) or 'en' or 'he'
  const [lang, setLang] = useState<'ar' | 'en' | 'he'>(() => {
    const saved = localStorage.getItem('systro_rescue_lang');
    return (saved === 'ar' || saved === 'en' || saved === 'he') ? saved : 'ar';
  });

  const t = translations[lang];

  // Set page direction based on language
  useEffect(() => {
    localStorage.setItem('systro_rescue_lang', lang);
    document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Navigation Tab State: 'home' | 'services' | 'simulator' | 'admin'
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'simulator' | 'admin'>('home');

  // Admin password/code verification state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => sessionStorage.getItem('systro_admin_unlocked') === 'true');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Client Portal Sign-In Simulation State
  const [userRole, setUserRole] = useState<'client' | 'technician' | null>(() => {
    const role = localStorage.getItem('systro_user_role');
    return (role === 'client' || role === 'technician') ? role : null;
  });
  const [portalTab, setPortalTab] = useState<'client' | 'tech'>('client');
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return localStorage.getItem('systro_phone_number') || '';
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('systro_is_logged_in') === 'true';
  });
  const [isTrustPortalOpen, setIsTrustPortalOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState(() => {
    return localStorage.getItem('systro_custom_domain') || 'systro.live';
  });

  // SMTP Live Configurations & Testing
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    host: string;
    port: string;
    user: string;
    from: string;
    hasPass: boolean;
  } | null>(null);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const fetchSmtpStatus = async () => {
    try {
      const response = await fetch('/api/smtp-status');
      if (response.ok) {
        const data = await response.json();
        setSmtpStatus(data);
      }
    } catch (err) {
      console.error("Error fetching SMTP status:", err);
    }
  };

  // Fetch SMTP status on tab selection
  useEffect(() => {
    if (activeTab === 'admin') {
      fetchSmtpStatus();
    }
  }, [activeTab]);

  // Brand New Gmail Sign-In & Role State
  const [enteredEmail, setEnteredEmail] = useState('');
  const [enteredName, setEnteredName] = useState('');
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('google');
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [otpSentToEmail, setOtpSentToEmail] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [simulatedOtpCode, setSimulatedOtpCode] = useState('');
  const [showGoogleFallbackModal, setShowGoogleFallbackModal] = useState(false);

  const [loggedInUserEmail, setLoggedInUserEmail] = useState(() => {
    return localStorage.getItem('systro_user_email') || '';
  });
  const [loggedInUserName, setLoggedInUserName] = useState(() => {
    return localStorage.getItem('systro_user_name') || '';
  });

  // Dynamic Collections state synced in real-time from Firestore
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbTechnicians, setDbTechnicians] = useState<Technician[]>([]);

  // Modals / Form inputs for Service Provider Registries
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [selectedServiceIdForRecord, setSelectedServiceIdForRecord] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerCarModel, setProviderCarModel] = useState('');
  const [providerPlateNumber, setProviderPlateNumber] = useState('');

  // Form inputs for Custom Service Creation
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [customServiceNameAr, setCustomServiceNameAr] = useState('');
  const [customServiceNameEn, setCustomServiceNameEn] = useState('');
  const [customServiceDescAr, setCustomServiceDescAr] = useState('');
  const [customServiceDescEn, setCustomServiceDescEn] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState(150);

  // Dynamic Live System Statistics
  const [stats, setStats] = useState<SystemStats>({
    activeTechnicians: 4,
    maxTechnicians: 5,
    completedRescues: 1,
    satisfactionRate: 99.8,
    activeEmergencies: 1
  });

  // Services mapping utilities
  const getServiceIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'fuel': return Fuel;
      case 'key': return Key;
      case 'wrench': return Wrench;
      case 'truck': return Truck;
      case 'zap': return Zap;
      default: return Wrench;
    }
  };

  const getServiceColor = (id: string) => {
    switch (id) {
      case 'fuel': return 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15';
      case 'locksmith': return 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15';
      case 'mechanic': return 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/15';
      case 'towing': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15';
      case 'battery': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15';
    }
  };

  // Derived Services configuration list loaded in real-time from Firestore database
  const servicesList = dbServices.length > 0 
    ? dbServices.map(s => ({
        id: s.id as ServiceType,
        name: lang === 'ar' ? (s.arName || s.name) : s.name,
        desc: lang === 'ar' ? (s.arDescription || s.description) : s.description,
        icon: getServiceIcon(s.icon),
        color: getServiceColor(s.id),
        basePrice: s.basePrice || 120,
      }))
    : [
        {
          id: 'fuel' as ServiceType,
          name: t.fuelName,
          desc: t.fuelDesc,
          icon: Fuel,
          color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15',
          basePrice: 100,
        },
        {
          id: 'locksmith' as ServiceType,
          name: t.locksmithName,
          desc: t.locksmithDesc,
          icon: Key,
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15',
          basePrice: 150,
        },
        {
          id: 'mechanic' as ServiceType,
          name: t.mechanicName,
          desc: t.mechanicDesc,
          icon: Wrench,
          color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/15',
          basePrice: 200,
        },
        {
          id: 'towing' as ServiceType,
          name: t.towingName,
          desc: t.towingDesc,
          icon: Truck,
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15',
          basePrice: 150,
        },
        {
          id: 'battery' as ServiceType,
          name: t.batteryName,
          desc: t.batteryDesc,
          icon: Zap,
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15',
          basePrice: 120,
        }
      ];

  // Map & Simulator State
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType>('towing');
  const [problemDescription, setProblemDescription] = useState('');
  const [simStatus, setSimStatus] = useState<RequestStatus>('idle');
  const [liveRequest, setLiveRequest] = useState<RescueRequest | null>(null);

  // New List-driven State
  const [allRequests, setAllRequests] = useState<RescueRequest[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // New Technician Bid state inputs
  const [techBidPrice, setTechBidPrice] = useState<number>(150);
  const [techBidEta, setTechBidEta] = useState<number>(15);
  const [techBidProfileId, setTechBidProfileId] = useState<string>('t1');
  
  // Available technicians list loaded dynamically from Firestore
  const technicians: Technician[] = dbTechnicians.length > 0 
    ? dbTechnicians 
    : [
        { id: 't1', name: 'رائد مسعود', arName: 'رائد مسعود', phone: '+972 59-123-4567', rating: 4.9, reviewsCount: 142, isOnline: true, lat: 25, lng: 30, avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120', carModel: 'Toyota Hilux 4x4', arCarModel: 'تويوتا هايلوكس 4x4', plateNumber: '7-4321-99' },
        { id: 't2', name: 'محمد الحسين', arName: 'محمد الحسين', phone: '+972 59-765-4321', rating: 4.8, reviewsCount: 98, isOnline: true, lat: 75, lng: 20, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120', carModel: 'GMC Sierra Recovery', arCarModel: 'جي إم سي سييرا ونش', plateNumber: '8-1122-88' },
        { id: 't3', name: 'شادي يوسف', arName: 'شادي يوسف', phone: '+972 59-888-2233', rating: 4.7, reviewsCount: 65, isOnline: true, lat: 50, lng: 80, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', carModel: 'Ford F-150 Service', arCarModel: 'فورد F-150 صيانة', plateNumber: '6-9988-77' }
      ];

  // Bids State
  const [incomingBids, setIncomingBids] = useState<Bid[]>([]);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  // Simulated Chat messages state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);

  // Dispute Simulation State
  const [disputeReason, setDisputeReason] = useState('');
  const [disputesList, setDisputesList] = useState<{ id: string; clientName: string; techName: string; serviceType: string; amount: number; reason: string; status: 'pending' | 'resolved' | 'refunded' }[]>([]);

  // Escrows List (Admin simulation)
  const [escrows, setEscrows] = useState<{ id: string; clientName: string; techName: string; amount: number; serviceType: string; status: 'escrowed' | 'released' | 'refunded' | 'disputed' }[]>([]);

  // Current simulation rating state
  const [simRating, setSimRating] = useState<number>(5);

  // Active technician coordinate (for dynamic movement)
  const [techCoordinates, setTechCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);
  const triggerToast = (text: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Custom Specialty / Technician form states
  const [customSpecialtyName, setCustomSpecialtyName] = useState('');
  const [customSpecialtyDesc, setCustomSpecialtyDesc] = useState('');
  const [customSpecialtyPrice, setCustomSpecialtyPrice] = useState(150);
  const [providerVehicle, setProviderVehicle] = useState('');
  const [providerPlate, setProviderPlate] = useState('');
  const [activeTechDoc, setActiveTechDoc] = useState<any>(null);
  const [selectedBidRequest, setSelectedBidRequest] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState<number>(150);
  const [customBidEta, setCustomBidEta] = useState<number>(15);

  // Provider position states for dynamic vehicle placement
  const [providerLat, setProviderLat] = useState<number | null>(null);
  const [providerLng, setProviderLng] = useState<number | null>(null);

  // ==========================================
  // REAL-TIME FIREBASE FIRESTORE SYNC LISTENERS
  // ==========================================

  // Real-time listener for the active technician's profile document
  useEffect(() => {
    if (!isLoggedIn || !loggedInUserEmail || userRole !== 'technician') {
      setActiveTechDoc(null);
      return;
    }
    const docRef = doc(db, "technicians", loggedInUserEmail);
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setActiveTechDoc(data);
        if (data.carModel && !providerVehicle) setProviderVehicle(data.carModel);
        if (data.plateNumber && !providerPlate) setProviderPlate(data.plateNumber);
      } else {
        setActiveTechDoc(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `technicians/${loggedInUserEmail}`);
    });
    return () => unsub();
  }, [isLoggedIn, loggedInUserEmail, userRole]);

  // Sync technician's location from providerLat/providerLng into Firestore
  useEffect(() => {
    if (!isLoggedIn || !loggedInUserEmail || userRole !== 'technician' || providerLat === null || providerLng === null) {
      return;
    }
    // Update the technician document's position in Firestore
    const docRef = doc(db, "technicians", loggedInUserEmail);
    getDoc(docRef).then((snapshot) => {
      if (snapshot.exists()) {
        updateDoc(docRef, {
          lat: providerLat,
          lng: providerLng,
          isOnline: true
        });
      }
    });
  }, [providerLat, providerLng, isLoggedIn, loggedInUserEmail, userRole]);

  // Synchronize services from Firestore (real-time)
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed initial default services if collection is empty
        const initialServices = [
          { id: 'fuel', name: 'توصيل وتعبئة الوقود (Fuel Delivery)', arName: 'توصيل وتعبئة الوقود (Fuel Delivery)', description: 'نفذ منك البنزين أو الديزل على الطريق؟ سنرسل إليك أقرب فني مع كمية الوقود الكافية لإنقاذ رحلتك.', arDescription: 'نفذ منك البنزين أو الديزل على الطريق؟ سنرسل إليك أقرب فني مع كمية الوقود الكافية لإنقاذ رحلتك.', icon: 'fuel', basePrice: 100 },
          { id: 'locksmith', name: 'فتح الأقفال الطارئ (Emergency Locksmith)', arName: 'فتح الأقفال الطارئ (Emergency Locksmith)', description: 'إذا أغلقت سيارتك والمفتاح بالداخل، يتوفر لدينا فنيين معتمدين لفتح الأقفال بدون أي أضرار للمركبة.', arDescription: 'إذا أغلقت سيارتك والمفتاح بالداخل، يتوفر لدينا فنيين معتمدين لفتح الأقفال بدون أي أضرار للمركبة.', icon: 'key', basePrice: 150 },
          { id: 'mechanic', name: 'ميكانيك وكهرباء الطوارئ (Mechanics)', arName: 'ميكانيك وكهرباء الطوارئ (Mechanics)', description: 'تشخيص الأعطال البسيطة وإصلاحها في موقعك (مثل السلف، الفيوزات، السيور) لتعود إلى الطريق بسرعة.', arDescription: 'تشخيص الأعطال البسيطة وإصلاحها في موقعك (مثل السلف، الفيوزات، السيور) لتعود إلى الطريق بسرعة.', icon: 'wrench', basePrice: 200 },
          { id: 'towing', name: 'سحب ونقل المركبات (Car Towing)', arName: 'سحب ونقل المركبات (Car Towing)', description: 'رافعات متخصصة لنقل سيارتك بأمان تام إلى أقرب مركز صيانة أو إلى منزلك، متوفرة على مدار الساعة.', arDescription: 'رافعات متخصصة لنقل سيارتك بأمان تام إلى أقرب مركز صيانة أو إلى منزلك، متوفرة على مدار الساعة.', icon: 'truck', basePrice: 150 },
          { id: 'battery', name: 'شحن واستبدال البطارية (Battery Services)', arName: 'شحن واستبدال البطارية (Battery Services)', description: 'تعطلت بطارية سيارتك فجأة؟ نوفر خدمة شحن البطارية السريع أو استبدالها ببطارية جديدة مكفولة في موقعك.', arDescription: 'تعطلت بطارية سيارتك فجأة؟ نوفر خدمة شحن البطارية السريع أو استبدالها ببطارية جديدة مكفولة في موقعك.', icon: 'zap', basePrice: 120 }
        ];
        initialServices.forEach(async (s) => {
          await setDoc(doc(db, "services", s.id), s);
        });
      } else {
        const list: any[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data());
        });
        setDbServices(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "services");
    });
    return () => unsub();
  }, []);

  // Synchronize technicians from Firestore (real-time)
  useEffect(() => {
    const q = query(collection(db, "technicians"));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed initial default technicians if collection is empty
        const initialTechs = [
          { id: 't1', name: 'Raed Masoud', arName: 'رائد مسعود', phone: '+972 59-123-4567', rating: 4.9, reviewsCount: 142, isOnline: true, lat: 25, lng: 30, avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120', carModel: 'Toyota Hilux 4x4', arCarModel: 'تويوتا هايلوكس 4x4', plateNumber: '7-4321-99', serviceId: 'towing' },
          { id: 't2', name: 'Mohamed Al-Hussein', arName: 'محمد الحسين', phone: '+972 59-765-4321', rating: 4.8, reviewsCount: 98, isOnline: true, lat: 75, lng: 20, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120', carModel: 'GMC Sierra Recovery', arCarModel: 'جي إم سي سييرا ونش', plateNumber: '8-1122-88', serviceId: 'towing' },
          { id: 't3', name: 'Shady Yousef', arName: 'شادي يوسف', phone: '+972 59-888-2233', rating: 4.7, reviewsCount: 65, isOnline: true, lat: 50, lng: 80, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', carModel: 'Ford F-150 Service', arCarModel: 'فورد F-150 صيانة', plateNumber: '6-9988-77', serviceId: 'mechanic' }
        ];
        initialTechs.forEach(async (t) => {
          await setDoc(doc(db, "technicians", t.id), t);
        });
      } else {
        const list: Technician[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Technician);
        });
        setDbTechnicians(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "technicians");
    });
    return () => unsub();
  }, []);

  // Listen for all requests
  useEffect(() => {
    const q = query(collection(db, "requests"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: RescueRequest[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RescueRequest);
      });
      // Sort by newest first
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setAllRequests(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "requests");
    });
    return () => unsub();
  }, []);

  // Sync active request details to component states
  useEffect(() => {
    if (!activeRequestId) {
      setLiveRequest(null);
      setSimStatus('idle');
      setPinnedLocation(null);
      setSelectedBid(null);
      setIncomingBids([]);
      setTechCoordinates(null);
      setProblemDescription('');
      setChatMessages([]);
      return;
    }

    const currentReq = allRequests.find(r => r.id === activeRequestId);
    if (currentReq) {
      setLiveRequest(currentReq);
      setSimStatus(currentReq.status);
      setProblemDescription(currentReq.description || '');
      setPinnedLocation({ lat: currentReq.locationLat, lng: currentReq.locationLng });
      
      const originalTech = technicians.find(t => t.id === currentReq.selectedTechnicianId);
      if (originalTech) {
        if (currentReq.status === 'en_route') {
          if (!techCoordinates) {
            setTechCoordinates({ lat: originalTech.lat, lng: originalTech.lng });
          }
        } else if (currentReq.status === 'arrived' || currentReq.status === 'in_progress' || currentReq.status === 'completed' || currentReq.status === 'disputed') {
          setTechCoordinates({ lat: currentReq.locationLat, lng: currentReq.locationLng });
        }
      }
    } else {
      setActiveRequestId(null);
    }
  }, [activeRequestId, allRequests]);

  // Listen for bids for the active request
  useEffect(() => {
    if (!activeRequestId) {
      setIncomingBids([]);
      setSelectedBid(null);
      return;
    }
    const q = query(collection(db, "bids"), where("requestId", "==", activeRequestId));
    const unsub = onSnapshot(q, (snapshot) => {
      const bids: Bid[] = [];
      snapshot.forEach(docSnap => {
        bids.push(docSnap.data() as Bid);
      });
      setIncomingBids(bids);

      const currentReq = allRequests.find(r => r.id === activeRequestId);
      if (currentReq?.selectedTechnicianId) {
        const found = bids.find(b => b.technicianId === currentReq.selectedTechnicianId);
        if (found) {
          setSelectedBid(found);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `bids?requestId=${activeRequestId}`);
    });
    return () => unsub();
  }, [activeRequestId, allRequests]);

  // Listen for chats for the active request
  useEffect(() => {
    if (!activeRequestId) {
      setChatMessages([]);
      return;
    }
    const q = query(collection(db, "chats"), where("requestId", "==", activeRequestId));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMsg[] = [];
      snapshot.forEach(docSnap => {
        msgs.push(docSnap.data() as ChatMsg);
      });
      msgs.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
      setChatMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats?requestId=${activeRequestId}`);
    });
    return () => unsub();
  }, [activeRequestId]);

  // Listen for disputes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "disputes"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDisputesList(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "disputes");
    });
    return () => unsub();
  }, []);

  // Listen for escrows
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "escrows"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setEscrows(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "escrows");
    });
    return () => unsub();
  }, []);

  // Listen for system stats
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system_stats", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.data() as SystemStats);
      } else {
        const initialStats = {
          activeTechnicians: 4,
          maxTechnicians: 5,
          completedRescues: 1,
          satisfactionRate: 99.8,
          activeEmergencies: 0
        };
        setDoc(doc(db, "system_stats", "global"), initialStats);
        setStats(initialStats);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "system_stats/global");
    });
    return () => unsub();
  }, []);

  // Listen for custom domain settings in database
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "domain"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.customDomain) {
          setCustomDomain(data.customDomain);
          localStorage.setItem('systro_custom_domain', data.customDomain);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/domain");
    });
    return () => unsub();
  }, []);

  // Map Drawing & Update Loops
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas road map and GPS markers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Bright, Cheerful Grid Theme Map
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road grid lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    // Horizontal roads
    ctx.beginPath();
    ctx.moveTo(0, 100); ctx.lineTo(400, 100);
    ctx.moveTo(0, 250); ctx.lineTo(400, 250);
    ctx.moveTo(0, 320); ctx.lineTo(400, 320);
    // Vertical roads
    ctx.moveTo(80, 0); ctx.lineTo(80, 400);
    ctx.moveTo(220, 0); ctx.lineTo(220, 400);
    ctx.moveTo(340, 0); ctx.lineTo(340, 400);
    ctx.stroke();

    // Draw some stylized "city blocks"
    ctx.fillStyle = '#EDF2F7';
    // Block 1
    ctx.fillRect(15, 15, 50, 70);
    // Block 2
    ctx.fillRect(95, 15, 110, 70);
    // Block 3
    ctx.fillRect(235, 15, 90, 70);
    // Block 4
    ctx.fillRect(15, 115, 50, 120);
    // Block 5
    ctx.fillRect(95, 115, 110, 120);
    // Block 6
    ctx.fillRect(235, 115, 90, 120);
    // Block 7
    ctx.fillRect(355, 15, 30, 220);

    ctx.fillStyle = '#475569';
    ctx.font = '10px Cairo, sans-serif';
    ctx.fillText(lang === 'ar' ? 'شارع القدس' : 'Al-Quds St', 100, 95);
    ctx.fillText(lang === 'ar' ? 'طريق الساحل' : 'Coastal Rd', 230, 245);

    // Draw other technicians markers (faint pulses if online)
    technicians.forEach(tech => {
      // Don't draw the currently active moving tech again if we have en_route coordinates
      if (simStatus !== 'idle' && selectedBid?.technicianId === tech.id) return;

      // Draw online tech dot
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(tech.lng * 4, tech.lat * 4, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Label tech name
      ctx.fillStyle = '#475569';
      ctx.font = '9px Cairo, sans-serif';
      ctx.fillText(lang === 'ar' ? tech.arName : tech.name, (tech.lng * 4) - 20, (tech.lat * 4) - 10);
    });

    // Draw Client location Pin (if pinned)
    if (pinnedLocation) {
      // Pin Glow outer ring
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pinnedLocation.lng * 4, pinnedLocation.lat * 4, 15, 0, 2 * Math.PI);
      ctx.stroke();

      // Pin center dot
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(pinnedLocation.lng * 4, pinnedLocation.lat * 4, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.fillText(lang === 'ar' ? 'موقعي 📌' : 'My Location 📌', (pinnedLocation.lng * 4) - 24, (pinnedLocation.lat * 4) - 12);
    }

    // Draw Technician temporary pinned position (if in technician mode)
    if (userRole === 'technician' && providerLat !== null && providerLng !== null) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(providerLng * 4, providerLat * 4, 15, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(providerLng * 4, providerLat * 4, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.fillText(lang === 'ar' ? 'موقع مركبتي 🛠️' : 'My Vehicle Location 🛠️', (providerLng * 4) - 36, (providerLat * 4) - 12);
    }

    // Draw Moving Active Technician (if en route)
    if (techCoordinates && selectedBid) {
      // Path line to client
      if (pinnedLocation) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(techCoordinates.lng * 4, techCoordinates.lat * 4);
        ctx.lineTo(pinnedLocation.lng * 4, pinnedLocation.lat * 4);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // Draw moving tech vehicle (golden-amber dot)
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(techCoordinates.lng * 4, techCoordinates.lat * 4, 9, 0, 2 * Math.PI);
      ctx.fill();

      // Inner white dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(techCoordinates.lng * 4, techCoordinates.lat * 4, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Label tech en route
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 10px Cairo, sans-serif';
      ctx.fillText(lang === 'ar' ? `ونش ${selectedBid.technicianArName} 🚚` : `${selectedBid.technicianName} 🚚`, (techCoordinates.lng * 4) - 30, (techCoordinates.lat * 4) - 14);
    }

  }, [pinnedLocation, techCoordinates, simStatus, selectedBid, lang, userRole, providerLat, providerLng]);

  // Handle map click location pinning
  const handleMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixels to percentage coordinates (0-100)
    const lng = Math.round((x / canvas.width) * 100);
    const lat = Math.round((y / canvas.height) * 100);

    if (userRole === 'technician') {
      setProviderLat(lat);
      setProviderLng(lng);
      triggerToast(
        lang === 'ar' 
          ? `تم تحديد موقع مركبتك بنجاح عند الإحداثيات: Lat: ${lat}, Lng: ${lng}` 
          : `Service vehicle location pinned at: Lat: ${lat}, Lng: ${lng}`, 
        'success'
      );
    } else {
      if (simStatus !== 'idle') {
        triggerToast(lang === 'ar' ? 'لا يمكن تعديل الموقع أثناء طلب نشط!' : 'Cannot change location during an active request!', 'warning');
        return;
      }
      setPinnedLocation({ lat, lng });
      triggerToast(lang === 'ar' ? 'تم تحديد موقع سيارتك بنجاح!' : 'Breakdown location pinned successfully!', 'success');
    }
  };

  // Client: Submit Rescue Request to Firestore List
  const triggerBidsSimulation = async () => {
    if (!pinnedLocation) {
      triggerToast(lang === 'ar' ? 'الرجاء النقر على الخريطة أولاً لتحديد موقعك!' : 'Please click on the map to pin your location first!', 'warning');
      return;
    }

    try {
      const reqId = `req-${Date.now()}`;
      // Initialize/Update the request document in the live collection
      await setDoc(doc(db, "requests", reqId), {
        id: reqId,
        clientName: userRole === 'guest' ? (lang === 'ar' ? 'عميل معتمد (حساب ضيف)' : 'Verified Client (Guest)') : 'Adam Atooun',
        clientPhone: phoneNumber || "+972 59-123-4567",
        locationLat: pinnedLocation.lat,
        locationLng: pinnedLocation.lng,
        locationName: "Al-Quds St",
        arLocationName: "شارع القدس",
        serviceType: selectedService,
        description: problemDescription,
        status: "pending_bids",
        escrowAmount: 0,
        selectedTechnicianId: null,
        timestamp: new Date().toISOString()
      });

      // Update global stats
      await updateDoc(doc(db, "system_stats", "global"), {
        activeEmergencies: stats.activeEmergencies + 1
      });

      setActiveRequestId(reqId);
      triggerToast(lang === 'ar' ? 'تم تسجيل وتعميم طلبك بنجاح على الفنيين بالقائمة!' : 'Request published successfully to all technicians!', 'success');
    } catch (error) {
      console.error("Error creating request:", error);
      triggerToast(lang === 'ar' ? 'فشل إرسال الطلب لقاعدة البيانات!' : 'Failed to publish request!', 'error');
    }
  };

  // Quick Demo: Generate mock bids on demand for easy solo testing
  const handleGenerateDemoBids = async () => {
    if (!activeRequestId) return;
    try {
      const b1Id = `bid-t1-${Date.now()}`;
      const b2Id = `bid-t2-${Date.now()}`;
      const b3Id = `bid-t3-${Date.now()}`;

      await setDoc(doc(db, "bids", b1Id), {
        id: b1Id,
        requestId: activeRequestId,
        technicianId: 't1',
        technicianName: 'Raed Masoud',
        technicianArName: 'رائد مسعود',
        price: 150,
        etaMinutes: 11,
        rating: 4.9,
        avatar: technicians[0].avatar
      });

      await setDoc(doc(db, "bids", b2Id), {
        id: b2Id,
        requestId: activeRequestId,
        technicianId: 't2',
        technicianName: 'Mohamed Al-Hussein',
        technicianArName: 'محمد الحسين',
        price: 180,
        etaMinutes: 15,
        rating: 4.8,
        avatar: technicians[1].avatar
      });

      await setDoc(doc(db, "bids", b3Id), {
        id: b3Id,
        requestId: activeRequestId,
        technicianId: 't3',
        technicianName: 'Shady Yousef',
        technicianArName: 'شادي يوسف',
        price: 140,
        etaMinutes: 19,
        rating: 4.7,
        avatar: technicians[2].avatar
      });

      triggerToast(lang === 'ar' ? 'تم استقبال عروض الأسعار من الفنيين المعتمدين بنجاح!' : 'Quotes from certified technicians received successfully!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Technician: Place custom real pricing bid from live list
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequestId) {
      triggerToast(lang === 'ar' ? 'الرجاء اختيار طلب أولاً!' : 'Please select a request first!', 'warning');
      return;
    }

    const techProfile = technicians.find(t => t.id === techBidProfileId);
    if (!techProfile) return;

    try {
      const bidId = `bid-${techBidProfileId}-${Date.now()}`;
      const newBid: Bid = {
        id: bidId,
        requestId: activeRequestId,
        technicianId: techBidProfileId,
        technicianName: techProfile.name,
        technicianArName: techProfile.arName,
        price: Number(techBidPrice),
        etaMinutes: Number(techBidEta),
        rating: techProfile.rating,
        avatar: techProfile.avatar
      };

      await setDoc(doc(db, "bids", bidId), newBid);
      triggerToast(
        lang === 'ar' 
          ? `تم إرسال عرض بقيمة ${techBidPrice} ₪ بنجاح من الفني ${techProfile.arName}!` 
          : `Bid of ${techBidPrice} ₪ submitted by ${techProfile.name}!`, 
        'success'
      );
    } catch (err) {
      console.error("Error submitting technician bid:", err);
      triggerToast(lang === 'ar' ? 'فشل تقديم العرض!' : 'Failed to submit bid!', 'error');
    }
  };

  // Client: Approve Bid & Prepare Escrow
  const handleAcceptBid = async (bid: Bid) => {
    if (!activeRequestId) return;
    try {
      await updateDoc(doc(db, "requests", activeRequestId), {
        status: "awaiting_deposit",
        selectedTechnicianId: bid.technicianId,
        escrowAmount: bid.price
      });

      setSelectedBid(bid);
      
      const originalTech = technicians.find(t => t.id === bid.technicianId);
      if (originalTech) {
        setTechCoordinates({ lat: originalTech.lat, lng: originalTech.lng });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Client: Deposit into Escrow Safe Vault & Start Transit
  const handleEscrowDeposit = async () => {
    if (!selectedBid || !activeRequestId || !liveRequest) return;

    try {
      await updateDoc(doc(db, "requests", activeRequestId), {
        status: "en_route"
      });

      triggerToast(t.simDepositSuccessToast, 'success');

      // Create Escrow in firestore
      const escrowId = `esc-${Date.now()}`;
      const newEscrow = {
        id: escrowId,
        requestId: activeRequestId,
        clientName: liveRequest.clientName,
        techName: lang === 'ar' ? selectedBid.technicianArName : selectedBid.technicianName,
        amount: selectedBid.price,
        serviceType: liveRequest.serviceType,
        status: 'escrowed'
      };
      await setDoc(doc(db, "escrows", escrowId), newEscrow);

      // Add messages in Chat
      const m1Id = `c1-${Date.now()}`;
      await setDoc(doc(db, "chats", m1Id), {
        id: m1Id,
        requestId: activeRequestId,
        sender: 'system',
        text: lang === 'ar' ? `🔒 تم تأمين وحجز مبلغ ${selectedBid.price} ₪ في محفظة الأمان المالي. لن يتم تحرير الدفعة إلا بعد اكتمال الخدمة.` : `🔒 ${selectedBid.price} ₪ successfully secured in the Escrow Safe Vault. Funds remain locked until service validation.`,
        timestamp: '11:55',
        createdTime: Date.now()
      });

      const m2Id = `c2-${Date.now()}`;
      await setDoc(doc(db, "chats", m2Id), {
        id: m2Id,
        requestId: activeRequestId,
        sender: 'technician',
        text: lang === 'ar' ? `مرحباً بك يا غالي، لقد استلمت إشعار إيداع الضمان بنجاح وأنا متحرك إليك الآن بسيارة الإنقاذ. هل يمكنك تأكيد نوع سيارتك؟` : `Hello there, I have received the secure Escrow deposit notification. I am driving towards you now. Could you please confirm your car model?`,
        timestamp: '11:56',
        createdTime: Date.now() + 100
      });

      // Animate technician dot moving toward client
      let steps = 0;
      const originalTech = technicians.find(t => t.id === selectedBid.technicianId);
      if (!originalTech || !pinnedLocation) return;

      const startLat = originalTech.lat;
      const startLng = originalTech.lng;
      const endLat = pinnedLocation.lat;
      const endLng = pinnedLocation.lng;

      const interval = setInterval(async () => {
        steps++;
        const ratio = steps / 10;
        const currentLat = startLat + (endLat - startLat) * ratio;
        const currentLng = startLng + (endLng - startLng) * ratio;

        setTechCoordinates({ lat: currentLat, lng: currentLng });

        if (steps === 3) {
          const m3Id = `chat-3-${Date.now()}`;
          await setDoc(doc(db, "chats", m3Id), {
            id: m3Id,
            requestId: activeRequestId,
            sender: 'system',
            text: lang === 'ar' ? '🚚 تتبع مباشر: الفني عبر منتصف الطريق ويبعد 3 كم.' : '🚚 GPS Tracking: Technician is halfway and is 3 km away.',
            timestamp: '11:57',
            createdTime: Date.now()
          });
        }

        if (steps === 7) {
          await updateDoc(doc(db, "requests", activeRequestId), {
            status: "arrived"
          });
          const m7Id = `chat-7-${Date.now()}`;
          await setDoc(doc(db, "chats", m7Id), {
            id: m7Id,
            requestId: activeRequestId,
            sender: 'technician',
            text: lang === 'ar' ? 'لقد وصلت لموقعك المحدد على الـ GPS بالفعل يا طيب! أنا بجانب سيارتك الآن وبدأت فحص الخلل.' : 'I have arrived at your pinned GPS location! I am beside your vehicle now and starting diagnosis.',
            timestamp: '11:58',
            createdTime: Date.now()
          });
        }

        if (steps === 10) {
          clearInterval(interval);
          await updateDoc(doc(db, "requests", activeRequestId), {
            status: "in_progress"
          });
          const m10Id = `chat-10-${Date.now()}`;
          await setDoc(doc(db, "chats", m10Id), {
            id: m10Id,
            requestId: activeRequestId,
            sender: 'system',
            text: lang === 'ar' ? '🛠️ الفني يبدأ عملية الصيانة وتعبئة الموارد. الرجاء الانتظار.' : '🛠️ Technician started repair and servicing. Please wait.',
            timestamp: '11:59',
            createdTime: Date.now()
          });
        }
      }, 1500);

    } catch (err) {
      console.error(err);
    }
  };

  // Client: Release funds from Escrow to partner
  const handleReleaseEscrow = async () => {
    if (!selectedBid || !activeRequestId) return;
    try {
      await updateDoc(doc(db, "requests", activeRequestId), {
        status: "completed"
      });

      // Update active escrows status in our firestore
      const escrowsSnap = await getDocs(query(collection(db, "escrows"), where("requestId", "==", activeRequestId)));
      escrowsSnap.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          status: "released"
        });
      });

      // Update stats
      await updateDoc(doc(db, "system_stats", "global"), {
        completedRescues: stats.completedRescues + 1,
        activeEmergencies: Math.max(0, stats.activeEmergencies - 1)
      });

      const releaseMsgId = `c-release-${Date.now()}`;
      await setDoc(doc(db, "chats", releaseMsgId), {
        id: releaseMsgId,
        requestId: activeRequestId,
        sender: 'system',
        text: lang === 'ar' ? `💸 تم فك الضمان وتحرير مبلغ ${selectedBid.price} ₪ بنجاح إلى محفظة الفني الشريك. شكراً لاستخدامك سيسترو!` : `💸 Escrow released! ${selectedBid.price} ₪ successfully transferred to partner technician's wallet. Thank you for choosing Systro!`,
        timestamp: '12:00',
        createdTime: Date.now()
      });

      triggerToast(lang === 'ar' ? 'تم تحرير الأموال للفني بنجاح!' : 'Funds released to technician successfully!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Client: File Dispute/Complaint
  const handleFileDispute = async () => {
    if (!selectedBid || !activeRequestId || !liveRequest) return;

    try {
      await updateDoc(doc(db, "requests", activeRequestId), {
        status: "disputed"
      });

      // Create a Dispute record in Firestore
      const disputeId = `disp-${Date.now()}`;
      const newDispute = {
        id: disputeId,
        requestId: activeRequestId,
        clientName: liveRequest.clientName,
        techName: lang === 'ar' ? selectedBid.technicianArName : selectedBid.technicianName,
        serviceType: liveRequest.serviceType,
        amount: selectedBid.price,
        reason: disputeReason || (lang === 'ar' ? 'الفني لم يحل المشكلة بشكل كامل ويطلب رسوماً إضافية خارج النظام.' : 'Technician did not fully resolve the issue and requested off-platform fees.'),
        status: 'pending'
      };
      await setDoc(doc(db, "disputes", disputeId), newDispute);

      // Freeze escrow in Firestore
      const escrowsSnap = await getDocs(query(collection(db, "escrows"), where("requestId", "==", activeRequestId)));
      escrowsSnap.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          status: "disputed"
        });
      });

      const dispMsgId = `c-disp-${Date.now()}`;
      await setDoc(doc(db, "chats", dispMsgId), {
        id: dispMsgId,
        requestId: activeRequestId,
        sender: 'system',
        text: lang === 'ar' ? `🚨 تم تسجيل خلاف رسمي وتجميد الرصيد في محفظة الأمان. سيقوم فريق الإدارة بالتحقيق الفوري والتحكيم بين الطرفين خلال دقائق.` : `🚨 Official dispute registered! Escrow funds frozen. Systro Administration will investigate and arbitrate within minutes.`,
        timestamp: '12:01',
        createdTime: Date.now()
      });

      triggerToast(lang === 'ar' ? 'تم تقديم الشكوى وتجميد الأموال!' : 'Dispute filed and funds frozen!', 'error');
    } catch (err) {
      console.error(err);
    }
  };

  // Client: Submit rating and clear active request viewport (returns back to lists)
  const handleRatingSubmit = async () => {
    try {
      if (activeRequestId) {
        await updateDoc(doc(db, "requests", activeRequestId), {
          status: "completed"
        });
      }

      setActiveRequestId(null);
      setSimStatus('idle');
      setPinnedLocation(null);
      setSelectedBid(null);
      setIncomingBids([]);
      setTechCoordinates(null);
      setProblemDescription('');
      setChatMessages([]);

      triggerToast(lang === 'ar' ? 'شكراً لتقييمك، تم إغلاق لوحة التحكم والعودة لقائمة الطلبات.' : 'Thank you for your rating, request closed and returned to request list.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Arbitration: Release to Tech
  const handleAdminRelease = async (disputeId: string, reqId: string) => {
    try {
      await updateDoc(doc(db, "disputes", disputeId), {
        status: "resolved"
      });

      const escrowsSnap = await getDocs(query(collection(db, "escrows"), where("requestId", "==", reqId)));
      escrowsSnap.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          status: "released"
        });
      });

      triggerToast(lang === 'ar' ? 'تم الفصل في النزاع وتحرير الأموال للفني!' : 'Dispute resolved, escrow released to technician!', 'success');

      await updateDoc(doc(db, "requests", reqId), {
        status: "completed"
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Arbitration: Refund to Client
  const handleAdminRefund = async (disputeId: string, reqId: string) => {
    try {
      await updateDoc(doc(db, "disputes", disputeId), {
        status: "refunded"
      });

      const escrowsSnap = await getDocs(query(collection(db, "escrows"), where("requestId", "==", reqId)));
      escrowsSnap.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          status: "refunded"
        });
      });

      triggerToast(lang === 'ar' ? 'تم الفصل في النزاع وإعادة المبلغ لمحفظة العميل!' : 'Dispute resolved, escrow fully refunded to client!', 'info');

      await updateDoc(doc(db, "requests", reqId), {
        status: "idle"
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Chat: Send interactive real-time message
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRequestId) return;

    const userText = chatInput.trim();
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const userMsgId = `chat-msg-${Date.now()}`;

    try {
      await setDoc(doc(db, "chats", userMsgId), {
        id: userMsgId,
        requestId: activeRequestId,
        sender: userRole === 'technician' ? 'technician' : 'client',
        text: userText,
        timestamp: timestamp,
        createdTime: Date.now()
      });

      setChatInput('');

      // Auto reply from tech ONLY if user is client and wants realistic feedback
      if (userRole !== 'technician') {
        setTimeout(async () => {
          let reply = '';
          const textLower = userText.toLowerCase();

          if (textLower.includes('سيارة') || textLower.includes('سيارتي') || textLower.includes('نوع') || textLower.includes('car')) {
            reply = lang === 'ar' 
              ? `ممتاز يا غالي، لقد جهزت كافة المعدات ورافعات السحب المتوافقة مع مركبتك ومتحرك بأقصى سرعة.`
              : `Perfect! I have loaded all compatible towing gears for your vehicle class and proceeding rapidly.`;
          } else if (textLower.includes('موقع') || textLower.includes('فين') || textLower.includes('أين') || textLower.includes('where') || textLower.includes('location')) {
            reply = lang === 'ar'
              ? `موقعك ظاهر بدقة بالغة على خريطة الـ GPS المدمجة في تطبيق سيسترو الشريك. لا تقلق، دقيقة وأصلك.`
              : `Your exact GPS coordinates are crystal clear on my dashboard. Relax, I will be beside you in a minute.`;
          } else {
            reply = lang === 'ar'
              ? `علم يا طيب، أنا مركز على الطريق الآن ومتابع لموقعك وسنتعامل مع المشكلة بكل سهولة وأمان.`
              : `Understood! I am focused on the highway right now and tracking your coordinates. We'll fix it cleanly.`;
          }

          const replyMsgId = `chat-reply-${Date.now()}`;
          await setDoc(doc(db, "chats", replyMsgId), {
            id: replyMsgId,
            requestId: activeRequestId,
            sender: 'technician',
            text: reply,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            createdTime: Date.now()
          });
        }, 1200);
      }

    } catch (err) {
      console.error(err);
    }
  };

  // Verify Admin Special Code
  const handleVerifyAdminCode = () => {
    const trimmed = adminPasswordInput.trim();
    if (trimmed === '9988' || trimmed === 'systro2026' || trimmed === '1234') {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('systro_admin_unlocked', 'true');
      triggerToast(lang === 'ar' ? 'تم فتح لوحة الإدارة بنجاح! أهلاً بك.' : 'Admin Panel unlocked successfully! Welcome.', 'success');
      setAdminPasswordInput('');
    } else {
      triggerToast(lang === 'ar' ? 'كود المرور خاطئ! يرجى المحاولة مرة أخرى.' : 'Incorrect passcode! Please try again.', 'error');
    }
  };

  // Helper to completely reset simulation on both client and database
  const resetSimulation = async () => {
    try {
      const requestsSnap = await getDocs(collection(db, "requests"));
      requestsSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      const bidsSnap = await getDocs(collection(db, "bids"));
      bidsSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      const chatsSnap = await getDocs(collection(db, "chats"));
      chatsSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      const disputesSnap = await getDocs(collection(db, "disputes"));
      disputesSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      const escrowsSnap = await getDocs(collection(db, "escrows"));
      escrowsSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      setActiveRequestId(null);
      setSimStatus('idle');
      setPinnedLocation(null);
      setSelectedBid(null);
      setIncomingBids([]);
      setTechCoordinates(null);
      setProblemDescription('');
      setChatMessages([]);

      const initialStats = {
        activeTechnicians: 4,
        maxTechnicians: 5,
        completedRescues: 1,
        satisfactionRate: 99.8,
        activeEmergencies: 0
      };
      await setDoc(doc(db, "system_stats", "global"), initialStats);

      triggerToast(lang === 'ar' ? 'تم إعادة تعيين الخدمة وتفريغ قاعدة البيانات!' : 'Simulator reset and database cleared!', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Real Google Sign-In via Firebase Auth, with gorgeous iframe fallback
  const handleRealGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && user.email) {
        const email = user.email;
        const name = user.displayName || `Google User #${Math.floor(1000 + Math.random() * 9000)}`;
        await handleGoogleSignIn(email, name);
        triggerToast(lang === 'ar' ? 'تم تسجيل الدخول بواسطة Google بنجاح!' : 'Successfully signed in with Google!', 'success');
      }
    } catch (err: any) {
      console.log("Firebase Auth Google popup bypassed/closed, showing interactive Google Chooser:", err);
      setShowGoogleFallbackModal(true);
      // Quietly prompt the user with the interactive Google accounts screen
      triggerToast(
        lang === 'ar' 
          ? 'تم فتح نافذة اختيار الحسابات الذكية لمتابعة الدخول الآمن بنقرة واحدة!' 
          : 'Google account chooser panel opened for quick one-click secure login!', 
        'info'
      );
    }
  };

  // Send real email OTP via server.ts backend
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!enteredEmail.trim() || !enteredEmail.includes('@')) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح!' : 'Please enter a valid email address!', 'warning');
      return;
    }

    setIsOtpSending(true);
    setSimulatedOtpCode('');

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: enteredEmail.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setOtpSentToEmail(true);
        if (data.codeSimulator) {
          setSimulatedOtpCode(data.codeSimulator);
          triggerToast(lang === 'ar' 
            ? 'تم إرسال رمز التحقق بنجاح! (وضع الخدمة السريعة نشط)' 
            : 'Verification code sent successfully! (Sandbox active)', 'success');
        } else {
          triggerToast(lang === 'ar' 
            ? 'تم إرسال الرمز لبريدك الإلكتروني الحقيقي!' 
            : 'Verification code sent to your real email inbox!', 'success');
        }
      } else {
        triggerToast(data.error || (lang === 'ar' ? 'فشل إرسال رمز التحقق!' : 'Failed to send verification code!'), 'error');
      }
    } catch (err) {
      console.error("Error calling send-otp:", err);
      triggerToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : 'Server connection error!', 'error');
    } finally {
      setIsOtpSending(false);
    }
  };

  // Verify email OTP code via server.ts backend
  const handleVerifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCodeInput.trim()) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال رمز التحقق!' : 'Please enter the verification code!', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: enteredEmail.trim(), code: otpCodeInput.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Name is optional! If blank, generate random name
        const finalName = enteredName.trim() 
          ? enteredName.trim() 
          : (lang === 'ar' ? `عميل سيسترو #${Math.floor(1000 + Math.random() * 9000)}` : `Systro Client #${Math.floor(1000 + Math.random() * 9000)}`);
        
        await handleGoogleSignIn(enteredEmail.trim(), finalName);
        
        // Clean up inputs
        setOtpCodeInput('');
        setOtpSentToEmail(false);
      } else {
        triggerToast(data.error || (lang === 'ar' ? 'رمز التحقق غير صحيح!' : 'Incorrect verification code!'), 'error');
      }
    } catch (err) {
      console.error("Error calling verify-otp:", err);
      triggerToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : 'Server connection error!', 'error');
    }
  };

  // Sign In Portal Submission Simulator (Backward Compatibility)
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setOtpSent(true);
    triggerToast(lang === 'ar' ? 'تم إرسال رمز التحقق المؤقت OTP إلى جوالك!' : 'Temporary verification code OTP sent to your phone!', 'success');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode === '1234' || otpCode) {
      setIsLoggedIn(true);
      setUserRole(portalTab === 'client' ? 'client' : 'technician');
      setActiveTab('simulator');
      triggerToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح لبوابة سيسترو الآمنة!' : 'Successfully signed in to secure Systro portal!', 'success');
    } else {
      triggerToast(lang === 'ar' ? 'رمز التحقق غير صحيح! استخدم 1234 للتجربة.' : 'Verification code incorrect! Use 1234 to bypass.', 'error');
    }
  };

  const handleGoogleSignIn = async (email?: string, name?: string) => {
    setIsLoggedIn(true);
    const resolvedEmail = email || 'adam.atooun@gmail.com';
    const resolvedName = name || (lang === 'ar' ? 'أدهم عطون' : lang === 'he' ? 'אדם עטון' : 'Adam Atoun');
    
    setLoggedInUserEmail(resolvedEmail);
    setLoggedInUserName(resolvedName);

    localStorage.setItem('systro_is_logged_in', 'true');
    localStorage.setItem('systro_user_email', resolvedEmail);
    localStorage.setItem('systro_user_name', resolvedName);

    try {
      const userDocRef = doc(db, "users", resolvedEmail);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.role) {
          setUserRole(data.role);
          localStorage.setItem('systro_user_role', data.role);
        } else {
          setUserRole(null);
          localStorage.removeItem('systro_user_role');
        }
        if (data.phone) {
          setPhoneNumber(data.phone);
          localStorage.setItem('systro_phone_number', data.phone);
        }
      } else {
        // Create initial user document
        await setDoc(userDocRef, {
          email: resolvedEmail,
          name: resolvedName,
          role: null,
          phone: '',
          createdAt: new Date().toISOString()
        }, { merge: true });
        setUserRole(null);
        localStorage.removeItem('systro_user_role');
      }
    } catch (err) {
      console.error("Error persisting/fetching user from Firestore:", err);
    }

    setActiveTab('simulator');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setLoggedInUserEmail('');
    setLoggedInUserName('');
    localStorage.removeItem('systro_is_logged_in');
    localStorage.removeItem('systro_user_email');
    localStorage.removeItem('systro_user_name');
    localStorage.removeItem('systro_user_role');
    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح!' : 'Logged out successfully!', 'info');
  };

  if (!isLoggedIn) {
    return (
      <LoginPortal
        lang={lang}
        setLang={setLang}
        toast={toast}
        enteredName={enteredName}
        setEnteredName={setEnteredName}
        enteredEmail={enteredEmail}
        setEnteredEmail={setEnteredEmail}
        showGoogleFallbackModal={showGoogleFallbackModal}
        setShowGoogleFallbackModal={setShowGoogleFallbackModal}
        handleRealGoogleSignIn={handleRealGoogleSignIn}
        handleGoogleSignIn={handleGoogleSignIn}
        triggerToast={triggerToast}
        t={t}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E2E8F0] font-sans antialiased selection:bg-amber-500 selection:text-black pb-24 md:pb-0">
      
      {/* Custom Top Announcement Bar Featuring Ali */}
      <div id="ali-premium-top-banner" className="relative z-50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 py-2.5 px-4 text-center select-none flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="text-[11px] sm:text-xs font-black text-amber-400 tracking-wide">
          {lang === 'ar' 
            ? 'بإشراف وإدارة م. علي | المنصة الرقمية المعتمدة للإنقاذ السريع والخدمات الصناعية 🛠️✨' 
            : lang === 'he'
            ? 'בפיקוח ובניהול אינג\' עלי | פלטפורמת החילוץ המוסמכת והשירותים התעשייתיים 🛠️✨'
            : 'Supervised & Managed by Eng. Ali | The Certified Digital Platform for Rapid Rescue & Road Services 🛠️✨'}
        </span>
      </div>

      {/* Dynamic Toast Alerts */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-4 px-6 rounded-2xl border shadow-2xl backdrop-blur-md animate-fade-in transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : toast.type === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === 'info' && <Activity className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-bold font-sans">{toast.text}</span>
        </div>
      )}

      {/* TOP NAVBAR HEADER */}
      <header className="sticky top-0 z-40 bg-[#0A0B10]/95 backdrop-blur-md border-b border-[#1E293B]/70 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-3">
          
          {/* Logo Brand matching Images */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none" onClick={() => setActiveTab('home')}>
            <div className="w-11 h-11 relative rounded-xl overflow-hidden p-[1px] bg-gradient-to-tr from-sky-400 via-teal-300 to-emerald-400 shadow-sm flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-gradient-to-b from-[#0CC1C6] via-[#029FA5] to-[#01686C] rounded-xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/20 rounded-t-xl filter blur-[0.5px]"></div>
              </div>
              <svg className="w-7 h-7 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow-nav" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#014A4D" floodOpacity="0.5" />
                  </filter>
                  <linearGradient id="sGrad-nav" x1="10%" y1="0%" x2="90%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor="#E0FAFC" />
                    <stop offset="100%" stopColor="#A5F3FC" />
                  </linearGradient>
                </defs>
                <path d="M15 70 C 35 85, 70 65, 85 40" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.25" strokeDasharray="3 3" />
                <path d="M20 55 C 40 70, 75 55, 80 25" stroke="#00F5FF" strokeWidth="1.2" strokeOpacity="0.4" />
                <circle cx="85" cy="40" r="3.5" fill="#FFFFFF" />
                <circle cx="80" cy="25" r="2.5" fill="#00F5FF" />
                <circle cx="20" cy="55" r="3" fill="#00F5FF" />
                <circle cx="33" cy="67" r="4" fill="#E0FAFC" />
                <circle cx="15" cy="70" r="2" fill="#FFFFFF" />
                <circle cx="68" cy="35" r="4.5" fill="#FFFFFF" />
                <path 
                  d="M 75,32 
                     C 70,22  45,22  32,28 
                     C 20,34  22,46  38,48 
                     C 58,50  78,48  74,68 
                     C 70,82  42,84  25,74" 
                  stroke="url(#sGrad-nav)" 
                  strokeWidth="11" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  filter="url(#shadow-nav)"
                />
                <path 
                  d="M 70,30 
                     C 66,24  46,24  35,29 
                     C 25,34  26,44  39,46 
                     C 56,48  73,46  71,64 
                     C 68,76  44,78  28,70" 
                  stroke="#FFFFFF" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  strokeOpacity="0.8"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 drop-shadow-[0_1px_2px_rgba(6,182,212,0.1)]">
                  {t.logoTitle} <span className="text-[#029FA5] font-black">{t.logoRescue}</span>
                </h1>
                {/* Custom glowing supervisor badge for Ali */}
                <span className="px-2 py-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md animate-pulse">
                  {lang === 'ar' ? 'بإشراف علي' : lang === 'he' ? 'בפיקוח עלי' : 'Eng. Ali'}
                </span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-gray-400 block uppercase">
                {t.logoSub}
              </span>
            </div>
          </div>

          {/* Live Secure Domain Indicator - Hidden from customers, visible only when viewing the unlocked Admin panel */}
          {activeTab === 'admin' && isAdminUnlocked && (
            <button 
              onClick={() => setIsTrustPortalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] sm:text-[10px] font-black transition-all cursor-pointer shrink-0 animate-fade-in"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              <span className="hidden sm:inline">{lang === 'ar' ? `نطاق موثق: ${customDomain}` : `Verified: ${customDomain}`}</span>
              <span className="sm:hidden">{customDomain} 📡</span>
            </button>
          )}

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#111827]/60 p-1 rounded-xl border border-[#1E293B]/50 shrink-0">
            <button 
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'home' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              {t.home}
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'services' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              {t.services}
            </button>
            <button 
              onClick={() => {
                setActiveTab('simulator');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'simulator' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              {t.simulator}
            </button>
          </nav>

          {/* Right actions (Sign in, language toggle, Admin portal yellow) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : lang === 'en' ? 'he' : 'ar')}
              className="p-2 sm:p-2.5 bg-[#111827]/85 border border-[#1E293B]/70 rounded-xl text-gray-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.languageToggle}</span>
              <span className="sm:hidden uppercase">{lang}</span>
            </button>

            {/* Quick Login google stroke button */}
            {!isLoggedIn ? (
              <button 
                onClick={() => handleGoogleSignIn()}
                className="hidden lg:flex items-center gap-1.5 px-4 h-11 bg-transparent border border-gray-800 hover:border-gray-700 text-xs font-bold text-gray-300 rounded-xl transition-all cursor-pointer"
              >
                <span>→]</span>
                <span>{lang === 'ar' ? 'دخول بحساب Google' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex flex-col items-end text-right select-none">
                  <span className="text-xs font-black text-white">{loggedInUserName}</span>
                  <span className="text-[10px] font-mono text-amber-500 font-bold">
                    {userRole === 'client' ? (lang === 'ar' ? 'زبون للمقطوع' : 'Client Mode') : userRole === 'technician' ? (lang === 'ar' ? 'مقدم خدمات 🛠️' : 'Service Provider 🛠️') : (lang === 'ar' ? 'بانتظار تحديد الدور' : 'Select Role')}
                  </span>
                </div>
                <button 
                  onClick={async () => {
                    const newRole = userRole === 'technician' ? 'client' : 'technician';
                    setUserRole(newRole);
                    localStorage.setItem('systro_user_role', newRole);
                    
                    if (loggedInUserEmail) {
                      try {
                        const userDocRef = doc(db, "users", loggedInUserEmail);
                        await setDoc(userDocRef, { role: newRole }, { merge: true });
                      } catch (err) {
                        console.error("Error updating user role in Firestore:", err);
                      }
                    }

                    triggerToast(
                      lang === 'ar' 
                        ? `تم تحويل حسابك بنجاح إلى: ${newRole === 'client' ? 'زبون للمقطوع' : 'مقدم خدمات'}` 
                        : `Successfully changed view to: ${newRole === 'client' ? 'Stranded Client' : 'Service Provider'}`, 
                      'success'
                    );
                  }}
                  className="px-3.5 h-11 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-500 transition-all flex items-center gap-1.5 cursor-pointer"
                  title={lang === 'ar' ? 'اضغط لتبديل الدور تلقائياً' : 'Click to toggle user role'}
                >
                  <span>🔁</span>
                  <span>{userRole === 'client' ? (lang === 'ar' ? 'تحويل لفني' : 'To Provider') : (lang === 'ar' ? 'تحويل لزبون' : 'To Client')}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="px-3.5 h-11 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 transition-all flex items-center gap-1.5 cursor-pointer"
                  title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'ar' ? 'خروج' : 'Logout'}</span>
                </button>
              </div>
            )}

            {/* Mobile Logout Button */}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="lg:hidden p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-red-400 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Yellow Admin access button - Hidden on smallest screens to prevent overlap */}
            <button 
              onClick={() => setActiveTab('admin')}
              className={`hidden sm:flex px-4 h-11 text-xs font-extrabold rounded-xl transition-all items-center gap-1.5 shadow-lg cursor-pointer shrink-0 ${
                activeTab === 'admin' 
                  ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500 shadow-amber-500/20' 
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/10'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بوابة الإدارة' : 'Admin Gate'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* TWO MAIN USER ROLE CHANNELS (عميل مقطوع vs مقدم خدمة صناعي) */}
      {activeTab === 'home' && (
        <div id="systro-primary-user-role-channels" className="max-w-7xl mx-auto px-4 md:px-8 pt-6 select-none animate-fade-in">
          <div className="bg-gradient-to-r from-slate-950 via-[#0C111D] to-slate-950 p-5 rounded-3xl border border-[#1E293B]/90 flex flex-col lg:flex-row items-center justify-between gap-5 shadow-2xl">
            <div className="flex items-center gap-3.5 text-right w-full lg:w-auto">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl animate-pulse shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <span>{lang === 'ar' ? 'اختر بوابتك المباشرة للتعامل ⚡' : lang === 'he' ? 'בחר את ערוץ השירות המהיר ⚡' : 'Select Your Service Channel ⚡'}</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-400 font-bold leading-relaxed mt-1">
                  {lang === 'ar' 
                    ? 'اختر "عميل مقطوع" لطلب المساعدة الفورية على الطريق، أو "مقدم خدمة صناعي" للتسجيل وتقديم عروض أسعار للطلبات النشطة.' 
                    : lang === 'he'
                    ? 'בחר "לקוח תקוע" להזמנת סיוע מיידי בדרכים, أو "ספק שירות תעשייתי" להגשת הצעות מחיר לעבודות פעילות.' 
                    : 'Select "Stranded Client" for immediate roadside rescue, or "Industrial Service Provider" to view active emergency requests and submit bids.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0">
              {/* Button 1: عميل مقطوع */}
              <button
                id="role-stranded-client-btn"
                onClick={async () => {
                  setUserRole('client');
                  localStorage.setItem('systro_user_role', 'client');
                  if (loggedInUserEmail) {
                    try {
                      await setDoc(doc(db, "users", loggedInUserEmail), { role: 'client' }, { merge: true });
                    } catch (err) {
                      console.error("Failed to update user role in firestore:", err);
                    }
                  }
                  setActiveTab('simulator');
                  triggerToast(
                    lang === 'ar' 
                      ? 'تم تفعيل وضع العميل المقطوع 🚨 تفضل بطلب الخدمة الفورية الآن!' 
                      : lang === 'he'
                      ? 'מצב לקוח תקוע הופעל 🚨 הזמן שירות מיידי כעת!'
                      : 'Stranded Client Mode activated 🚨 Request rapid roadside assistance now!', 
                    'success'
                  );
                }}
                className={`w-full sm:w-auto px-7 py-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl active:scale-95 ${
                  userRole === 'client' 
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-black shadow-amber-500/20 scale-[1.03] font-black' 
                    : 'bg-[#111827] hover:bg-gray-800 text-gray-300 border border-gray-800'
                }`}
              >
                <span className="text-xl">🚗</span>
                <span className="font-black">{lang === 'ar' ? 'عميل مقطوع' : lang === 'he' ? 'לקוח תקוע' : 'Stranded Client'}</span>
                {userRole === 'client' && <span className="w-2.5 h-2.5 bg-black rounded-full animate-ping shrink-0"></span>}
              </button>

              {/* Button 2: مقدم خدمة صناعي */}
              <button
                id="role-industrial-provider-btn"
                onClick={async () => {
                  setUserRole('technician');
                  localStorage.setItem('systro_user_role', 'technician');
                  if (loggedInUserEmail) {
                    try {
                      await setDoc(doc(db, "users", loggedInUserEmail), { role: 'technician' }, { merge: true });
                    } catch (err) {
                      console.error("Failed to update user role in firestore:", err);
                    }
                  }
                  setActiveTab('simulator');
                  triggerToast(
                    lang === 'ar' 
                      ? 'تم تفعيل وضع مقدم الخدمة الصناعي 🛠️ تصفح طلبات العملاء وقدم عرض أسعارك فورا!' 
                      : lang === 'he'
                      ? 'מצב ספק שירות תעשייתי הופעל 🛠️ בדוק בקשות והגש הצעות מחיר!'
                      : 'Industrial Service Provider Mode activated 🛠️ View requests and submit bids!', 
                    'success'
                  );
                }}
                className={`w-full sm:w-auto px-7 py-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl active:scale-95 ${
                  userRole === 'technician' 
                    ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black shadow-cyan-500/20 scale-[1.03] font-black' 
                    : 'bg-[#111827] hover:bg-gray-800 text-gray-300 border border-gray-800'
                }`}
              >
                <span className="text-xl">🛠️</span>
                <span className="font-black">{lang === 'ar' ? 'مقدم خدمة صناعي' : lang === 'he' ? 'ספק שירות תעשייתי' : 'Industrial Service Provider'}</span>
                {userRole === 'technician' && <span className="w-2.5 h-2.5 bg-black rounded-full animate-ping shrink-0"></span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE HERO LANDING VIEW (Home) */}
      {activeTab === 'home' && (
        <HomeTab
          lang={lang}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          userRole={userRole}
          setUserRole={setUserRole}
          setActiveTab={setActiveTab}
          t={t}
          stats={stats}
          servicesList={servicesList}
          setSelectedService={setSelectedService}
          enteredName={enteredName}
          setEnteredName={setEnteredName}
          enteredEmail={enteredEmail}
          setEnteredEmail={setEnteredEmail}
          handleGoogleSignIn={handleGoogleSignIn}
          triggerToast={triggerToast}
          loggedInUserName={loggedInUserName}
        />
      )}

      {/* DETAILED ROAD SERVICES TAB */}
      {activeTab === 'services' && (
        <ServicesTab
          lang={lang}
          isLoggedIn={isLoggedIn}
          servicesList={servicesList}
          dbTechnicians={dbTechnicians}
          triggerToast={triggerToast}
          setIsLoggedIn={setIsLoggedIn}
          setUserRole={setUserRole}
          setActiveTab={setActiveTab}
          setSelectedService={setSelectedService}
          setSelectedServiceIdForRecord={setSelectedServiceIdForRecord}
          setShowAddRecordModal={setShowAddRecordModal}
          setShowCustomServiceModal={setShowCustomServiceModal}
          t={t}
        />
      )}

      {/* MAIN INTERACTIVE SIMULATOR SUITE TAB */}
      {activeTab === 'simulator' && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8">
          
          {/* Header block info */}
          <div className="bg-[#0F1424]/60 border border-gray-800 p-6 rounded-3xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 select-none">
            <div className="space-y-1">
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                {t.simTitle}
              </h2>
              <p className="text-xs text-gray-400 font-semibold">{t.simDesc}</p>
            </div>

            {/* Actions for simulator control */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
              
              {/* Responsive Role Toggle Switcher inside Simulator page */}
              <div className="flex bg-[#0A0B10] p-1 rounded-xl border border-gray-800">
                <button
                  onClick={async () => {
                    setUserRole('client');
                    localStorage.setItem('systro_user_role', 'client');
                    if (loggedInUserEmail) {
                      try {
                        await setDoc(doc(db, "users", loggedInUserEmail), { role: 'client' }, { merge: true });
                      } catch (err) {
                        console.error("Failed to save user role in simulator mode:", err);
                      }
                    }
                    triggerToast(lang === 'ar' ? 'تم تحويل وضع التحكم لزبون مقطوع' : 'Switched control to Stranded Client', 'success');
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${userRole === 'client' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <span>👤</span>
                  <span>{lang === 'ar' ? 'زبون' : 'Client'}</span>
                </button>
                <button
                  onClick={async () => {
                    setUserRole('technician');
                    localStorage.setItem('systro_user_role', 'technician');
                    if (loggedInUserEmail) {
                      try {
                        await setDoc(doc(db, "users", loggedInUserEmail), { role: 'technician' }, { merge: true });
                      } catch (err) {
                        console.error("Failed to save tech role in simulator mode:", err);
                      }
                    }
                    triggerToast(lang === 'ar' ? 'تم تحويل وضع التحكم لمقدم خدمة' : 'Switched control to Service Provider', 'success');
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${userRole === 'technician' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <span>🛠️</span>
                  <span>{lang === 'ar' ? 'فني' : 'Tech'}</span>
                </button>
              </div>

              {/* Quick simulated reset button */}
              <button 
                onClick={() => {
                  setSimStatus('idle');
                  setPinnedLocation(null);
                  setSelectedBid(null);
                  setIncomingBids([]);
                  setTechCoordinates(null);
                  setProblemDescription('');
                  setChatMessages([]);
                  triggerToast(lang === 'ar' ? 'تم إعادة تهيئة بوابة الطلبات والخدمات المباشرة!' : 'Rescue system and live services refreshed!', 'info');
                }}
                className="px-4 py-2.5 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 text-xs font-black rounded-xl transition-all text-center shrink-0 cursor-pointer"
              >
                {lang === 'ar' ? 'تحديث النظام 🔁' : 'Reset System 🔁'}
              </button>
            </div>
          </div>

          {/* Dynamic grid split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Interactive Map Canvas (12 cols grid map) */}
            <div className="lg:col-span-5 bg-[#0F1424] border border-gray-800 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
                  {t.simMapTitle}
                </h3>
                <span className="bg-[#10B981]/15 text-[#10B981] border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest">
                  GPS ACTIVE
                </span>
              </div>

              {/* Graphical HTML5 Canvas GPS map */}
              <div className="relative aspect-square w-full bg-[#0F1424] border border-gray-900 rounded-2xl overflow-hidden cursor-crosshair shadow-inner group">
                <canvas 
                  ref={canvasRef} 
                  width={400} 
                  height={400} 
                  onClick={handleMapClick}
                  className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                />
                
                {/* Pin guidance instruction Overlay overlaying when idle */}
                {simStatus === 'idle' && !pinnedLocation && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-6 text-center select-none pointer-events-none">
                    <div className="space-y-2 max-w-xs">
                      <MapPin className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
                      <p className="text-xs font-extrabold text-white leading-relaxed">
                        {t.simSelectLocation}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status details bottom pin details */}
              <div className="bg-[#0A0B10] p-4 rounded-xl border border-gray-900/60 flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-500">{lang === 'ar' ? 'إحداثيات العميل:' : 'Client Coordinates:'}</span>
                {pinnedLocation ? (
                  <span className="text-[#10B981] font-mono font-bold">
                    Lat: {pinnedLocation.lat}°N , Lng: {pinnedLocation.lng}°E
                  </span>
                ) : (
                  <span className="text-red-400 font-bold">{lang === 'ar' ? 'غير محدد 📌' : 'Unspecified 📌'}</span>
                )}
              </div>
            </div>

            {/* Right Column: Workflow Wizard or Partner Dashboard (Dynamic Role Layout) */}
            <div className="lg:col-span-7 bg-[#111827]/60 border border-gray-800 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
              
              {userRole === 'technician' ? (
                /* SERVICE PROVIDER DASHBOARD (Palestine Rescue Live Hub) */
                <div className="space-y-6">
                  {!activeTechDoc ? (
                    /* Setup Partner Profile */
                    <div className="space-y-6">
                      <div className="space-y-2 border-b border-gray-950 pb-4 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
                        <h3 className="text-base font-black text-white flex items-center gap-2 justify-center sm:justify-start">
                          <Wrench className="w-5 h-5 text-amber-500 animate-spin" />
                          <span>{lang === 'ar' ? 'تفعيل ملف الشريك ومزود الخدمات' : 'Setup Service Provider Profile'}</span>
                        </h3>
                        <p className="text-xs text-gray-400 font-semibold">
                          {lang === 'ar' 
                            ? 'أنت مسجل كفني/مقدم خدمة. يرجى إدخال تفاصيل مركبتك للبدء في استقبال طلبات الإنقاذ والظهور على الخريطة المباشرة.' 
                            : 'Complete your profile to start receiving emergency alerts and appear active on the network.'}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'اسم الفني / الشركة المعتمد:' : 'Certified Display Name:'}</label>
                          <input 
                            type="text" 
                            disabled
                            value={loggedInUserName} 
                            className="w-full px-4 py-3 bg-[#0A0B10]/85 border border-gray-900 rounded-xl text-gray-500 font-bold text-xs outline-none cursor-not-allowed"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'نوع مركبة الصيانة والإنقاذ (Car Model / Truck Type):' : 'Rescue Vehicle/Truck Description:'}</label>
                          <input 
                            type="text" 
                            required
                            value={providerVehicle}
                            onChange={(e) => setProviderVehicle(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: ونش سحب مرسيدس 2024' : 'e.g. Ford F-150 Field Repair Unit'} 
                            className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'رقم لوحة ترخيص المركبة (License Plate):' : 'License Plate Number:'}</label>
                          <input 
                            type="text" 
                            required
                            value={providerPlate}
                            onChange={(e) => setProviderPlate(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: 6-1122-99' : 'e.g. 7-1122-99'} 
                            className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                          />
                        </div>

                        <button 
                          onClick={async () => {
                            if (!providerVehicle.trim() || !providerPlate.trim()) {
                              triggerToast(lang === 'ar' ? 'الرجاء تعبئة مواصفات المركبة ورقم اللوحة!' : 'Please fill in the vehicle specs and license plate!', 'warning');
                              return;
                            }
                            try {
                              const newTech = {
                                id: loggedInUserEmail,
                                name: loggedInUserName,
                                arName: loggedInUserName,
                                phone: '+972 59-999-9999',
                                rating: 5.0,
                                reviewsCount: 1,
                                isOnline: true,
                                lat: 40,
                                lng: 40,
                                avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120',
                                carModel: providerVehicle,
                                arCarModel: providerVehicle,
                                plateNumber: providerPlate,
                                specialties: ['towing'],
                                email: loggedInUserEmail
                              };
                              await setDoc(doc(db, "technicians", loggedInUserEmail), newTech);
                              setProviderLat(40);
                              setProviderLng(40);
                              triggerToast(lang === 'ar' ? 'تهانينا! تم تفعيل ملفك كشريك إنقاذ معتمد لدى سيسترو.' : 'Congratulations! Your profile as a rescue partner is now active.', 'success');
                            } catch (err) {
                              console.error(err);
                              triggerToast(lang === 'ar' ? 'حدث خطأ في تفعيل الحساب' : 'Error activating account', 'error');
                            }
                          }}
                          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
                        >
                          <span>{lang === 'ar' ? 'حفظ الملف والظهور المباشر كشريك' : 'Activate & Save Certified Profile'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Active Certified Partner Dashboard */
                    <div className="space-y-6 text-right">
                      
                      {/* Live Badge Status Header */}
                      <div className="p-4 bg-[#0A0B10]/95 border border-gray-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                        <div className="flex items-center gap-3">
                          <img 
                            src="https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120" 
                            alt="Technician" 
                            className="w-10 h-10 rounded-full border border-amber-500/35 object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-right">
                            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>{loggedInUserName}</span>
                              <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                <span>{activeTechDoc.rating || '5.0'}</span>
                              </span>
                            </h4>
                            <span className="text-[10px] text-gray-500 font-extrabold block">{activeTechDoc.carModel} ({activeTechDoc.plateNumber})</span>
                          </div>
                        </div>

                        {/* Location pin alert badge */}
                        <div className="text-center sm:text-right rtl:sm:text-right ltr:sm:text-left bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                          <span className="text-[9px] text-blue-400 font-bold block uppercase">{lang === 'ar' ? 'تعديل تموضع المركبة:' : 'GPS Position:'}</span>
                          <span className="text-[10px] text-white font-extrabold font-mono block">
                            {providerLat ? `Lat: ${providerLat}, Lng: ${providerLng}` : (lang === 'ar' ? '📌 انقر على الخريطة لتحديد موقعك' : '📌 Click map to pin position')}
                          </span>
                        </div>
                      </div>

                      {/* Registering specialties ("يا نقدم خدمات تكتبلهم شو خدماتهم بكل قائمة نكتب إضافة سجل") */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-gray-950 pb-2">
                          {lang === 'ar' ? '🛠️ تخصصاتي وخدماتي النشطة بالشبكة:' : '🛠️ Active Specialties & Registers:'}
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                          {dbServices.map(s => {
                            const specialtiesList = activeTechDoc.specialties || [];
                            const isReg = specialtiesList.includes(s.id);
                            return (
                              <div key={s.id} className="p-3 bg-[#0A0B10] border border-gray-900 rounded-xl flex items-center justify-between gap-2">
                                <div className="space-y-0.5 min-w-0 text-right">
                                  <span className="text-xs font-bold text-white block truncate">{lang === 'ar' ? s.name.split(' (')[0] : s.name}</span>
                                  <span className="text-[9px] text-gray-500 font-semibold block truncate">{lang === 'ar' ? s.description : s.description}</span>
                                </div>

                                {isReg ? (
                                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-1 rounded-lg shrink-0 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>{lang === 'ar' ? 'نشط' : 'Active'}</span>
                                  </span>
                                ) : (
                                  <button 
                                    onClick={async () => {
                                      const updatedSpecs = [...specialtiesList, s.id];
                                      await updateDoc(doc(db, "technicians", loggedInUserEmail), {
                                        specialties: updatedSpecs
                                      });
                                      triggerToast(lang === 'ar' ? `تم إضافتك بنجاح لقائمة خدمات: ${s.name}` : `Successfully added to ${s.name} service logs!`, 'success');
                                    }}
                                    className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-2.5 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer"
                                  >
                                    {lang === 'ar' ? 'إضافة سجل ➕' : 'Add Record ➕'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Request Custom Specialty if missing ("مش موجود مكنيني بكون في خيار يضيف ايش بدو") */}
                      <div className="p-4 bg-[#0A0B10] border border-gray-900 rounded-2xl space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-amber-500 flex items-center gap-1">
                            <span>{lang === 'ar' ? '➕ هل تخصصك غير مدرج بالقائمة؟ أضفه الآن!' : '➕ Cannot find your specialty? Add custom trade!'}</span>
                          </h4>
                          <p className="text-[10px] text-gray-400 font-semibold">
                            {lang === 'ar' ? 'إذا كنت فني متخصص بمجال غير موجود (مثال: مبرمج مفاتيح ذكية، فني هيدروليك)، أضف تخصصك فورا للشبكة:' : 'If your specialty is not listed, write it below to expand the platform index:'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                          <div className="flex flex-col gap-1.5">
                            <input 
                              type="text" 
                              value={customSpecialtyName}
                              onChange={(e) => setCustomSpecialtyName(e.target.value)}
                              placeholder={lang === 'ar' ? 'اسم التخصص (مثال: ميكانيكي سيارات هجينة)' : 'Trade Name (e.g. Hybrid Mechanic)'}
                              className="w-full px-3 py-2 bg-[#111827] border border-gray-850 rounded-lg outline-none text-white font-bold text-xs"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <input 
                              type="text" 
                              value={customSpecialtyDesc}
                              onChange={(e) => setCustomSpecialtyDesc(e.target.value)}
                              placeholder={lang === 'ar' ? 'وصف التخصص المفقود' : 'Short description of trade'}
                              className="w-full px-3 py-2 bg-[#111827] border border-gray-850 rounded-lg outline-none text-white font-bold text-xs"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            if (!customSpecialtyName.trim() || !customSpecialtyDesc.trim()) {
                              triggerToast(lang === 'ar' ? 'يرجى إدخال اسم التخصص والوصف!' : 'Please enter the trade name and description!', 'warning');
                              return;
                            }
                            const customId = 'specialty-' + Math.random().toString(36).substring(2, 9);
                            try {
                              const newService = {
                                id: customId,
                                name: customSpecialtyName,
                                arName: customSpecialtyName,
                                description: customSpecialtyDesc,
                                arDescription: customSpecialtyDesc,
                                icon: 'wrench',
                                basePrice: customSpecialtyPrice
                              };
                              await setDoc(doc(db, "services", customId), newService);
                              
                              // Automatically register this tech under this new custom service
                              const specialtiesList = activeTechDoc.specialties || [];
                              await updateDoc(doc(db, "technicians", loggedInUserEmail), {
                                specialties: [...specialtiesList, customId]
                              });

                              setCustomSpecialtyName('');
                              setCustomSpecialtyDesc('');
                              triggerToast(lang === 'ar' ? `تهانينا! تم إدراج تخصصك الجديد [${customSpecialtyName}] في قاعدة بيانات سيسترو وتم تسجيلك فيه كفني معتمد!` : `Success! Custom trade registered and saved!`, 'success');
                            } catch (err) {
                              console.error(err);
                              triggerToast(lang === 'ar' ? 'حدث خطأ في إضافة التخصص' : 'Error registering custom service', 'error');
                            }
                          }}
                          className="w-full py-2 bg-[#1E293B] hover:bg-[#334155] text-amber-400 font-extrabold text-xs rounded-xl border border-amber-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>{lang === 'ar' ? 'إضافة وتسجيل التخصص الجديد بالشبكة 🚀' : 'Register Custom Specialty 🚀'}</span>
                        </button>
                      </div>

                      {/* Active client requests from road network */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-gray-950 pb-2 flex items-center justify-between">
                          <span>{lang === 'ar' ? '📡 نداءات استغاثة طارئة نشطة على الطريق:' : '📡 Active Live Rescue Alerts on Road:'}</span>
                          <span className="bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded text-[9px] animate-pulse">
                            {allRequests.filter(r => r.status === 'pending_bids').length} ALERTS
                          </span>
                        </h4>

                        {allRequests.filter(r => r.status === 'pending_bids').length === 0 ? (
                          <div className="p-8 text-center bg-[#0A0B10] border border-gray-900 rounded-2xl">
                            <span className="text-xs text-gray-500 font-bold block">{lang === 'ar' ? 'لا توجد بلاغات طوارئ نشطة حالياً. المركبات تسير بأمان! 👍' : 'No active roadside emergencies. Drivers are safe! 👍'}</span>
                          </div>
                        ) : (
                          <div className="space-y-3 font-sans">
                            {allRequests.filter(r => r.status === 'pending_bids').map(req => {
                              const isSelected = selectedBidRequest?.id === req.id;
                              return (
                                <div key={req.id} className={`p-4 rounded-2xl border transition-all ${isSelected ? 'bg-[#0F1424] border-amber-500 shadow-md' : 'bg-[#0A0B10] border-gray-900 hover:border-gray-800'}`}>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="text-right rtl:text-right ltr:text-left">
                                      <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded inline-block uppercase mb-1.5 animate-pulse">
                                        {lang === 'ar' ? 'بلاغ طارئ' : 'ALERT'}
                                      </span>
                                      <h5 className="text-xs font-black text-white">{req.clientName}</h5>
                                      <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                                        {lang === 'ar' ? 'الخدمة المطلوبة:' : 'Requested service:'} <span className="text-amber-500 font-extrabold">{req.serviceType}</span>
                                      </span>
                                    </div>

                                    <button 
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedBidRequest(null);
                                        } else {
                                          setSelectedBidRequest(req);
                                          // Set pinnedLocation temporarily so technician can see where the client is on their map!
                                          setPinnedLocation({ lat: req.locationLat, lng: req.locationLng });
                                          triggerToast(lang === 'ar' ? 'تم تحديد موقع العميل على الخريطة!' : 'Client breakdown pinned on live map!', 'info');
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] rounded-lg transition-all cursor-pointer"
                                    >
                                      {isSelected ? (lang === 'ar' ? 'إغلاق' : 'Close') : (lang === 'ar' ? 'معاينة وتقديم عرض 🛠️' : 'View & Bid 🛠️')}
                                    </button>
                                  </div>

                                  {/* Bid Form Expansion inside alert card */}
                                  {isSelected && (
                                    <div className="mt-4 pt-4 border-t border-gray-950 space-y-4 animate-fade-in text-right">
                                      <div className="p-3 bg-[#050505] rounded-xl text-[11px] leading-relaxed text-gray-300 font-semibold border border-gray-950">
                                        <span className="font-extrabold text-amber-500 block mb-0.5">{lang === 'ar' ? 'شرح المشكلة:' : 'Problem Details:'}</span>
                                        {req.description || (lang === 'ar' ? 'لا يوجد شرح تفصيلي' : 'No description provided')}
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] text-gray-500 uppercase">{lang === 'ar' ? 'عرض السعر المقترح (₪):' : 'Bid Amount (₪):'}</label>
                                          <input 
                                            type="number" 
                                            value={customBidPrice}
                                            onChange={(e) => setCustomBidPrice(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-[#050505] border border-gray-900 rounded-lg text-white font-mono text-center"
                                          />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] text-gray-500 uppercase">{lang === 'ar' ? 'الوقت المتوقع للوصول (دقيقة):' : 'ETA (Min):'}</label>
                                          <input 
                                            type="number" 
                                            value={customBidEta}
                                            onChange={(e) => setCustomBidEta(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-[#050505] border border-gray-900 rounded-lg text-white font-mono text-center"
                                          />
                                        </div>
                                      </div>

                                      <button 
                                        onClick={async () => {
                                          if (customBidPrice <= 0 || customBidEta <= 0) {
                                            triggerToast(lang === 'ar' ? 'يرجى إدخال قيم صحيحة!' : 'Please enter valid values!', 'warning');
                                            return;
                                          }
                                          try {
                                            const bidId = 'bid-' + Math.random().toString(36).substring(2, 9);
                                            const newBidObj = {
                                              id: bidId,
                                              requestId: req.id,
                                              technicianId: loggedInUserEmail,
                                              technicianName: loggedInUserName,
                                              technicianArName: loggedInUserName,
                                              phone: '+972 59-999-9999',
                                              price: customBidPrice,
                                              etaMinutes: customBidEta,
                                              rating: activeTechDoc.rating || 5.0,
                                              avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120',
                                              carModel: activeTechDoc.carModel,
                                              plateNumber: activeTechDoc.plateNumber
                                            };
                                            await setDoc(doc(db, "bids", bidId), newBidObj);
                                            
                                            // Automatically update status to pending_bids if it's idle
                                            await updateDoc(doc(db, "requests", req.id), {
                                              status: 'pending_bids'
                                            });

                                            triggerToast(lang === 'ar' ? `تم إرسال عرض السعر بقيمة ${customBidPrice} ₪ للعميل بنجاح!` : `Bid of ${customBidPrice} ₪ submitted successfully!`, 'success');
                                            setSelectedBidRequest(null);
                                          } catch (err) {
                                            console.error(err);
                                            triggerToast('Error submitting bid', 'error');
                                          }
                                        }}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                                      >
                                        {lang === 'ar' ? 'إرسال عرض السعر الفوري للعميل ⚡' : 'Submit Emergency Pricing Bid ⚡'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                /* Original Client Workflow (Idle, Pending Bids, Secure Vault Deposit, En Route, Chat, Completed) */
                <>
                  {/* Wizard Status Idle state: Submit request */}
                  {simStatus === 'idle' && (
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white border-b border-gray-900 pb-3">
                        {lang === 'ar' ? 'خطوة 1: تعبئة وتفاصيل طلب الإنقاذ' : 'Step 1: Fill Rescue Request details'}
                      </h3>

                      <div className="space-y-4">
                        {/* Choose service */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t.simFormService}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {servicesList.map(s => {
                              const IconComponent = s.icon;
                              const isSel = selectedService === s.id;
                              return (
                                <div 
                                  key={s.id}
                                  onClick={() => setSelectedService(s.id)}
                                  className={`p-3.5 bg-[#0F1424] border rounded-xl flex items-center gap-2 cursor-pointer transition-all select-none ${isSel ? 'border-amber-500/80 bg-amber-500/5 text-amber-400 font-extrabold' : 'border-gray-900 text-gray-400 hover:text-white'}`}
                                >
                                  <IconComponent className="w-4.5 h-4.5 shrink-0" />
                                  <span className="text-xs truncate">{lang === 'ar' ? s.name.split(' (')[0] : s.name.split(' (')[1]?.replace(')', '') || s.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Problem details text area */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t.simFormDesc}
                          </label>
                          <textarea
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            placeholder={t.simFormDescPlaceholder}
                            rows={4}
                            className="w-full p-4 bg-[#0A0B10] border border-gray-900 focus:border-amber-500 outline-none rounded-xl text-xs text-white font-semibold leading-relaxed transition-colors"
                          />
                        </div>
                      </div>

                      {/* Submission actions */}
                      <button 
                        onClick={triggerBidsSimulation}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-2xl transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2"
                      >
                        <Activity className="w-5 h-5 animate-pulse" />
                        <span>{t.simSubmitRequest}</span>
                      </button>
                    </div>
                  )}

                  {/* Wizard Status: Pending Bids list */}
                  {simStatus === 'pending_bids' && (
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white border-b border-gray-900 pb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500 animate-spin" />
                        {t.simBidsTitle}
                      </h3>

                      {incomingBids.length === 0 ? (
                        <div className="p-12 text-center space-y-4">
                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-500/40 border-t-amber-500 animate-spin mx-auto"></div>
                          <p className="text-xs font-semibold text-gray-400 animate-pulse">
                            {t.simAwaitingBids}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {incomingBids.map(bid => (
                            <div key={bid.id} className="p-4 bg-[#0F1424] border border-gray-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-md">
                              <div className="flex items-center gap-4">
                                <img src={bid.avatar} alt="technician" className="w-12 h-12 rounded-full object-cover border border-amber-500/20" referrerPolicy="no-referrer" />
                                <div>
                                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                                    <span>{lang === 'ar' ? bid.technicianArName : bid.technicianName}</span>
                                    <span className="bg-amber-500/15 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span>{bid.rating}</span>
                                    </span>
                                  </h4>
                                  <span className="text-[10px] text-gray-500 font-bold block">{lang === 'ar' ? 'فني مرخص ومعتمد لدى سيسترو' : 'Licensed Certified Partner'}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end">
                                {/* Quote stats */}
                                <div className="text-right rtl:text-right ltr:text-left">
                                  <span className="text-[9px] text-gray-500 font-bold block uppercase">{t.simBidPrice}</span>
                                  <span className="text-lg font-black text-emerald-400 font-mono">{bid.price} ₪</span>
                                </div>

                                <div className="text-right rtl:text-right ltr:text-left">
                                  <span className="text-[9px] text-gray-500 font-bold block uppercase">{t.simBidEta}</span>
                                  <span className="text-xs font-black text-white font-mono block">{bid.etaMinutes} {lang === 'ar' ? 'دقيقة' : 'Min'}</span>
                                </div>

                                {/* Select bid */}
                                <button 
                                  onClick={() => handleAcceptBid(bid)}
                                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all"
                                >
                                  {t.simAcceptBid}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wizard Status: Awaiting Escrow Deposit into Vault */}
                  {simStatus === 'awaiting_deposit' && selectedBid && (
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white border-b border-gray-900 pb-3 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500 animate-pulse" />
                        {t.simEscrowActionTitle}
                      </h3>

                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-semibold">
                        {t.simEscrowActionDesc}
                      </p>

                      {/* Vault Card layout identical to Image 3 */}
                      <div className="bg-[#0F1424] border border-gray-850 p-6 rounded-2xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-4 right-4">
                          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {lang === 'ar' ? 'في انتظار الحجز' : 'PENDING SECURING'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 border-b border-gray-850 pb-4">
                          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{t.vaultTitle}</h4>
                            <span className="text-[10px] text-gray-500 font-bold block">{t.vaultSub}</span>
                          </div>
                        </div>

                        {/* Escrow grid breakdown info - stack on mobile, grid on desktop */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 bg-[#0A0B10] border border-gray-900 rounded-xl text-center space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase block">{t.vaultPartnerTech}</span>
                            <span className="text-xs font-black text-white block truncate">{lang === 'ar' ? selectedBid.technicianArName : selectedBid.technicianName}</span>
                          </div>

                          <div className="p-3.5 bg-[#0A0B10] border border-gray-900 rounded-xl text-center space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase block">{t.vaultCommission}</span>
                            <span className="text-xs font-black text-amber-500 font-mono block">20% (30 ₪)</span>
                          </div>

                          <div className="p-3.5 bg-[#0A0B10] border border-gray-900 rounded-xl text-center space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase block">{t.vaultNetEarnings}</span>
                            <span className="text-xs font-black text-emerald-400 font-mono block">120 ₪</span>
                          </div>
                        </div>

                        {/* Overall payment info */}
                        <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-gray-850">
                          <span className="text-gray-400">{t.vaultResValue}:</span>
                          <span className="text-xl font-black text-white font-mono">{selectedBid.price} ₪</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <button 
                        onClick={handleEscrowDeposit}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
                      >
                        <Lock className="w-5 h-5" />
                        <span>{lang === 'ar' ? `إيداع وحجز ${selectedBid.price} ₪ والبدء 🔒` : `Secure Deposit ${selectedBid.price} ₪ & Proceed 🔒`}</span>
                      </button>
                    </div>
                  )}

                  {/* Wizard Status: En route / Arrived / Working live tracking status */}
                  {(simStatus === 'en_route' || simStatus === 'arrived' || simStatus === 'in_progress') && selectedBid && (
                    <div className="space-y-6">
                      {/* Status wizard card */}
                      <div className="p-4 bg-[#0F1424] border border-gray-850 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              {simStatus === 'en_route' && t.simTechEnRoute}
                              {simStatus === 'arrived' && t.simTechArrived}
                              {simStatus === 'in_progress' && t.simTechWorking}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-semibold block">{lang === 'ar' ? 'رقم اللوحة:' : 'License Plate:'} {technicians[0].plateNumber}</span>
                          </div>
                        </div>

                        <span className="bg-amber-500/15 text-amber-500 text-[10px] font-bold px-3 py-1 rounded-full font-mono uppercase tracking-widest">
                          {simStatus === 'en_route' && (lang === 'ar' ? 'جاري التحرك' : 'EN ROUTE')}
                          {simStatus === 'arrived' && (lang === 'ar' ? 'وصل الفني' : 'ARRIVED')}
                          {simStatus === 'in_progress' && (lang === 'ar' ? 'جاري الصيانة' : 'IN REPAIR')}
                        </span>
                      </div>

                      {/* Dynamic simulated sidebar chat with technician */}
                      <div className="bg-[#0A0B10] border border-gray-900 rounded-2xl p-4 flex flex-col justify-between h-56">
                        <div className="flex-1 overflow-y-auto space-y-3 pb-3 pr-1 text-xs">
                          {chatMessages.map(msg => {
                            const isSystem = msg.sender === 'system';
                            const isTech = msg.sender === 'technician';
                            return (
                              <div key={msg.id} className={`flex ${isSystem ? 'justify-center' : isTech ? 'justify-start' : 'justify-end'}`}>
                                <div className={`p-2.5 max-w-sm rounded-xl font-semibold leading-relaxed ${
                                  isSystem 
                                    ? 'bg-gray-900 text-gray-400 text-[10px] text-center max-w-full font-sans border border-gray-800' 
                                    : isTech 
                                    ? 'bg-[#1F2937] text-gray-200 rounded-tl-none border border-gray-850' 
                                    : 'bg-amber-500 text-black rounded-tr-none'
                                }`}>
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Chat entry form */}
                        <form onSubmit={handleChatSend} className="pt-3 border-t border-gray-900 flex items-center gap-2">
                          <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={lang === 'ar' ? 'أرسل رسالة فورية للفني...' : 'Send messages to partner technician...'}
                            className="flex-1 px-3 py-2 bg-[#111827] border border-gray-850 rounded-lg outline-none text-xs text-white"
                          />
                          <button 
                            type="submit"
                            className="p-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </div>

                      {/* Action buttons (Release Escrow or open dispute panel) */}
                      <div className="flex gap-4">
                        <button 
                          onClick={handleReleaseEscrow}
                          className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <Unlock className="w-4.5 h-4.5" />
                          <span>{t.simReleaseFundsBtn}</span>
                        </button>

                        <button 
                          onClick={() => setSimStatus('disputed')}
                          className="px-5 py-3.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-4.5 h-4.5" />
                          <span>{t.simDisputeBtn}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Wizard Status: Disputed Simulation Panel */}
                  {simStatus === 'disputed' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-3 text-red-400">
                        <AlertTriangle className="w-8 h-8 animate-bounce shrink-0" />
                        <div>
                          <h4 className="text-sm font-black text-white">{lang === 'ar' ? 'فتح بلاغ نزاع مالي (Dispute)' : 'Open Escrow Dispute'}</h4>
                          <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">{t.simDisputeOpened}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block">{lang === 'ar' ? 'يرجى تقديم تفاصيل وبنود الخلاف للإدارة:' : 'Provide dispute terms to administration:'}</label>
                        <textarea 
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder={t.simDisputeReasonPlaceholder}
                          rows={4}
                          className="w-full p-4 bg-[#0A0B10] border border-gray-900 focus:border-red-500 outline-none text-xs text-white font-semibold rounded-xl"
                        />
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setSimStatus('in_progress')}
                          className="flex-1 py-3 bg-[#111827] border border-gray-850 hover:bg-gray-800 text-gray-300 font-bold text-xs rounded-xl transition-all"
                        >
                          {t.cancel}
                        </button>
                        <button 
                          onClick={handleFileDispute}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 transition-all"
                        >
                          {t.simSubmitDispute}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Wizard Status: Completed / Release success invoice & Rating */}
                  {simStatus === 'completed' && (
                    <div className="space-y-6 animate-fade-in text-center py-6">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>

                      <h3 className="text-xl font-black text-white">
                        {lang === 'ar' ? 'تمت عملية الإنقاذ والتحويل المالي بنجاح!' : 'Roadside Rescue Completed & Escrow Released!'}
                      </h3>

                      <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed font-semibold">
                        {lang === 'ar' 
                          ? 'تم تحويل مبلغ 120 ₪ لـ رائد مسعود وحسم عمولة سيسترو 30 ₪ بنجاح. شكراً لثقتك بنظام الضمان والأمان المالي الموقوف.' 
                          : '120 ₪ successfully transferred to Raed Masoud, with 30 ₪ Systro fee collected. Thank you for utilizing our secure Escrow platform.'}
                      </p>

                      <div className="max-w-xs mx-auto space-y-3 bg-[#0F1424] p-4 rounded-2xl border border-gray-850">
                        <h4 className="text-xs font-bold text-gray-400 text-center uppercase border-b border-gray-850 pb-2">{t.simRatingTitle}</h4>
                        
                        {/* Stars select */}
                        <div className="flex justify-center gap-2 pt-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              onClick={() => setSimRating(star)}
                              className={`w-7 h-7 cursor-pointer transition-transform hover:scale-110 ${star <= simRating ? 'fill-current' : 'text-gray-600'}`} 
                            />
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={handleRatingSubmit}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all"
                      >
                        {t.simSubmitRating}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Wizard footer info */}
              <div className="border-t border-gray-900 pt-4 flex items-center justify-between text-[10px] text-gray-500 font-mono tracking-wider">
                <span>SYSTEM ID: AIS-SR-2.1</span>
                <span>SECURED AES-256</span>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CORE ADMIN OVERSIGHT CONTROL PANEL (Image 1 gateway access) */}
      {activeTab === 'admin' && (
        !isAdminUnlocked ? (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 animate-fade-in">
            <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600">
                <Lock className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900">
                  {lang === 'ar' ? 'لوحة الإدارة مغلقة ومحمية 🔒' : 'Admin Panel Locked 🔒'}
                </h2>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {lang === 'ar' 
                    ? 'هذه المنطقة مخصصة لمسؤولي سيسترو فقط. يرجى إدخال كود المرور الخاص بك للمتابعة:' 
                    : 'This area is restricted to Systro administrators only. Please enter your secret code to proceed:'}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="relative">
                  <input 
                    type="password" 
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل كود المرور الخاص بك...' : 'Enter your secret passcode...'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleVerifyAdminCode();
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-center font-mono text-sm font-bold tracking-widest text-slate-800"
                  />
                </div>

                <button 
                  onClick={handleVerifyAdminCode}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/15 transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'تحقق وافتح لوحة التحكم 🔓' : 'Verify & Unlock Panel 🔓'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 animate-fade-in space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 border-b border-slate-200 pb-6">
              <div className="space-y-2 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
                  <h2 className="text-2xl font-black text-slate-900">{t.adminTitle}</h2>
                  {/* Verified Domain Badge - Relocated to Administration Portal */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold shrink-0 shadow-sm select-none">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                    <span>{lang === 'ar' ? `نطاق موثق: ${customDomain}` : `Verified Domain: ${customDomain}`}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? 'فصل وتحكيم المنازعات المالية والودائع المعلقة لحل الخلافات بين العملاء والفنيين.' : 'Arbitrate active disputes, refund clients, or dispatch technician escrow payouts manually.'}</p>
              </div>
              <button 
                onClick={() => {
                  setIsAdminUnlocked(false);
                  sessionStorage.removeItem('systro_admin_unlocked');
                  triggerToast(lang === 'ar' ? 'تم إغلاق لوحة الإدارة بنجاح!' : 'Admin Panel locked successfully!', 'info');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-black rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 self-center sm:self-auto shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'قفل لوحة الإدارة 🔒' : 'Lock Admin Panel 🔒'}</span>
              </button>
            </div>

          {/* Quick Database & Simulator Reset Panel */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
              <h4 className="text-sm font-black text-white flex items-center gap-2 justify-center sm:justify-start">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{lang === 'ar' ? 'أداة تنظيف وضبط قاعدة البيانات (Firebase)' : 'Firebase Database Cleanup Tool'}</span>
              </h4>
              <p className="text-xs text-gray-400 font-semibold">
                {lang === 'ar' 
                  ? 'يقوم هذا الخيار بمسح كافة سجلات الطلبات النشطة، العروض والمحادثات من Firestore لإعادة تشغيل النظام من الصفر.' 
                  : 'This option clears all active requests, technician bids, and chat transcripts from Firestore to allow clean testing.'}
              </p>
            </div>
            <button 
              onClick={resetSimulation}
              className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 transition-all shrink-0"
            >
              {lang === 'ar' ? 'تفريغ Firestore وضبط النظام 🗑️' : 'Clear Firestore & Reset 🗑️'}
            </button>
          </div>

          {/* Real-time Domain Connection & Website Trust Panel */}
          <TrustPortal 
            lang={lang} 
            triggerToast={triggerToast} 
            customDomain={customDomain}
            setCustomDomain={setCustomDomain}
          />

          {/* Real-time SMTP Connection & Diagnostics Panel */}
          <SmtpConfigPanel 
            lang={lang}
            status={smtpStatus}
            onRefresh={fetchSmtpStatus}
            triggerToast={triggerToast}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Active Escrow Holdings list */}
            <div className="p-6 bg-[#0F1424] border border-gray-800 rounded-3xl space-y-4">
              <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider border-b border-gray-850 pb-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>{t.adminActiveEscrows}</span>
              </h3>

              {escrows.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10 font-semibold">
                  {t.adminNoEscrows}
                </p>
              ) : (
                <div className="space-y-3">
                  {escrows.map(esc => (
                    <div key={esc.id} className="p-4 bg-[#0A0B10] border border-gray-900 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-white block">{esc.clientName} → {esc.techName}</span>
                        <span className="text-[10px] text-gray-500 block uppercase font-mono">{esc.serviceType} / ID: {esc.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-white font-mono">{esc.amount} ₪</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          esc.status === 'escrowed' 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                            : esc.status === 'released'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {esc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active disputes Arbitration control */}
            <div className="p-6 bg-[#0F1424] border border-gray-800 rounded-3xl space-y-4">
              <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider border-b border-gray-850 pb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <span>{t.adminActiveDisputes}</span>
              </h3>

              {disputesList.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10 font-semibold">
                  {lang === 'ar' ? 'لا توجد بلاغات خلاف مالي مفتوحة حالياً في النظام.' : 'No active financial disputes currently open.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {disputesList.map(disp => (
                    <div key={disp.id} className="p-5 bg-[#0A0B10] border border-gray-900 rounded-2xl space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-white">{disp.clientName} v {disp.techName}</h4>
                          <span className="text-[9px] text-gray-500 block uppercase font-mono">Dispute ID: {disp.id} — Claiming: {disp.amount} ₪</span>
                        </div>

                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase ${
                          disp.status === 'pending'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {disp.status}
                        </span>
                      </div>

                      <div className="p-3 bg-[#111827] rounded-xl text-xs text-gray-400 leading-relaxed italic font-medium">
                        "{disp.reason}"
                      </div>

                      {disp.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => handleAdminRelease(disp.id, disp.requestId)}
                            className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition-all"
                          >
                            {t.adminReleaseAction}
                          </button>
                          <button 
                            onClick={() => handleAdminRefund(disp.id, disp.requestId)}
                            className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition-all"
                          >
                            {t.adminRefundAction}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
        )
      )}



      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md bg-[#0F1424] border border-gray-800 p-6 rounded-3xl space-y-6 relative text-right rtl:text-right ltr:text-left">
            <button 
              onClick={() => setShowAddRecordModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-black text-white">
                {lang === 'ar' ? 'إضافة سجل فني جديد' : lang === 'he' ? 'הוסף רשומת טכנאי חדשה' : 'Add New Technician Record'}
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                {lang === 'ar' 
                  ? `أنت تقوم بالتسجيل لخدمة: ${selectedServiceIdForRecord}` 
                  : `Registering for service ID: ${selectedServiceIdForRecord}`}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'الاسم بالكامل:' : 'Full Name:'}
                </label>
                <input 
                  type="text" 
                  value={loggedInUserName}
                  disabled
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 rounded-xl text-gray-400 font-bold text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'رقم الهاتف:' : 'Phone Number:'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="+972 59-XXX-XXXX"
                  value={providerPhone}
                  onChange={(e) => setProviderPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'نوع وموديل المركبة:' : 'Vehicle Model:'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Toyota Hilux / GMC"
                  value={providerCarModel}
                  onChange={(e) => setProviderCarModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'رقم لوحة المركبة:' : 'Vehicle Plate Number:'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="X-XXXX-XX"
                  value={providerPlateNumber}
                  onChange={(e) => setProviderPlateNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <button
                onClick={async () => {
                  if (!providerPhone.trim() || !providerCarModel.trim() || !providerPlateNumber.trim()) {
                    triggerToast(lang === 'ar' ? 'الرجاء ملء جميع الحقول!' : 'Please fill all fields!', 'warning');
                    return;
                  }
                  const newTechId = `tech_${Date.now()}`;
                  const newTech = {
                    id: newTechId,
                    name: loggedInUserName || 'Unknown Technician',
                    arName: loggedInUserName || 'Unknown Technician',
                    phone: providerPhone,
                    rating: 5.0,
                    reviewsCount: 1,
                    isOnline: true,
                    lat: Math.floor(Math.random() * 60) + 20,
                    lng: Math.floor(Math.random() * 60) + 20,
                    avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120',
                    carModel: providerCarModel,
                    arCarModel: providerCarModel,
                    plateNumber: providerPlateNumber,
                    specialties: [selectedServiceIdForRecord],
                    serviceId: selectedServiceIdForRecord,
                    email: loggedInUserEmail
                  };
                  await setDoc(doc(db, "technicians", newTechId), newTech);
                  setShowAddRecordModal(false);
                  setProviderPhone('');
                  setProviderCarModel('');
                  setProviderPlateNumber('');
                  triggerToast(lang === 'ar' ? 'تم إضافة السجل كفني بنجاح!' : 'Technician record added successfully!', 'success');
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ وتأكيد السجل' : 'Save & Confirm Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Service Modal */}
      {showCustomServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md bg-[#0F1424] border border-gray-800 p-6 rounded-3xl space-y-6 relative text-right rtl:text-right ltr:text-left">
            <button 
              onClick={() => setShowCustomServiceModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-black text-white">
                {lang === 'ar' ? 'إضافة خدمة مخصصة جديدة' : lang === 'he' ? 'הוסף שירות מותאם אישית חדש' : 'Add New Custom Service'}
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                {lang === 'ar' 
                  ? 'قم بوصف الخدمة لإضافتها مباشرة في قاعدة البيانات ولتظهر لجميع الفنيين والعملاء.' 
                  : 'Specify service details to add it dynamically to the live Firestore collection.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'اسم الخدمة (بالعربية):' : 'Service Name (Arabic):'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: ميكانيكي هيدروليك ونظام فرامل"
                  value={customServiceNameAr}
                  onChange={(e) => setCustomServiceNameAr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'اسم الخدمة (بالإنجليزي):' : 'Service Name (English):'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Brake & Hydraulic Specialist"
                  value={customServiceNameEn}
                  onChange={(e) => setCustomServiceNameEn(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'شرح ووصف الخدمة (بالعربية):' : 'Description (Arabic):'}
                </label>
                <textarea 
                  required
                  rows={2}
                  placeholder="شرح موجز للخدمة وكيفية مساعدة السيارات المتعلطة..."
                  value={customServiceDescAr}
                  onChange={(e) => setCustomServiceDescAr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'شرح ووصف الخدمة (بالإنجليزي):' : 'Description (English):'}
                </label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Short explanation of the service scope..."
                  value={customServiceDescEn}
                  onChange={(e) => setCustomServiceDescEn(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'السعر الأساسي التقديري (₪):' : 'Base Price (₪):'}
                </label>
                <input 
                  type="number" 
                  required
                  value={customServicePrice}
                  onChange={(e) => setCustomServicePrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-mono text-xs transition-colors"
                />
              </div>

              <button
                onClick={async () => {
                  if (!customServiceNameAr.trim() || !customServiceNameEn.trim() || !customServiceDescAr.trim() || !customServiceDescEn.trim()) {
                    triggerToast(lang === 'ar' ? 'الرجاء تعبئة جميع الحقول!' : 'Please fill all fields!', 'warning');
                    return;
                  }
                  const newServiceId = `custom_${Date.now()}`;
                  const newService = {
                    id: newServiceId,
                    name: customServiceNameEn,
                    arName: customServiceNameAr,
                    description: customServiceDescEn,
                    arDescription: customServiceDescAr,
                    icon: 'wrench',
                    basePrice: customServicePrice
                  };
                  await setDoc(doc(db, "services", newServiceId), newService);
                  setShowCustomServiceModal(false);
                  setCustomServiceNameAr('');
                  setCustomServiceNameEn('');
                  setCustomServiceDescAr('');
                  setCustomServiceDescEn('');
                  setCustomServicePrice(150);
                  triggerToast(lang === 'ar' ? 'تم إضافة الخدمة المخصصة بنجاح!' : 'Custom service added successfully!', 'success');
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ وتفعيل الخدمة' : 'Save & Publish Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0B10]/95 backdrop-blur-md border-t border-gray-800/80 flex items-center justify-around py-3 pb-safe md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.8)] select-none">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'home' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'services' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Wrench className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'الخدمات' : 'Services'}</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('simulator');
          }}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'simulator' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Activity className="w-5 h-5 animate-pulse shrink-0" />
          <span>{lang === 'ar' ? 'الخدمة' : 'Simulator'}</span>
        </button>

        <button 
          onClick={() => setActiveTab('admin')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'admin' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Lock className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'الإدارة' : 'Admin'}</span>
        </button>
      </div>

    </div>
  );
}

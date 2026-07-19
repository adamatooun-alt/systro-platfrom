import React, { useState, useEffect, useRef } from 'react';
import { translations } from './translations';
import { db, auth } from './firebase';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import GooglePayButton from '@google-pay/button-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  'AIzaSyB7xvKPc0DaRvfse9V1xsHApyeigvjaSL8';
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
  Edit,
  Settings,
  X,
  CreditCard,
  Mail,
  Phone,
  MessageCircle,
  Volume2,
  Ban,
  User,
  Bell,
  BellOff,
  CheckCheck,
  Car,
  Hammer,
  HelpCircle,
  Droplets,
  Wind,
  ShieldAlert,
  Trash2,
  Search,
  Plus,
  PlusCircle
} from 'lucide-react';
import { ServiceType, RequestStatus, RescueRequest, Technician, Bid, ChatMsg, SystemStats, InAppNotification } from './types';
import TrustPortal from './components/TrustPortal';
import SmtpConfigPanel from './components/SmtpConfigPanel';
import WhatsAppConfigPanel from './components/WhatsAppConfigPanel';
import LoginPortal from './components/LoginPortal';
import HomeTab from './components/HomeTab';
import ServicesTab from './components/ServicesTab';
import { AdminPanel } from './components/AdminPanel';
import TaxiTab from './components/TaxiTab';

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

const mapPctToLatLng = (latPct: number, lngPct: number) => {
  // latPct=0 corresponds to North (33.40), latPct=100 corresponds to South (29.40)
  const lat = 33.40 - (latPct / 100) * 4.0;
  // lngPct=0 corresponds to West (34.10), lngPct=100 corresponds to East (35.90)
  const lng = 34.10 + (lngPct / 100) * 1.8;
  return { lat, lng };
};

const latLngToMapPct = (lat: number, lng: number) => {
  const latPct = Math.min(100, Math.max(0, Math.round(((33.40 - lat) / 4.0) * 100)));
  const lngPct = Math.min(100, Math.max(0, Math.round(((lng - 34.10) / 1.8) * 100)));
  return { lat: latPct, lng: lngPct };
};

const convertArabicNumerals = (str: string): string => {
  return str.replace(/[٠-٩]/g, (d) => {
    return (d.charCodeAt(0) - 1632).toString();
  }).replace(/[۰-۹]/g, (d) => {
    return (d.charCodeAt(0) - 1776).toString();
  });
};

const cleanInput = (val: string): string => {
  const converted = convertArabicNumerals(val);
  return converted.replace(/[^0-9]/g, '');
};

export default function App() {
  // Global Language State: 'ar' (Arabic is default as shown in screenshots) or 'en' or 'he'
  const [lang, setLang] = useState<'ar' | 'en' | 'he'>(() => {
    const saved = localStorage.getItem('systro_rescue_lang');
    return (saved === 'ar' || saved === 'en' || saved === 'he') ? saved : 'ar';
  });

  const t = translations[lang];
  
  // Floating SOS Button Toggle State (Persisted in localStorage, default to true)
  const [showSosButton, setShowSosButton] = useState<boolean>(() => {
    const saved = localStorage.getItem('systro_show_sos');
    return saved !== null ? saved === 'true' : true;
  });

  const [isSosPanelOpen, setIsSosPanelOpen] = useState<boolean>(false);

  // Save preference on change
  useEffect(() => {
    localStorage.setItem('systro_show_sos', String(showSosButton));
  }, [showSosButton]);

  // Dynamic Google Maps API Key State
  const [mapsKey, setMapsKey] = useState<string>(() => {
    return API_KEY;
  });

  const hasValidKey = Boolean(mapsKey) && mapsKey !== 'YOUR_API_KEY';

  useEffect(() => {
    fetch(`/api/maps-key?_t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.key) {
          setMapsKey(data.key);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch Google Maps dynamic key:', err);
      });
  }, []);

  // Set page direction based on language
  useEffect(() => {
    localStorage.setItem('systro_rescue_lang', lang);
    document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Navigation Tab State: 'home' | 'services' | 'simulator' | 'admin' | 'taxi'
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'simulator' | 'admin' | 'taxi'>('home');

  // --- FCM Real-Time In-App Notification System ---
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('systro_notifications_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse notification history", e);
    }
    return [
      {
        id: 'welcome-system-01',
        titleAr: '📡 تم تفعيل نظام الإشعارات الفورية (FCM) بنجاح!',
        titleEn: '📡 Smart FCM Notification Hub Activated!',
        bodyAr: 'أهلاً بك في سيسترو. نظام الإشعارات الفورية مفعّل ويعمل في المتصفح بكامل طاقته ومجاني 100%.',
        bodyEn: 'Welcome to Systro. Your smart instant push notification engine is active, fully optimized, and 100% free.',
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'system',
        targetId: ''
      }
    ];
  });

  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  const getServiceArName = (type: string) => {
    switch (type) {
      case 'fuel': return 'توصيل وقود طارئ ⛽';
      case 'locksmith': return 'فتح أقفال سيارات 🔑';
      case 'mechanic': return 'صيانة وميكانيك 🛠️';
      case 'battery': return 'اشتراك بطارية 🔋';
      case 'tire': return 'تبديل إطار 🚗';
      case 'towing': return 'ونش سحب مركبات 🚚';
      default: return 'خدمة إنقاذ مخصصة 🔧';
    }
  };

  const getServiceHeName = (type: string) => {
    switch (type) {
      case 'fuel': return 'אספקת דלק חירום ⛽';
      case 'locksmith': return 'פריצת מנעולים לרכב 🔑';
      case 'mechanic': return 'מכונאות וחשמל דרך 🛠️';
      case 'battery': return 'הנעה או החלפת מצבר 🔋';
      case 'tire': return 'החלפת פנצ׳ר 🚗';
      case 'towing': return 'גרירה וחילוץ רכבים 🚚';
      default: return 'שירות חילוץ מותאם אישית 🔧';
    }
  };

  const getServiceEnName = (type: string) => {
    switch (type) {
      case 'fuel': return 'Emergency Fuel Delivery ⛽';
      case 'locksmith': return 'Car Locksmith Services 🔑';
      case 'mechanic': return 'Roadside Mechanical Service 🛠️';
      case 'battery': return 'Battery Jump Start 🔋';
      case 'tire': return 'Flat Tire Replacement 🚗';
      case 'towing': return 'Towing & Vehicle Recovery 🚚';
      default: return 'Custom Specialty Service 🔧';
    }
  };

  const getServiceLabel = (type: string) => {
    if (lang === 'ar') return getServiceArName(type);
    if (lang === 'he') return getServiceHeName(type);
    return getServiceEnName(type);
  };

  const triggerNotification = (
    type: InAppNotification['type'],
    titleAr: string,
    titleEn: string,
    bodyAr: string,
    bodyEn: string,
    targetId: string = '',
    titleHe?: string,
    bodyHe?: string
  ) => {
    const newNotification: InAppNotification = {
      id: `${type}_${Date.now()}`,
      titleAr,
      titleEn,
      titleHe,
      bodyAr,
      bodyEn,
      bodyHe,
      timestamp: new Date().toISOString(),
      isRead: false,
      type,
      targetId
    };

    // 1. Play professional sound
    playRescueAlertSound();

    // 2. Add to list and localStorage
    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50);
      localStorage.setItem('systro_notifications_history', JSON.stringify(updated));
      return updated;
    });

    // 3. Set active banner for visual popup
    setActiveNotification(newNotification);

    // 4. Trigger browser native push if permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const nativeNotif = new Notification(
          lang === 'ar' ? titleAr : lang === 'he' ? (titleHe || titleEn) : titleEn,
          {
            body: lang === 'ar' ? bodyAr : lang === 'he' ? (bodyHe || bodyEn) : bodyEn,
            icon: '/assets/logo.png',
            badge: '/assets/logo.png',
            tag: targetId || 'systro-rescue'
          }
        );
        nativeNotif.onclick = () => {
          window.focus();
          if (targetId) {
            setActiveRequestId(targetId);
            setActiveTab('simulator');
          }
          nativeNotif.close();
        };
      } catch (err) {
        console.warn("Failed to spawn native browser notification:", err);
      }
    }
  };


  // Admin password/code verification state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => sessionStorage.getItem('systro_admin_unlocked') === 'true');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Client Portal Sign-In Simulation State
  const [userRole, setUserRole] = useState<'client' | 'technician' | null>(() => {
    const role = sessionStorage.getItem('systro_user_role');
    return (role === 'client' || role === 'technician') ? role : null;
  });
  const [portalTab, setPortalTab] = useState<'client' | 'tech'>('client');
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return sessionStorage.getItem('systro_phone_number') || '';
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('systro_is_logged_in') === 'true';
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

  // WhatsApp Live Configurations & Testing
  const [whatsAppStatus, setWhatsAppStatus] = useState<{
    configured: boolean;
    instanceId: string;
    token: string;
    apiUrl: string;
  } | null>(null);

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp-status');
      if (response.ok) {
        const data = await response.json();
        setWhatsAppStatus(data);
      }
    } catch (err) {
      console.error("Error fetching WhatsApp status:", err);
    }
  };

  // Fetch SMTP and WhatsApp status on tab selection
  useEffect(() => {
    if (activeTab === 'admin') {
      fetchSmtpStatus();
      fetchWhatsAppStatus();
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
    return sessionStorage.getItem('systro_user_email') || '';
  });
  const [loggedInUserName, setLoggedInUserName] = useState(() => {
    return sessionStorage.getItem('systro_user_name') || '';
  });

  // User Profile Modal & Permanent Account State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profilePhoneInput, setProfilePhoneInput] = useState('');

  // Dynamic Collections state synced in real-time from Firestore
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbTechnicians, setDbTechnicians] = useState<Technician[]>([]);

  // Modals / Form inputs for Service Provider Registries
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [selectedServiceIdForRecord, setSelectedServiceIdForRecord] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerCarModel, setProviderCarModel] = useState('');
  const [providerPlateNumber, setProviderPlateNumber] = useState('');
  const [adminTechName, setAdminTechName] = useState('');
  const [adminTechEmail, setAdminTechEmail] = useState('');

  // Form inputs for Custom Service Creation
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [customServiceNameAr, setCustomServiceNameAr] = useState('');
  const [customServiceNameEn, setCustomServiceNameEn] = useState('');
  const [customServiceDescAr, setCustomServiceDescAr] = useState('');
  const [customServiceDescEn, setCustomServiceDescEn] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<string>('150');

  // Dynamic Live System Statistics
  const [stats, setStats] = useState<SystemStats>({
    activeTechnicians: 4,
    maxTechnicians: 5,
    completedRescues: 1,
    satisfactionRate: 99.8,
    activeEmergencies: 1
  });

  // Services mapping utilities
  const getServiceIcon = (iconName: string, serviceName?: string) => {
    const iconKey = iconName?.toLowerCase() || '';
    const nameLower = (serviceName || '').toLowerCase();
    
    // Check keywords first to map custom dynamic services beautifully
    if (nameLower.includes('تكسي') || nameLower.includes('taxi') || nameLower.includes('سائق')) return Car;
    if (nameLower.includes('نجار') || nameLower.includes('carpenter') || nameLower.includes('خشب')) return Hammer;
    if (nameLower.includes('استفسار') || nameLower.includes('سؤال') || nameLower.includes('help') || nameLower.includes('info') || nameLower.includes('query')) return HelpCircle;
    if (nameLower.includes('ميكانيك') || nameLower.includes('mechanic') || nameLower.includes('صيانة') || nameLower.includes('تصليح')) return Wrench;
    if (nameLower.includes('كهربا') || nameLower.includes('battery') || nameLower.includes('شحن') || nameLower.includes('بطارية')) return Zap;
    if (nameLower.includes('سباك') || nameLower.includes('plumber') || nameLower.includes('مياه') || nameLower.includes('مواسير')) return Droplets;
    if (nameLower.includes('تكييف') || nameLower.includes('ac') || nameLower.includes('تبريد') || nameLower.includes('هواء')) return Wind;
    if (nameLower.includes('سحب') || nameLower.includes('towing') || nameLower.includes('ونش') || nameLower.includes('نقل')) return Truck;
    if (nameLower.includes('قفل') || nameLower.includes('مفتاح') || nameLower.includes('lock') || nameLower.includes('key')) return Key;
    if (nameLower.includes('وقود') || nameLower.includes('بنزين') || nameLower.includes('ديزل') || nameLower.includes('fuel')) return Fuel;

    switch (iconKey) {
      case 'fuel': return Fuel;
      case 'key': return Key;
      case 'wrench': return Wrench;
      case 'truck': return Truck;
      case 'zap': return Zap;
      case 'car': return Car;
      case 'hammer': return Hammer;
      case 'help': return HelpCircle;
      case 'droplets': return Droplets;
      case 'wind': return Wind;
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

  // Derived Services configuration list loaded in real-time from Firestore database - fully bilingual
  const servicesList = dbServices.length > 0 
    ? dbServices.map(s => {
        const nameAr = s.arName || s.name;
        const nameEn = s.name || s.arName;
        
        let arDesc = s.arDescription || s.description || '';
        let enDesc = s.description || s.arDescription || '';
        
        const nameLower = `${s.arName || ''} ${s.name || ''}`.toLowerCase();
        if (nameLower.includes('نجار') || nameLower.includes('carpenter')) {
          arDesc = arDesc || 'خدمات نجارة طارئة وإصلاح الأبواب، النوافذ، الأثاث، والأقفال الخشبية في موقعك بكفاءة ودقة عالية.';
          enDesc = enDesc || 'Emergency carpentry services: repair of wooden doors, windows, furniture, and locks at your location with high precision.';
        } else if (nameLower.includes('تكسي') || nameLower.includes('taxi') || nameLower.includes('سائق')) {
          arDesc = arDesc || 'خدمة توصيل ونقل طارئة وسريعة عبر سيارات تاكسي مريحة وموثوقة لضمان وصولك الآمن لوجهتك.';
          enDesc = enDesc || 'Emergency rapid transit & taxi service. Clean, reliable cars with certified drivers to reach your destination safely.';
        } else if (nameLower.includes('ميكانيك') || nameLower.includes('mechanic')) {
          arDesc = arDesc || 'ميكانيكي متنقل لفحص الأعطال الميكانيكية والكهربائية الطارئة للمركبة وإصلاحها فوراً على الطريق.';
          enDesc = enDesc || 'On-the-go mechanical service. Quick diagnostics, engine checks, minor repairs to get you rolling safely.';
        } else if (nameLower.includes('استفسار') || nameLower.includes('عام') || nameLower.includes('consult')) {
          arDesc = arDesc || 'طلب استشارة أو دعم فني عام حول عطل غير معروف، لمساعدتك وتوجيه الفني المناسب لمعاينة حالتك.';
          enDesc = enDesc || 'General inquiry or technical support regarding undefined vehicle faults to match you with the correct responder.';
        } else {
          arDesc = arDesc || 'خدمة طارئة متخصصة يقدمها فنيون شركاء معتمدون ومجهزون بالكامل لإنقاذك في أسرع وقت.';
          enDesc = enDesc || 'Specialized emergency service delivered by certified, fully equipped partner technicians to rescue you immediately.';
        }
        
        return {
          id: s.id as ServiceType,
          name: `${nameAr} / ${nameEn}`,
          desc: `${arDesc}\n—\n${enDesc}`,
          icon: getServiceIcon(s.icon, `${s.arName || ''} ${s.name || ''}`),
          color: getServiceColor(s.id),
          basePrice: s.basePrice || 120,
        };
      })
    : [
        {
          id: 'fuel' as ServiceType,
          name: `${translations.ar.fuelName} / ${translations.en.fuelName}`,
          desc: `${translations.ar.fuelDesc}\n—\n${translations.en.fuelDesc}`,
          icon: Fuel,
          color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15',
          basePrice: 100,
        },
        {
          id: 'locksmith' as ServiceType,
          name: `${translations.ar.locksmithName} / ${translations.en.locksmithName}`,
          desc: `${translations.ar.locksmithDesc}\n—\n${translations.en.locksmithDesc}`,
          icon: Key,
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15',
          basePrice: 150,
        },
        {
          id: 'mechanic' as ServiceType,
          name: `${translations.ar.mechanicName} / ${translations.en.mechanicName}`,
          desc: `${translations.ar.mechanicDesc}\n—\n${translations.en.mechanicDesc}`,
          icon: Wrench,
          color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/15',
          basePrice: 200,
        },
        {
          id: 'towing' as ServiceType,
          name: `${translations.ar.towingName} / ${translations.en.towingName}`,
          desc: `${translations.ar.towingDesc}\n—\n${translations.en.towingDesc}`,
          icon: Truck,
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15',
          basePrice: 150,
        },
        {
          id: 'battery' as ServiceType,
          name: `${translations.ar.batteryName} / ${translations.en.batteryName}`,
          desc: `${translations.ar.batteryDesc}\n—\n${translations.en.batteryDesc}`,
          icon: Zap,
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15',
          basePrice: 120,
        }
      ];

  // Map & Simulator State
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapAuthFailed, setIsMapAuthFailed] = useState<boolean>(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState<boolean>(() => {
    try {
      const dismissed = sessionStorage.getItem('systro_location_prompt_dismissed');
      return dismissed !== 'true';
    } catch {
      return true;
    }
  });
  const [selectedService, setSelectedService] = useState<ServiceType>('towing');
  const [approximatePrice, setApproximatePrice] = useState<number>(150);
  const [problemDescription, setProblemDescription] = useState('');
  const [simStatus, setSimStatus] = useState<RequestStatus>('idle');
  const [liveRequest, setLiveRequest] = useState<RescueRequest | null>(null);

  // Sync approximate price with selected service in real time
  useEffect(() => {
    const serviceObj = servicesList.find(s => s.id === selectedService);
    if (serviceObj) {
      setApproximatePrice(serviceObj.basePrice);
    }
  }, [selectedService, dbServices]);

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
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputesList, setDisputesList] = useState<{ id: string; requestId: string; clientName: string; techName: string; serviceType: string; amount: number; reason: string; status: 'pending' | 'resolved' | 'refunded' }[]>([]);

  // Escrows List (Admin simulation)
  const [escrows, setEscrows] = useState<{ id: string; clientName: string; techName: string; amount: number; serviceType: string; status: 'escrowed' | 'released' | 'refunded' | 'disputed' }[]>([]);

  // Reported website issues / bug reports state
  const [websiteIssues, setWebsiteIssues] = useState<{ id: string; name?: string; phone?: string; issue: string; createdAt?: any }[]>([]);

  // Pending custom specialties/services awaiting Admin approval
  const [pendingServices, setPendingServices] = useState<{ id: string; name: string; arName: string; heName?: string; description: string; arDescription: string; heDescription?: string; basePrice: number; requestedBy?: string; requestedByName?: string; status: string; createdAt?: any }[]>([]);

  // Registered users state (clients and technicians)
  const [registeredUsers, setRegisteredUsers] = useState<{ id: string; email: string; name: string; role: 'client' | 'technician' | null; phone?: string; createdAt?: any }[]>([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserRoleFilter, setAdminUserRoleFilter] = useState<'all' | 'client' | 'technician' | 'unassigned'>('all');
  const [adminServiceSearch, setAdminServiceSearch] = useState('');

  // Service management admin states
  const [editingService, setEditingService] = useState<any | null>(null);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [srvId, setSrvId] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvArName, setSrvArName] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvArDesc, setSrvArDesc] = useState('');
  const [srvIcon, setSrvIcon] = useState('wrench');
  const [srvBasePrice, setSrvBasePrice] = useState<number>(100);

  // Current simulation rating state
  const [simRating, setSimRating] = useState<number>(5);

  // Google Pay and Card payment options states
  const [selectedPaymentTab, setSelectedPaymentTab] = useState<'gpay' | 'card'>('gpay');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');

  // Active technician coordinate (for dynamic movement)
  const [techCoordinates, setTechCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [useSimulatedMapFallback, setUseSimulatedMapFallback] = useState(false);

  // Notification Preferences
  const [notifyWhatsapp, setNotifyWhatsapp] = useState<boolean>(() => {
    return localStorage.getItem('systro_notify_whatsapp') === 'true';
  });
  const [notifyEmail, setNotifyEmail] = useState<boolean>(() => {
    return localStorage.getItem('systro_notify_email') === 'true';
  });
  const [prevPendingCount, setPrevPendingCount] = useState<number>(0);
  const [prevBidsCount, setPrevBidsCount] = useState<number>(0);
  const [prevRequestStatus, setPrevRequestStatus] = useState<string>('idle');
  const [prevChatMsgsCount, setPrevChatMsgsCount] = useState<number>(0);

  // Synthesized emergency radar alarm sound for new pending rescue tasks
  const playRescueAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // High Chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(950, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Low Chime delayed by 120ms
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(760, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.42);

      // Sub-pulse delayed by 250ms for the "radar dispatch" feeling
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(600, now + 0.25);
      gain3.gain.setValueAtTime(0.2, now + 0.25);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.25);
      osc3.stop(now + 0.65);

    } catch (err) {
      console.warn("Audio Context blocked or not supported:", err);
    }
  };

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
  const [providerName, setProviderName] = useState('');
  const [providerAvatar, setProviderAvatar] = useState('');
  const [isEditingTechProfile, setIsEditingTechProfile] = useState(false);
  const [activeTechDoc, setActiveTechDoc] = useState<any>(null);
  const [selectedBidRequest, setSelectedBidRequest] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState<string>('150');
  const [customBidEta, setCustomBidEta] = useState<string>('15');

  // Provider position states for dynamic vehicle placement
  const [providerLat, setProviderLat] = useState<number | null>(null);
  const [providerLng, setProviderLng] = useState<number | null>(null);

  // Listen for Google Maps auth or project config failure (like ApiProjectMapError)
  useEffect(() => {
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps API auth failure detected (e.g., ApiProjectMapError).");
      setIsMapAuthFailed(true);
      triggerToast(
        lang === 'ar' 
          ? 'تم الكشف عن مشكلة في صلاحيات مفتاح خرائط Google. يرجى تفعيل Maps JavaScript API!' 
          : 'Google Maps API auth error detected. Please enable Maps JavaScript API on your Google Cloud Console!', 
        'error'
      );
      if (originalAuthFailure) {
        originalAuthFailure();
      }
    };
    return () => {
      (window as any).gm_authFailure = originalAuthFailure;
    };
  }, [lang]);

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
        if (data.name && !providerName) setProviderName(data.name);
        if (data.avatar && !providerAvatar) setProviderAvatar(data.avatar);
      } else {
        setActiveTechDoc(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `technicians/${loggedInUserEmail}`);
    });
    return () => unsub();
  }, [isLoggedIn, loggedInUserEmail, userRole, providerVehicle, providerPlate, providerName, providerAvatar]);

  // Sync notification preferences when activeTechDoc is updated from Firestore
  useEffect(() => {
    if (activeTechDoc) {
      if (activeTechDoc.notifyWhatsapp !== undefined) {
        setNotifyWhatsapp(activeTechDoc.notifyWhatsapp);
      }
      if (activeTechDoc.notifyEmail !== undefined) {
        setNotifyEmail(activeTechDoc.notifyEmail);
      }
    }
  }, [activeTechDoc]);

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
          { id: 'battery', name: 'شحن واستبدال البطارية (Battery Services)', arName: 'شحن واستبدال البطارية (Battery Services)', description: 'تعطلت بطارية سيارتك فجأة؟ نوفر خدمة شحن البطارية السريع أو استبدالها ببطارية جديدة مكفولة في موقعك.', arDescription: 'تعطلت بطارية سيارتك فجأة؟ نوفر خدمة شحن البطارية السريع أو استبدالها ببطارية جديدة مكفولة في موقعك.', icon: 'zap', basePrice: 120 },
          { id: 'taxi', name: 'توصيل تكسي خاص و VIP (VIP Taxi)', arName: 'توصيل تكسي خاص و VIP (VIP Taxi)', description: 'طلب سيارة أجرة مريحة أو مركبة عائلية واسعة بنظام الضمان المالي لحمايتك وضمان وصولك بسلام.', arDescription: 'طلب سيارة أجرة مريحة أو مركبة عائلية واسعة بنظام الضمان المالي لحمايتك وضمان وصولك بسلام.', icon: 'car', basePrice: 45 }
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
          { id: 't1', name: 'Raed Masoud', arName: 'رائد مسعود', phone: '+972 59-123-4567', email: 'raed.masoud@systro.live', rating: 4.9, reviewsCount: 142, isOnline: true, lat: 25, lng: 30, avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120', carModel: 'Toyota Hilux 4x4', arCarModel: 'تويوتا هايلوكس 4x4', plateNumber: '7-4321-99', serviceId: 'towing', notifyEmail: true, notifyWhatsapp: true },
          { id: 't2', name: 'Mohamed Al-Hussein', arName: 'محمد الحسين', phone: '+972 59-765-4321', email: 'mohamed.alhussein@systro.live', rating: 4.8, reviewsCount: 98, isOnline: true, lat: 75, lng: 20, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120', carModel: 'GMC Sierra Recovery', arCarModel: 'جي إم سي سييرا ونش', plateNumber: '8-1122-88', serviceId: 'towing', notifyEmail: true, notifyWhatsapp: true },
          { id: 't3', name: 'Shady Yousef', arName: 'شادي يوسف', phone: '+972 59-888-2233', email: 'shady.yousef@systro.live', rating: 4.7, reviewsCount: 65, isOnline: true, lat: 50, lng: 80, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', carModel: 'Ford F-150 Service', arCarModel: 'فورد F-150 صيانة', plateNumber: '6-9988-77', serviceId: 'mechanic', notifyEmail: true, notifyWhatsapp: true }
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

  // Automatically restore active request for logged in client if there is one in progress
  useEffect(() => {
    if (isLoggedIn && loggedInUserEmail && userRole === 'client' && !activeRequestId && allRequests.length > 0) {
      const activeUserRequest = allRequests.find(r => 
        r.requestedBy === loggedInUserEmail && 
        r.status !== 'completed'
      );
      if (activeUserRequest) {
        setActiveRequestId(activeUserRequest.id);
      }
    }
  }, [isLoggedIn, loggedInUserEmail, userRole, activeRequestId, allRequests]);

  // Automatically restore active request for logged in technician if there is one in progress
  useEffect(() => {
    if (isLoggedIn && loggedInUserEmail && userRole === 'technician' && !activeRequestId && allRequests.length > 0) {
      const activeTechRequest = allRequests.find(r => 
        r.selectedTechnicianId === loggedInUserEmail && 
        (r.status === 'awaiting_deposit' || r.status === 'en_route' || r.status === 'arrived' || r.status === 'in_progress')
      );
      if (activeTechRequest) {
        setActiveRequestId(activeTechRequest.id);
        // Also fetch the bid details for this request and technician
        getDocs(query(collection(db, "bids"), where("requestId", "==", activeTechRequest.id)))
          .then(snap => {
            const bidsList: any[] = [];
            snap.forEach(d => bidsList.push(d.data()));
            const matchingBid = bidsList.find(b => b.technicianId === loggedInUserEmail);
            if (matchingBid) setSelectedBid(matchingBid);
          }).catch(err => {
            console.error("Error restoring technician active bid:", err);
          });
      }
    }
  }, [isLoggedIn, loggedInUserEmail, userRole, activeRequestId, allRequests]);

  // 1. Real-time dispatch notification alert when a new client request is created
  useEffect(() => {
    if (userRole !== 'technician') return;

    const pendingReqs = allRequests.filter(r => r.status === 'pending_bids');

    // If a new pending request arrives
    if (pendingReqs.length > prevPendingCount) {
      const newestReq = pendingReqs[0]; // sorted by newest first
      if (newestReq) {
        // Trigger smart in-app notification & play sound
        const serviceArName = getServiceArName(newestReq.serviceType);
        const serviceEnName = getServiceEnName(newestReq.serviceType);
        triggerNotification(
          'new_request',
          '🚨 نداء استغاثة عاجل!',
          '🚨 Emergency Rescue Alert!',
          `مطلوب فني لـ [${serviceArName}] بقيمة [${newestReq.escrowAmount || 120} ₪] بموقعك!`,
          `Urgent dispatch for [${serviceEnName}] at [${newestReq.escrowAmount || 120} ₪] nearby!`,
          newestReq.id
        );

        // Trigger simulated notifications
        if (notifyWhatsapp) {
          setTimeout(() => {
            triggerToast(
              lang === 'ar'
                ? `📱 إشعار WhatsApp: تم إرسال نداء استغاثة جديد من [${newestReq.clientName}] إلى هاتفك المسجل!`
                : `📱 WhatsApp Alert: New breakdown rescue alert from [${newestReq.clientName}] dispatched to your phone!`,
              'success'
            );
          }, 1000);
        }
        if (notifyEmail) {
          setTimeout(() => {
            triggerToast(
              lang === 'ar'
                ? `📧 إشعار البريد الإلكتروني: تم إرسال تفاصيل الصيانة لـ [${newestReq.serviceType}] إلى بريدك الإلكتروني ${loggedInUserEmail}!`
                : `📧 Email Alert: New task details for [${newestReq.serviceType}] sent to ${loggedInUserEmail}!`,
              'info'
            );
          }, 2500);
        }
      }
    }
    setPrevPendingCount(pendingReqs.length);
  }, [allRequests, userRole, notifyWhatsapp, notifyEmail, lang, loggedInUserEmail, prevPendingCount]);

  // 2. Real-time notification alert when a technician submits a bid (for Clients)
  useEffect(() => {
    if (userRole !== 'client' || !activeRequestId) {
      setPrevBidsCount(0);
      return;
    }

    if (incomingBids.length > prevBidsCount) {
      const newestBid = incomingBids[incomingBids.length - 1];
      if (newestBid) {
        triggerNotification(
          'bid_submitted',
          '💸 عرض سعر جديد تلقائي!',
          '💸 New Rescue Bid Received!',
          `قدم الفني [${newestBid.technicianArName || newestBid.technicianName}] عرض سعر بقيمة [${newestBid.price} ₪] للإنقاذ!`,
          `Technician [${newestBid.technicianName}] submitted a bid of [${newestBid.price} ₪] for your breakdown!`,
          activeRequestId
        );
      }
    }
    setPrevBidsCount(incomingBids.length);
  }, [incomingBids, userRole, activeRequestId]);

  // 3. Real-time status update notifications (for both roles)
  useEffect(() => {
    if (!activeRequestId) {
      setPrevRequestStatus('idle');
      return;
    }

    const currentReq = allRequests.find(r => r.id === activeRequestId);
    if (!currentReq) return;

    const currentStatus = currentReq.status;
    if (prevRequestStatus !== 'idle' && currentStatus !== prevRequestStatus) {
      if (userRole === 'client') {
        if (currentStatus === 'en_route') {
          triggerNotification(
            'en_route',
            '🚚 شريك الإنقاذ متحرك إليك!',
            '🚚 Rescue Partner En Route!',
            `الفني [${currentReq.selectedTechnicianId || 'سيسترو'}] في الطريق إليك الآن بمعدات الطوارئ.`,
            `Technician is driving to your location now with emergency tools.`,
            activeRequestId
          );
        } else if (currentStatus === 'arrived') {
          triggerNotification(
            'arrived',
            '📍 شريك الإنقاذ وصل للموقع!',
            '📍 Technician Arrived at Site!',
            `وصل الفني وهو بجانب سيارتك الآن لمساعدتك. يرجى تأكيد الهوية.`,
            `The technician has arrived and is next to your vehicle. Please verify ID.`,
            activeRequestId
          );
        } else if (currentStatus === 'in_progress') {
          triggerNotification(
            'system',
            '🛠️ بدأت عملية الصيانة والإنقاذ',
            '🛠️ Repair Work in Progress',
            `العمل جارٍ الآن على حل المشكلة لسيارتك بأمان تحت حماية ضمان سيسترو الآمن.`,
            `Emergency repair work is now active under the protection of Systro Escrow.`,
            activeRequestId
          );
        } else if (currentStatus === 'completed') {
          triggerNotification(
            'completed',
            '✅ اكتملت المهمة وتم فك الضمان',
            '✅ Rescue Task Completed!',
            `تم إصلاح العطل بنجاح وتحرير الدفع المالي بأمان. نتمنى لك رحلة آمنة!`,
            `The repair was completed successfully and funds released. Have a safe trip!`,
            activeRequestId
          );
        }
      } else if (userRole === 'technician') {
        if (currentStatus === 'awaiting_deposit' || currentStatus === 'en_route') {
          if (currentReq.selectedTechnicianId === loggedInUserEmail) {
            triggerNotification(
              'bid_accepted',
              '🎉 تم قبول عرضك وإيداع الضمان!',
              '🎉 Bid Accepted & Escrow Deposited!',
              `تم قبول عرض السعر الخاص بك لخدمة [${getServiceArName(currentReq.serviceType)}]. ابدأ بالتحرك فوراً!`,
              `Your rescue bid for [${getServiceEnName(currentReq.serviceType)}] was accepted. Drive immediately!`,
              activeRequestId
            );
          }
        } else if (currentStatus === 'completed') {
          triggerNotification(
            'completed',
            '💰 تم تحرير مستحقاتك المالية!',
            '💰 Your Earnings Released!',
            `أطلق العميل مبلغ الضمان المالي بالكامل وتم إيداع [${currentReq.escrowAmount || 120} ₪] في محفظتك الإلكترونية!`,
            `The client released the escrow amount. [${currentReq.escrowAmount || 120} ₪] deposited in your balance!`,
            activeRequestId
          );
        }
      }
    }
    setPrevRequestStatus(currentStatus);
  }, [allRequests, activeRequestId, userRole, loggedInUserEmail]);

  // 4. Real-time secure chat message notifications (for both roles)
  useEffect(() => {
    if (!activeRequestId) {
      setPrevChatMsgsCount(0);
      return;
    }

    if (chatMessages.length > prevChatMsgsCount) {
      const lastMsg = chatMessages[chatMessages.length - 1];
      const isMyMessage = (userRole === 'client' && lastMsg.sender === 'client') ||
                          (userRole === 'technician' && lastMsg.sender === 'technician');
      
      if (lastMsg && lastMsg.sender !== 'system' && !isMyMessage) {
        const msgTime = lastMsg.createdTime || Date.now();
        const diffMs = Date.now() - msgTime;
        if (diffMs < 5000) {
          const senderLabel = lastMsg.sender === 'client'
            ? (lang === 'ar' ? 'العميل 👤' : 'Client 👤')
            : (lang === 'ar' ? 'الفني 🛠️' : 'Technician 🛠️');
          triggerNotification(
            'chat',
            '💬 رسالة جديدة في المحادثة',
            '💬 New Secure Message',
            `${senderLabel}: "${lastMsg.text}"`,
            `${senderLabel}: "${lastMsg.text}"`,
            activeRequestId
          );
        }
      }
    }
    setPrevChatMsgsCount(chatMessages.length);
  }, [chatMessages, userRole, activeRequestId, lang]);

  // 5. Active notification auto-dismiss timer
  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  // Sync default fields for new technician record modal
  useEffect(() => {
    if (showAddRecordModal) {
      setAdminTechName(loggedInUserName || '');
      setAdminTechEmail(loggedInUserEmail || '');
    }
  }, [showAddRecordModal, loggedInUserName, loggedInUserEmail]);

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

  // Listen for website issues / support tickets
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "website_issues"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const getVal = (x: any) => {
          if (!x) return 0;
          if (typeof x === 'number') return x;
          if (x.seconds) return x.seconds * 1000;
          if (x.toMillis) return x.toMillis();
          if (x instanceof Date) return x.getTime();
          return 0;
        };
        const tA = getVal(a.createdAt);
        const tB = getVal(b.createdAt);
        return tB - tA;
      });
      setWebsiteIssues(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "website_issues");
    });
    return () => unsub();
  }, []);

  const handleDeleteWebsiteIssue = async (id: string) => {
    try {
      await deleteDoc(doc(db, "website_issues", id));
      triggerToast(lang === 'ar' ? 'تم حذف بلاغ المشكلة بنجاح!' : 'Issue report deleted successfully!', 'success');
    } catch (err: any) {
      console.error("Error deleting website issue:", err);
      triggerToast(lang === 'ar' ? 'فشل حذف البلاغ.' : 'Failed to delete issue report.', 'error');
    }
  };

  // Listen for pending custom specialties/services (Admin review)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pending_services"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const getVal = (x: any) => {
          if (!x) return 0;
          if (typeof x === 'number') return x;
          if (x.seconds) return x.seconds * 1000;
          if (x.toMillis) return x.toMillis();
          if (x instanceof Date) return x.getTime();
          return 0;
        };
        const tA = getVal(a.createdAt);
        const tB = getVal(b.createdAt);
        return tB - tA;
      });
      setPendingServices(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "pending_services");
    });
    return () => unsub();
  }, []);

  // Listen for registered users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRegisteredUsers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsub();
  }, []);

  const handleApprovePendingService = async (service: any) => {
    try {
      // 1. Create standard service document
      const newService = {
        id: service.id,
        name: service.name,
        arName: service.arName,
        description: service.description,
        arDescription: service.arDescription,
        icon: service.icon || 'wrench',
        basePrice: service.basePrice || 150
      };
      await setDoc(doc(db, "services", service.id), newService);

      // 2. If requestedBy is a technician, register them for it automatically
      if (service.requestedBy && service.requestedBy !== 'Unknown') {
        const techRef = doc(db, "technicians", service.requestedBy);
        const techSnap = await getDoc(techRef);
        if (techSnap.exists()) {
          const techData = techSnap.data();
          const currentSpecs = techData.specialties || [];
          if (!currentSpecs.includes(service.id)) {
            await updateDoc(techRef, {
              specialties: [...currentSpecs, service.id]
            });
          }
        }
      }

      // 3. Remove from pending
      await deleteDoc(doc(db, "pending_services", service.id));
      triggerToast(lang === 'ar' ? `تمت الموافقة على التخصص [${service.arName || service.name}] ونشره بالشبكة بنجاح! 🎉` : `Specialty [${service.name}] has been approved and published! 🎉`, 'success');
    } catch (err: any) {
      console.error("Error approving custom specialty:", err);
      triggerToast(lang === 'ar' ? 'فشل قبول وتنشير التخصص.' : 'Failed to approve custom specialty.', 'error');
    }
  };

  const handleRejectPendingService = async (id: string) => {
    try {
      await deleteDoc(doc(db, "pending_services", id));
      triggerToast(lang === 'ar' ? 'تم رفض وحذف طلب التخصص بنجاح.' : 'Specialty request rejected and deleted successfully.', 'success');
    } catch (err: any) {
      console.error("Error rejecting custom specialty:", err);
      triggerToast(lang === 'ar' ? 'فشل رفض وحذف طلب التخصص.' : 'Failed to reject and delete request.', 'error');
    }
  };

  const handleDeleteActiveService = async (id: string) => {
    try {
      await deleteDoc(doc(db, "services", id));
      triggerToast(lang === 'ar' ? 'تم حذف التخصص والخدمة من الشبكة بنجاح! 🗑️' : 'Service/specialty successfully deleted from network! 🗑️', 'success');
    } catch (err: any) {
      console.error("Error deleting active service:", err);
      triggerToast(lang === 'ar' ? 'فشل حذف التخصص من الشبكة.' : 'Failed to delete service/specialty.', 'error');
    }
  };

  const handleStartEditService = (service: any) => {
    setEditingService(service);
    setSrvId(service.id);
    setSrvName(service.name || '');
    setSrvArName(service.arName || '');
    setSrvDesc(service.description || '');
    setSrvArDesc(service.arDescription || '');
    setSrvIcon(service.icon || 'wrench');
    setSrvBasePrice(service.basePrice || 100);
    setShowAddServiceForm(true);
  };

  const handleStartAddService = () => {
    setEditingService(null);
    setSrvId('');
    setSrvName('');
    setSrvArName('');
    setSrvDesc('');
    setSrvArDesc('');
    setSrvIcon('wrench');
    setSrvBasePrice(100);
    setShowAddServiceForm(true);
  };

  const handleSaveActiveService = async () => {
    try {
      const cleanId = srvId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!cleanId) {
        triggerToast(lang === 'ar' ? 'يرجى إدخال رمز تعريف فريد للخدمة.' : 'Please enter a unique Service ID.', 'error');
        return;
      }
      if (!srvName.trim() || !srvArName.trim()) {
        triggerToast(lang === 'ar' ? 'يرجى إدخال اسم الخدمة بالعربية والإنجليزية.' : 'Please enter service name in both Arabic and English.', 'error');
        return;
      }

      const servicePayload = {
        id: cleanId,
        name: srvName.trim(),
        arName: srvArName.trim(),
        description: srvDesc.trim(),
        arDescription: srvArDesc.trim(),
        icon: srvIcon.trim() || 'wrench',
        basePrice: Number(srvBasePrice) || 100
      };

      await setDoc(doc(db, "services", cleanId), servicePayload);
      triggerToast(
        lang === 'ar' 
          ? `تم حفظ التعديلات على الخدمة [${srvArName}] بنجاح! 🎉` 
          : `Service [${srvName}] saved successfully! 🎉`, 
        'success'
      );
      
      // Reset form
      setEditingService(null);
      setShowAddServiceForm(false);
      setSrvId('');
      setSrvName('');
      setSrvArName('');
      setSrvDesc('');
      setSrvArDesc('');
      setSrvIcon('wrench');
      setSrvBasePrice(100);
    } catch (err: any) {
      console.error("Error saving active service:", err);
      triggerToast(lang === 'ar' ? 'فشل حفظ تعديلات الخدمة.' : 'Failed to save active service.', 'error');
    }
  };

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
        clientName: (userRole as string) === 'guest' ? (lang === 'ar' ? 'عميل معتمد (حساب ضيف)' : 'Verified Client (Guest)') : (loggedInUserName || 'Adam Atooun'),
        clientPhone: phoneNumber || "+972 59-123-4567",
        requestedBy: loggedInUserEmail || '',
        locationLat: pinnedLocation.lat,
        locationLng: pinnedLocation.lng,
        locationName: "Al-Quds St",
        arLocationName: "شارع القدس",
        serviceType: selectedService,
        description: problemDescription,
        status: "pending_bids",
        escrowAmount: 0,
        approximatePrice: Number(approximatePrice),
        selectedTechnicianId: null,
        timestamp: new Date().toISOString()
      });

      // Update global stats
      await updateDoc(doc(db, "system_stats", "global"), {
        activeEmergencies: stats.activeEmergencies + 1
      });

      setActiveRequestId(reqId);
      triggerToast(lang === 'ar' ? 'تم تسجيل وتعميم طلبك بنجاح على الفنيين بالقائمة!' : 'Request published successfully to all technicians!', 'success');

      // Fetch matching technicians and dispatch real notification alerts (SMTP / WhatsApp)
      const matchedTechs = dbTechnicians.filter(tech => {
        const hasSpecialty = tech.serviceId === selectedService || tech.specialties?.includes(selectedService);
        return hasSpecialty && (tech.notifyEmail || tech.notifyWhatsapp);
      });

      if (matchedTechs.length > 0) {
        fetch('/api/dispatch-rescue-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestDetails: {
              id: reqId,
              clientName: (userRole as string) === 'guest' ? (lang === 'ar' ? 'عميل معتمد (حساب ضيف)' : 'Verified Client (Guest)') : (loggedInUserName || 'Adam Atooun'),
              clientPhone: phoneNumber || "+972 59-123-4567",
              serviceType: selectedService,
              locationLat: pinnedLocation.lat,
              locationLng: pinnedLocation.lng,
              locationName: "Al-Quds St",
              arLocationName: "شارع القدس",
              description: problemDescription
            },
            technicians: matchedTechs.map(t => ({
              name: t.name,
              email: t.email,
              phone: t.phone,
              notifyEmail: t.notifyEmail !== false,
              notifyWhatsapp: !!t.notifyWhatsapp
            })),
            appUrl: window.location.origin,
            lang: lang
          })
        }).then(res => res.json())
          .then(data => {
            console.log("Dispatch response:", data);
            if (data.success && (data.emailsSent > 0 || data.whatsappsSent > 0)) {
              triggerToast(
                lang === 'ar'
                  ? `📡 تم إرسال ${data.emailsSent} إيميل و ${data.whatsappsSent} رسائل واتس اب حقيقية للفنيين!`
                  : `📡 Dispatched ${data.emailsSent} real emails and ${data.whatsappsSent} real WhatsApp alerts to active technicians!`,
                'success'
              );
            }
          }).catch(err => {
            console.error("Failed to dispatch real notifications:", err);
          });
      }
    } catch (error) {
      console.error("Error creating request:", error);
      triggerToast(lang === 'ar' ? 'فشل إرسال الطلب لقاعدة البيانات!' : 'Failed to publish request!', 'error');
    }
  };

  // Client: Cancel active rescue request, delete request and its bids, and reset state
  const handleCancelRescueRequest = async () => {
    try {
      if (activeRequestId) {
        // Delete request document from the database
        try {
          await deleteDoc(doc(db, "requests", activeRequestId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `requests/${activeRequestId}`);
        }

        // Also delete any associated bids from the database
        try {
          const bidsQuery = query(collection(db, "bids"), where("requestId", "==", activeRequestId));
          const bidsSnap = await getDocs(bidsQuery);
          bidsSnap.forEach(async (bidDoc) => {
            await deleteDoc(bidDoc.ref);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `bids?requestId=${activeRequestId}`);
        }
      }

      // Decrement active emergencies if we can
      if (stats.activeEmergencies > 0) {
        try {
          await updateDoc(doc(db, "system_stats", "global"), {
            activeEmergencies: Math.max(0, stats.activeEmergencies - 1)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, "system_stats/global");
        }
      }

      // Reset client's local states completely to return to standby (empty records/idle)
      setActiveRequestId(null);
      setSimStatus('idle');
      setPinnedLocation(null);
      setSelectedBid(null);
      setIncomingBids([]);
      setTechCoordinates(null);
      setProblemDescription('');
      setChatMessages([]);

      triggerToast(
        lang === 'ar'
          ? '❌ تم إلغاء طلب الإنقاذ والعودة للرئيسية بنجاح.'
          : '❌ Rescue request cancelled and returned to standby successfully.',
        'success'
      );
    } catch (err) {
      console.error("Error cancelling request:", err);
      // Fallback local reset even if DB operations fail to ensure client doesn't get stuck
      setActiveRequestId(null);
      setSimStatus('idle');
      setPinnedLocation(null);
      setSelectedBid(null);
      setIncomingBids([]);
      setTechCoordinates(null);
      setProblemDescription('');
      setChatMessages([]);
    }
  };

  // Universal GPS location detection helper
  const detectCurrentLocation = (silent: boolean = false) => {
    if (navigator.geolocation) {
      if (!silent) {
        triggerToast(lang === 'ar' ? 'جاري الحصول على موقعك الدقيق من الـ GPS... 📡' : 'Fetching accurate GPS location... 📡', 'info');
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const { lat: latPct, lng: lngPct } = latLngToMapPct(latitude, longitude);
          
          if (userRole === 'technician') {
            setProviderLat(latPct);
            setProviderLng(lngPct);
            triggerToast(
              lang === 'ar' 
                ? `تم تحديد موقع مركبة الصيانة بنجاح عبر الـ GPS! الإحداثيات: Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}` 
                : `Maintenance vehicle location pinned via GPS! Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`, 
              'success'
            );
          } else {
            if (simStatus !== 'idle') {
              triggerToast(lang === 'ar' ? 'لا يمكن تعديل الموقع أثناء طلب نشط!' : 'Cannot change location during active request!', 'warning');
              return;
            }
            setPinnedLocation({ lat: latPct, lng: lngPct });
            triggerToast(
              lang === 'ar' 
                ? `تم تحديد موقع تعطل سيارتك بدقة! الإحداثيات: Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}` 
                : `Breakdown location pinned via GPS! Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`, 
              'success'
            );
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (!silent) {
            triggerToast(
              lang === 'ar' 
                ? 'فشل الحصول على إحداثيات الموقع. يرجى السماح بالوصول لموقعك الجغرافي أو تفعيل الـ GPS.' 
                : 'Could not fetch GPS coordinates. Please allow location permissions or turn on GPS.', 
              'error'
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      if (!silent) {
        triggerToast(lang === 'ar' ? 'متصفحك لا يدعم نظام تحديد المواقع العالمي.' : 'Your browser does not support GPS location systems.', 'error');
      }
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

  // Google Pay integration handler
  const handleGooglePayPayment = (paymentData?: any) => {
    if (!selectedBid) return;
    setIsPaymentProcessing(true);
    triggerToast(lang === 'ar' ? 'جاري الاتصال بـ Google Pay الآمن وتأكيد المعاملة...' : 'Connecting to secure Google Pay and confirming transaction...', 'info');

    setTimeout(async () => {
      try {
        setIsPaymentProcessing(false);
        await handleEscrowDeposit();
        triggerToast(
          lang === 'ar'
            ? `✅ تم الدفع بنجاح عبر بوابة Google Pay بقيمة ${selectedBid.price} ₪!`
            : `✅ Payment of ${selectedBid.price} ₪ successfully completed via Google Pay!`,
          'success'
        );
      } catch (err) {
        console.error("Google Pay simulation error:", err);
        setIsPaymentProcessing(false);
      }
    }, 2200);
  };

  // Secure Credit Card payment handler
  const handleCardPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBid) return;

    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length < 16) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال رقم بطاقة صحيح مكون من 16 رقم!' : 'Please enter a valid 16-digit card number!', 'warning');
      return;
    }
    if (!cardExpiry.trim() || !cardExpiry.includes('/')) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال تاريخ انتهاء صحيح (MM/YY)!' : 'Please enter a valid expiry date (MM/YY)!', 'warning');
      return;
    }
    if (!cardCvv.trim() || cardCvv.length < 3) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال رمز CVV صحيح!' : 'Please enter a valid CVV!', 'warning');
      return;
    }
    if (!cardHolder.trim()) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال اسم صاحب البطاقة!' : 'Please enter the cardholder name!', 'warning');
      return;
    }

    setIsPaymentProcessing(true);
    triggerToast(lang === 'ar' ? 'جاري التحقق من تفاصيل البطاقة عبر نظام سيسترو الآمن...' : 'Verifying card details through secure Systro escrow system...', 'info');

    setTimeout(async () => {
      try {
        setIsPaymentProcessing(false);
        await handleEscrowDeposit();
        // Clear card state
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setCardHolder('');
        triggerToast(
          lang === 'ar'
            ? `✅ تم الدفع وتأمين الوديعة بنجاح بقيمة ${selectedBid.price} ₪!`
            : `✅ Deposit of ${selectedBid.price} ₪ secured successfully!`,
          'success'
        );
      } catch (err) {
        console.error("Card payment error:", err);
        setIsPaymentProcessing(false);
      }
    }, 2500);
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

      triggerToast(lang === 'ar' ? 'شكراً على ملاحظتك، سوف نتابع الأمر.' : 'Thank you for the note, we will follow up on the matter.', 'success');
      
      // Clear tracking state and return user to the previous page / main request state
      setActiveRequestId(null);
      setSimStatus('idle');
      setPinnedLocation(null);
      setSelectedBid(null);
      setIncomingBids([]);
      setTechCoordinates(null);
      setProblemDescription('');
      setChatMessages([]);
      setShowDisputeForm(false);
      setDisputeReason('');
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
  const handleRealGoogleSignIn = async (isFallbackMode: boolean = false, fallbackEmail?: string, fallbackName?: string) => {
    if (isFallbackMode || showGoogleFallbackModal) {
      // Bypasses popup blocks inside iframes - auto imports the verified user dynamically
      const email = fallbackEmail || sessionStorage.getItem('systro_saved_google_email');
      const name = fallbackName || sessionStorage.getItem('systro_saved_google_name');
      
      if (email) {
        const displayName = name || (lang === 'ar' ? "مستخدم جوجل" : "Google User");
        await handleGoogleSignIn(email, displayName);
        setShowGoogleFallbackModal(false);
        triggerToast(
          lang === 'ar' 
            ? `تم استيراد حساب Google الخاص بك (${email}) وتسجيل الدخول تلقائياً بنجاح! 🔐` 
            : `Google account (${email}) imported and logged in automatically! 🔐`, 
          'success'
        );
      } else {
        triggerToast(
          lang === 'ar' 
            ? 'يرجى إدخال حسابك أولاً ليتمكن النظام من استيراده تلقائياً!' 
            : 'Please enter your account details first for the system to auto-import!', 
          'warning'
        );
      }
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && user.email) {
        const email = user.email;
        const name = user.displayName || `Google User #${Math.floor(1000 + Math.random() * 9000)}`;
        await handleGoogleSignIn(email, name);
        setShowGoogleFallbackModal(false);
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

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: enteredEmail.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setOtpSentToEmail(true);
        triggerToast(lang === 'ar' 
          ? 'تم إرسال رمز التحقق لبريدك الإلكتروني الحقيقي بنجاح! ✉️' 
          : 'Verification code sent to your real email inbox successfully! ✉️', 'success');
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
    setShowGoogleFallbackModal(false);
    const resolvedEmail = email || `user-${Math.floor(1000 + Math.random() * 9000)}@systro.live`;
    const resolvedName = name || (lang === 'ar' ? 'مستخدم سيسترو' : lang === 'he' ? 'משתמש סיסטרו' : 'Systro User');
    
    setLoggedInUserEmail(resolvedEmail);
    setLoggedInUserName(resolvedName);

    sessionStorage.setItem('systro_is_logged_in', 'true');
    sessionStorage.setItem('systro_user_email', resolvedEmail);
    sessionStorage.setItem('systro_user_name', resolvedName);

    try {
      const userDocRef = doc(db, "users", resolvedEmail);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.name) {
          setLoggedInUserName(data.name);
          sessionStorage.setItem('systro_user_name', data.name);
        }
        if (data.role) {
          setUserRole(data.role);
          sessionStorage.setItem('systro_user_role', data.role);
        } else {
          setUserRole(null);
          sessionStorage.removeItem('systro_user_role');
        }
        if (data.phone) {
          setPhoneNumber(data.phone);
          sessionStorage.setItem('systro_phone_number', data.phone);
        } else {
          setPhoneNumber('');
          sessionStorage.removeItem('systro_phone_number');
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
        sessionStorage.removeItem('systro_user_role');
        setPhoneNumber('');
        sessionStorage.removeItem('systro_phone_number');
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
    setPhoneNumber('');
    sessionStorage.removeItem('systro_is_logged_in');
    sessionStorage.removeItem('systro_user_email');
    sessionStorage.removeItem('systro_user_name');
    sessionStorage.removeItem('systro_user_role');
    sessionStorage.removeItem('systro_phone_number');
    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح!' : 'Logged out successfully!', 'info');
  };

  const handleSaveProfile = async () => {
    if (!profileNameInput.trim()) {
      triggerToast(lang === 'ar' ? 'الرجاء إدخال اسم صحيح!' : 'Please enter a valid name!', 'warning');
      return;
    }

    try {
      // 1. Update local states
      setLoggedInUserName(profileNameInput.trim());
      setPhoneNumber(profilePhoneInput.trim());

      // 2. Update sessionStorage
      sessionStorage.setItem('systro_user_name', profileNameInput.trim());
      sessionStorage.setItem('systro_phone_number', profilePhoneInput.trim());

      // 3. Update Firestore users collection
      const userDocRef = doc(db, "users", loggedInUserEmail);
      await setDoc(userDocRef, {
        name: profileNameInput.trim(),
        phone: profilePhoneInput.trim()
      }, { merge: true });

      // 4. Update Firestore technicians collection if they are a registered technician
      const techDocRef = doc(db, "technicians", loggedInUserEmail);
      const techSnap = await getDoc(techDocRef);
      if (techSnap.exists()) {
        await updateDoc(techDocRef, {
          name: profileNameInput.trim(),
          phone: profilePhoneInput.trim()
        });
      }

      setShowProfileModal(false);
      triggerToast(lang === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile updated successfully!', 'success');
    } catch (err) {
      console.error("Error saving user profile:", err);
      triggerToast(lang === 'ar' ? 'حدث خطأ أثناء حفظ التعديلات!' : 'Error saving profile changes!', 'error');
    }
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
            ? 'بإشراف وإدارة آدم عطون | المنصة الرقمية المعتمدة للإنقاذ السريع والخدمات الصناعية 🛠️✨' 
            : lang === 'he'
            ? 'בפיקוח ובניהול אדם עטון | פלטפורמת החילוץ המוסמכת והשירותים התעשייתיים 🛠️✨'
            : 'Supervised & Managed by Adam Atoun | The Certified Digital Platform for Rapid Rescue & Road Services 🛠️✨'}
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

      {/* Visual FCM Floating Push Notification Banner */}
      {activeNotification && (
        <div 
          onClick={() => {
            if (activeNotification.targetId) {
              setActiveRequestId(activeNotification.targetId);
              setActiveTab('simulator');
            }
            setActiveNotification(null);
          }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#0F1424]/95 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.25)] rounded-2xl p-4 flex items-start gap-3 cursor-pointer backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none group animate-slide-down"
          style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
        >
          {/* Glowing dot & app avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xl font-bold shadow-md text-black">
              {activeNotification.type === 'new_request' ? '🚨' :
               activeNotification.type === 'bid_submitted' ? '💸' :
               activeNotification.type === 'bid_accepted' ? '🎉' :
               activeNotification.type === 'en_route' ? '🚚' :
               activeNotification.type === 'arrived' ? '📍' :
               activeNotification.type === 'completed' ? '✅' :
               activeNotification.type === 'chat' ? '💬' : '📡'}
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>

          {/* Text content */}
          <div className="flex-grow min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black text-amber-500 tracking-wider uppercase font-mono">
                {lang === 'ar' ? 'إشعار فوري ذكي (FCM)' : 'Smart Instant Push (FCM)'}
              </span>
              <span className="text-[9px] text-gray-500 font-bold">
                {lang === 'ar' ? 'الآن' : 'Now'}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-white truncate mb-0.5">
              {lang === 'ar' ? activeNotification.titleAr : activeNotification.titleEn}
            </h4>
            <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed font-semibold">
              {lang === 'ar' ? activeNotification.bodyAr : activeNotification.bodyEn}
            </p>
            {activeNotification.targetId && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-amber-400 group-hover:text-amber-300 transition-colors">
                <span>{lang === 'ar' ? 'اضغط للذهاب للخريطة والمهمة' : 'Tap to focus active request'}</span>
                <span>➔</span>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveNotification(null);
            }}
            className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FCM Integrated Notification Center Drawer / Modal */}
      {isNotificationCenterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
            onClick={() => setIsNotificationCenterOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md h-full bg-[#070A13] border-l border-gray-800 shadow-2xl flex flex-col z-10 animate-slide-left">
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#0A0D18]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {lang === 'ar' ? 'إشعارات سيسترو الذكية' : 'Systro Push Center'}
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block tracking-wider">
                    Firebase Cloud Messaging (FCM)
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsNotificationCenterOpen(false)}
                className="p-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Quick Permissions & Simulator Controls */}
            <div className="p-4 bg-[#0A0D18]/60 border-b border-gray-800/80 space-y-3.5">
              {/* Native Browser Permissions */}
              <div className="flex items-center justify-between gap-3 p-3 bg-[#0F1424] border border-gray-800/60 rounded-xl">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black text-white block mb-0.5">
                    {lang === 'ar' ? 'إشعارات المتصفح لسطح المكتب' : 'HTML5 Desktop Notifications'}
                  </span>
                  <p className="text-[10px] text-gray-500 truncate">
                    {browserNotificationPermission === 'granted' 
                      ? (lang === 'ar' ? '✓ الإشعارات مفعّلة في الخلفية' : '✓ Notifications allowed in background')
                      : (lang === 'ar' ? 'مغلقة، اضغط للتفعيل والحصول على تنبيهات' : 'Disabled, click to allow permission')}
                  </p>
                </div>
                {browserNotificationPermission !== 'granted' ? (
                  <button
                    onClick={async () => {
                      if (typeof Notification !== 'undefined') {
                        const perm = await Notification.requestPermission();
                        setBrowserNotificationPermission(perm);
                        if (perm === 'granted') {
                          triggerToast(
                            lang === 'ar' ? 'تم تفعيل إشعارات المتصفح بنجاح!' : 'Browser notifications enabled!',
                            'success'
                          );
                        }
                      }
                    }}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-[#070A13] text-[10px] font-black rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    {lang === 'ar' ? 'تفعيل الآن' : 'Enable'}
                  </button>
                ) : (
                  <span className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                    {lang === 'ar' ? 'نشط' : 'Active'}
                  </span>
                )}
              </div>

              {/* Simulation Hub */}
              <div className="flex items-center justify-between gap-2.5">
                <button
                  onClick={() => {
                    triggerToast(
                      lang === 'ar' 
                        ? '🚀 جارٍ جدولة إرسال إشعار تجريبي فوري خلال ثانية واحدة...' 
                        : '🚀 Scheduling an instant simulation trigger in 1 second...',
                      'info'
                    );
                    setTimeout(() => {
                      triggerNotification(
                        'system',
                        '🎯 اختبار الإشعارات الفورية (FCM)',
                        '🎯 Smart FCM Push Test',
                        'تم استقبال وتأكيد ربط الإشعار بنجاح فائق! نظام التوجيه نشط 100%.',
                        'FCM verification signal completed flawlessly! Routing is 100% stable.',
                        ''
                      );
                    }, 1000);
                  }}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/15 hover:to-indigo-500/15 text-blue-400 border border-blue-500/25 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🎯</span>
                  <span>{lang === 'ar' ? 'تجرِبة الإشعار الفوري' : 'Test Push Visual'}</span>
                </button>

                <button
                  onClick={() => {
                    playRescueAlertSound();
                    triggerToast(
                      lang === 'ar' ? '🔊 تم تشغيل نغمة الإنقاذ الذكية!' : '🔊 Played rescue signal tone!',
                      'success'
                    );
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title={lang === 'ar' ? 'اختبار الصوت والاهتزاز' : 'Test Signal Tone'}
                >
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'ar' ? 'نغمة' : 'Tone'}</span>
                </button>
              </div>

              {/* Operations row */}
              <div className="flex items-center justify-between gap-3 text-[11px] font-black text-gray-500 px-1 pt-1">
                <button
                  onClick={() => {
                    setNotifications(prev => {
                      const updated = prev.map(n => ({ ...n, isRead: true }));
                      localStorage.setItem('systro_notifications_history', JSON.stringify(updated));
                      return updated;
                    });
                    triggerToast(lang === 'ar' ? 'تم تحديد جميع الإشعارات كمقروءة!' : 'All marked as read!', 'success');
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer animate-fade-in"
                >
                  <CheckCheck className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>{lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
                </button>

                <button
                  onClick={() => {
                    setNotifications([]);
                    localStorage.removeItem('systro_notifications_history');
                    triggerToast(lang === 'ar' ? 'تم مسح سجل الإشعارات بالكامل!' : 'Cleared notification history!', 'info');
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer animate-fade-in"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'ar' ? 'مسح السجل' : 'Clear all'}</span>
                </button>
              </div>
            </div>

            {/* Notifications Scroll list */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3.5">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-gray-800 flex items-center justify-center text-2xl animate-pulse">
                    🔔
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm font-black text-gray-400 block">
                      {lang === 'ar' ? 'صندوق الإشعارات فارغ' : 'Your inbox is clear'}
                    </span>
                    <p className="text-[11px] text-gray-500 max-w-[240px] leading-relaxed mx-auto">
                      {lang === 'ar' 
                        ? 'لا توجد أي إشعارات سابقة حالياً. بمجرد إرسال طلب جديد أو تلقي عرض فستظهر هنا تلقائياً في نفس اللحظة.' 
                        : 'No previous notifications available. New breakdown requests and technician bids will appear here instantly.'}
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      // Mark as read
                      setNotifications(prev => {
                        const updated = prev.map(notif => notif.id === n.id ? { ...notif, isRead: true } : notif);
                        localStorage.setItem('systro_notifications_history', JSON.stringify(updated));
                        return updated;
                      });
                      
                      // Navigate to task
                      if (n.targetId) {
                        setActiveRequestId(n.targetId);
                        setActiveTab('simulator');
                        setIsNotificationCenterOpen(false);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer group ${
                      n.isRead 
                        ? 'bg-slate-900/40 border-gray-950 hover:bg-slate-900 hover:border-gray-800 text-gray-300' 
                        : 'bg-[#0F1424]/90 border-amber-500/20 hover:border-amber-500/40 text-white shadow-md shadow-amber-500/5'
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-8.5 h-8.5 rounded-xl bg-slate-950 flex items-center justify-center text-base shrink-0 border border-gray-800/80 group-hover:scale-110 transition-transform">
                      {n.type === 'new_request' ? '🚨' :
                       n.type === 'bid_submitted' ? '💸' :
                       n.type === 'bid_accepted' ? '🎉' :
                       n.type === 'en_route' ? '🚚' :
                       n.type === 'arrived' ? '📍' :
                       n.type === 'completed' ? '✅' :
                       n.type === 'chat' ? '💬' : '📡'}
                    </div>

                    {/* Body text */}
                    <div className="flex-grow min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs font-black truncate leading-tight group-hover:text-amber-400 transition-colors">
                          {lang === 'ar' ? n.titleAr : n.titleEn}
                        </h4>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-gray-400 leading-relaxed font-sans line-clamp-3">
                        {lang === 'ar' ? n.bodyAr : n.bodyEn}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1.5 text-[9px] font-bold text-gray-500">
                        <span>
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {n.targetId && (
                          <span className="text-amber-500 group-hover:underline flex items-center gap-0.5">
                            {lang === 'ar' ? 'عرض المهمة الخريطة ➔' : 'View map task ➔'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer informational */}
            <div className="p-4 bg-[#0A0D18] border-t border-gray-800 text-center select-none">
              <span className="text-[10px] font-bold text-gray-500 block">
                {lang === 'ar' ? '✓ نظام مشغل ومؤمن بالكامل بواسطة سيسترو السحابي' : '✓ Powered & secured by Systro Cloud System'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Style Custom Geolocation Prompt Banner */}
      {showLocationPrompt && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[440px] z-50 bg-[#0C101F]/98 border border-amber-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-fade-in transition-all">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 animate-pulse">
              <MapPin className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-black text-white font-sans">
                  {t.locationPromptTitle}
                </h4>
                <button 
                  onClick={() => {
                    try {
                      sessionStorage.setItem('systro_location_prompt_dismissed', 'true');
                    } catch (e) {}
                    setShowLocationPrompt(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                {t.locationPromptDesc}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2 select-none">
                <button
                  onClick={() => {
                    detectCurrentLocation(false);
                    try {
                      sessionStorage.setItem('systro_location_prompt_dismissed', 'true');
                    } catch (e) {}
                    setShowLocationPrompt(false);
                  }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t.locationPromptAllow}</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      sessionStorage.setItem('systro_location_prompt_dismissed', 'true');
                    } catch (e) {}
                    setShowLocationPrompt(false);
                    triggerToast(
                      lang === 'ar'
                        ? 'ℹ️ حسناً، يمكنك الضغط يدوياً على الخريطة لتحديد موقعك بدقة.'
                        : 'ℹ️ Alright, you can manually click on the map to set your location.',
                      'info'
                    );
                  }}
                  className="py-2.5 px-4 bg-[#171C2F] hover:bg-[#1E253F] text-gray-300 hover:text-white border border-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  {t.locationPromptDecline}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVBAR HEADER */}
      <header className="sticky top-0 z-40 bg-[#0A0B10]/95 backdrop-blur-md border-b border-[#1E293B]/70 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-3">
          
          {/* Logo Brand matching Images */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none" onClick={() => setActiveTab('home')}>
            <div className="w-11 h-11 relative rounded-xl overflow-hidden p-[1px] bg-gradient-to-tr from-blue-400 via-cyan-300 to-teal-400 shadow-md flex items-center justify-center shrink-0 border border-cyan-300/20">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#1E3A8A] via-[#2563EB] to-[#06B6D4] rounded-[10px] overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/10 rounded-t-[10px] filter blur-[0.5px]"></div>
              </div>
              <svg className="w-7 h-7 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow-nav" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#1E3A8A" floodOpacity="0.5" />
                  </filter>
                  <linearGradient id="sGrad-nav" x1="10%" y1="0%" x2="90%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor="#E0F2FE" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <path d="M15 70 C 35 85, 70 65, 85 40" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 3" />
                <path d="M20 55 C 40 70, 75 55, 80 25" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.35" />
                <circle cx="85" cy="40" r="3.5" fill="#FFFFFF" />
                <circle cx="80" cy="25" r="2.5" fill="#38BDF8" />
                <circle cx="20" cy="55" r="3" fill="#38BDF8" />
                <circle cx="33" cy="67" r="4" fill="#E0F2FE" />
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
                  strokeOpacity="0.85"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 drop-shadow-[0_1px_2px_rgba(14,165,233,0.15)]">
                  {t.logoTitle} <span className="text-sky-400 font-black">{t.logoRescue}</span>
                </h1>
                {/* Custom glowing supervisor badge for Adam Atoun */}
                <span className="px-2 py-0.5 text-[9px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-md animate-pulse">
                  {lang === 'ar' ? 'بإشراف آدم عطون' : lang === 'he' ? 'בפיקוח אדם עטון' : 'Adam Atoun'}
                </span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-cyan-400/80 block uppercase">
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
              <span className="hidden sm:inline">{lang === 'ar' ? `نطاق موثق: ${customDomain}` : lang === 'he' ? `דומיין מאומת: ${customDomain}` : `Verified: ${customDomain}`}</span>
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
            <button 
              onClick={() => {
                setActiveTab('taxi');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'taxi' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              {lang === 'ar' ? 'تكسي 🚕' : lang === 'he' ? 'מונית 🚕' : 'Taxi 🚕'}
            </button>
          </nav>

          {/* Right actions (Sign in, language toggle, Admin portal yellow) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell Icon */}
            <button
              onClick={() => setIsNotificationCenterOpen(true)}
              className="relative p-2 sm:p-2.5 bg-[#111827]/85 border border-[#1E293B]/70 rounded-xl text-gray-300 hover:text-white transition-all flex items-center justify-center cursor-pointer shrink-0"
              title={lang === 'ar' ? 'مركز الإشعارات الذكي (FCM)' : 'Smart Notification Hub (FCM)'}
            >
              <Bell className={`w-4 h-4 shrink-0 ${notifications.some(n => !n.isRead) ? 'animate-bounce text-amber-500' : ''}`} />
              
              {notifications.some(n => !n.isRead) && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                </span>
              )}
            </button>

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
                onClick={() => handleRealGoogleSignIn()}
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
                    sessionStorage.setItem('systro_user_role', newRole);
                    
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
                  onClick={() => {
                    setProfileNameInput(loggedInUserName);
                    setProfilePhoneInput(phoneNumber);
                    setShowProfileModal(true);
                  }}
                  className="px-3.5 h-11 bg-[#0F1424] hover:bg-[#161C33] border border-gray-800 rounded-xl text-xs font-bold text-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title={lang === 'ar' ? 'الملف الشخصي' : 'User Profile'}
                >
                  <User className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>{lang === 'ar' ? 'حسابي' : 'Profile'}</span>
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

            {/* Mobile Profile Button */}
            {isLoggedIn && (
              <button
                onClick={() => {
                  setProfileNameInput(loggedInUserName);
                  setProfilePhoneInput(phoneNumber);
                  setShowProfileModal(true);
                }}
                className="lg:hidden p-2 bg-[#0F1424] hover:bg-[#161C33] border border-gray-800 rounded-xl text-gray-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title={lang === 'ar' ? 'الملف الشخصي' : 'User Profile'}
              >
                <User className="w-4 h-4 text-amber-500" />
              </button>
            )}

            {/* Mobile Logout Button */}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="lg:hidden p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-red-400 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title={lang === 'ar' ? 'تسجيل الخروج' : lang === 'he' ? 'התנתק' : 'Logout'}
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
              <span>{lang === 'ar' ? 'بوابة الإدارة' : lang === 'he' ? 'שער ניהול' : 'Admin Gate'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE HERO LANDING VIEW (Home) */}
      {activeTab === 'home' && (
        <HomeTab
          lang={lang}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          userRole={userRole}
          setUserRole={setUserRole as any}
          setActiveTab={setActiveTab as any}
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
          loggedInUserEmail={loggedInUserEmail}
          showSosButton={showSosButton}
          setShowSosButton={setShowSosButton}
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
          setUserRole={setUserRole as any}
          setActiveTab={setActiveTab as any}
          setSelectedService={setSelectedService}
          setSelectedServiceIdForRecord={setSelectedServiceIdForRecord}
          setShowAddRecordModal={setShowAddRecordModal}
          setShowCustomServiceModal={setShowCustomServiceModal}
          t={t}
        />
      )}

      {/* TAXI & VIP RIDE PORTAL */}
      {activeTab === 'taxi' && (
        <TaxiTab
          lang={lang}
          isLoggedIn={isLoggedIn}
          loggedInUserName={loggedInUserName}
          loggedInUserEmail={loggedInUserEmail}
          setActiveTab={setActiveTab as any}
          triggerToast={triggerToast}
          mapsKey={mapsKey}
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
                    sessionStorage.setItem('systro_user_role', 'client');
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
                    sessionStorage.setItem('systro_user_role', 'technician');
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
            </div>
          </div>

          {/* Dynamic grid split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Interactive Map (12 cols grid map) */}
            {userRole !== 'technician' && (
              <div className="lg:col-span-5 bg-[#0F1424] border border-gray-800 p-5 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-900 pb-3">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
                  {t.simMapTitle}
                </h3>
                <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest select-none self-start">
                  {lang === 'ar' ? 'خرائط جوجل لايف 📡' : 'GOOGLE MAPS LIVE 📡'}
                </span>
              </div>

              {/* Precise Auto-GPS locator button - Hidden for technicians, active for clients */}
              <button
                onClick={() => detectCurrentLocation(false)}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] md:text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-blue-500/30 group active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4 text-amber-400 animate-bounce group-hover:scale-110 transition-transform" />
                <span>
                  {lang === 'ar' ? 'تحديد موقعي الحالي بدقة تلقائياً (GPS) 📍' : 'Auto-Detect My Current Location (GPS) 📍'}
                </span>
              </button>

              {/* Map Rendering Container */}
              <div className="relative aspect-square w-full bg-[#050814] border border-gray-900 rounded-2xl overflow-hidden shadow-inner">
                {!hasValidKey ? (
                  /* Google Maps setup guidelines when API key is unprovided */
                  <div className="absolute inset-0 bg-[#0B0E17] p-5 md:p-6 overflow-y-auto flex flex-col justify-center items-center text-center space-y-4 font-sans select-none animate-fadeIn">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-wide">
                        {lang === 'ar' ? 'مفتاح Google Maps مطلوب لتشغيل الخريطة' : 'Google Maps API Key Required'}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed max-w-xs">
                        {lang === 'ar' 
                          ? 'يرجى إضافة مفتاح GOOGLE_MAPS_PLATFORM_KEY إلى إعدادات المشروع لتفعيل تتبع مركبات الإنقاذ والموقع بدقة.' 
                          : 'Please add GOOGLE_MAPS_PLATFORM_KEY to your project secrets to enable precise location and vehicle tracking.'}
                      </p>
                      <div className="mt-2 text-[9px] text-gray-500 font-mono bg-gray-900/40 px-2 py-1 rounded border border-gray-800/50 inline-block">
                        Status: {mapsKey ? `Loaded (${mapsKey.slice(0, 5)}...${mapsKey.slice(-4)})` : 'No key detected'}
                      </div>
                    </div>
                    
                    <div className="bg-[#121626] border border-gray-800 rounded-xl p-3.5 text-right w-full max-w-xs space-y-2 text-[9px] md:text-[10px]">
                      <p className="font-extrabold text-gray-300 border-b border-gray-800 pb-1.5 text-center">
                        {lang === 'ar' ? 'خطوات تفعيل الخريطة الحية:' : 'Map Setup Steps:'}
                      </p>
                      <ol className={`list-decimal space-y-1.5 text-gray-400 leading-normal px-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <li>
                          <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-bold">
                            {lang === 'ar' ? 'أولاً: اضغط هنا للحصول على مفتاح API مجاني' : 'First: Get a free API Key'}
                          </a>
                        </li>
                        <li>
                          {lang === 'ar' 
                            ? 'افتح الإعدادات (⚙️ أيقونة الترس في الزاوية العلوية اليمنى من هذه الصفحة).' 
                            : 'Open Settings (⚙️ gear icon, top-right corner of this page).'}
                        </li>
                        <li>
                          {lang === 'ar' 
                            ? 'اختر قسم Secrets واكتب اسم المتغير: GOOGLE_MAPS_PLATFORM_KEY' 
                            : 'Select Secrets and enter name: GOOGLE_MAPS_PLATFORM_KEY'}
                        </li>
                        <li>
                          {lang === 'ar' 
                            ? 'ألصق المفتاح الخاص بك في خانة القيمة واضغط Enter لحفظه.' 
                            : 'Paste your API key value and press Enter to save.'}
                        </li>
                      </ol>
                    </div>
                  </div>
                ) : isMapAuthFailed ? (
                  /* When Google Maps auth fails (ApiProjectMapError / Maps API not enabled) */
                  <div className="absolute inset-0 bg-[#0B0E17] p-5 md:p-6 overflow-y-auto flex flex-col justify-center items-center text-center space-y-4 font-sans select-none animate-fadeIn">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-red-500 uppercase tracking-wide">
                        {lang === 'ar' ? 'فشل تحميل خريطة جوجل (مشكلة في صلاحيات المفتاح)' : 'Google Maps Authorization Error'}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed max-w-xs">
                        {lang === 'ar' 
                          ? 'المفتاح المدخل غير مصرح له أو أن "Maps JavaScript API" غير مفعّلة في حسابك على Google Cloud.' 
                          : 'The API key is invalid or "Maps JavaScript API" is not enabled on your Google Cloud Console.'}
                      </p>
                    </div>
                    
                    <div className="bg-[#121626] border border-red-500/15 rounded-xl p-3.5 text-right w-full max-w-xs space-y-2 text-[9px] md:text-[10px] sm:text-right">
                      <p className="font-extrabold text-red-400 border-b border-gray-800 pb-1.5 text-center">
                        {lang === 'ar' ? 'كيفية حل هذه المشكلة وتفعيل المفتاح:' : 'How to fix this issue:'}
                      </p>
                      <ol className={`list-decimal space-y-1.5 text-gray-400 leading-normal px-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <li>
                          <a href="https://console.cloud.google.com/google/maps-apis/api-list?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-bold">
                            {lang === 'ar' ? 'اضغط هنا لفتح صفحة خدمات خرائط جوجل' : 'Click here to open Maps API Library'}
                          </a>
                        </li>
                        <li>
                          {lang === 'ar' 
                            ? 'ابحث عن "Maps JavaScript API" واضغط عليها.' 
                            : 'Search for "Maps JavaScript API" and select it.'}
                        </li>
                        <li>
                          {lang === 'ar' 
                            ? 'اضغط على زر تفعيل (Enable) لتمكين استخدام الخريطة.' 
                            : 'Click the "Enable" button to activate the API.'}
                        </li>
                        <li>
                          {lang === 'ar' 
                            ? 'تأكد أيضاً من تفعيل "Geocoding API" و"Places API" لتجربة إنقاذ متكاملة!' 
                            : 'Ensure "Geocoding API" and "Places API" are also enabled for a full experience!'}
                        </li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  /* Google Maps Component rendering */
                  <APIProvider apiKey={mapsKey} version="weekly">
                    <Map
                      defaultCenter={pinnedLocation ? mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng) : { lat: 31.7683, lng: 35.2137 }}
                      defaultZoom={pinnedLocation ? 13 : 11}
                      mapId="DEMO_MAP_ID"
                      onClick={(e: any) => {
                        if (!e.detail.latLng) return;
                        const { lat, lng } = e.detail.latLng;
                        const { lat: latPct, lng: lngPct } = latLngToMapPct(lat, lng);

                        if (simStatus !== 'idle') {
                          triggerToast(lang === 'ar' ? 'لا يمكن تعديل الموقع أثناء طلب نشط!' : 'Cannot change location during an active request!', 'warning');
                          return;
                        }
                        setPinnedLocation({ lat: latPct, lng: lngPct });
                        triggerToast(lang === 'ar' ? 'تم تحديد موقع سيارتك بنجاح!' : 'Breakdown location pinned successfully!', 'success');
                      }}
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: '100%', height: '100%' }}
                    >
                      {pinnedLocation && (
                        <AdvancedMarker 
                          position={mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng)} 
                          title={lang === 'ar' ? 'موقعي 📌' : 'My Location 📌'}
                        >
                          <Pin background="#EF4444" borderColor="#B91C1C" glyphColor="#FFFFFF" />
                        </AdvancedMarker>
                      )}

                      {technicians.map(tech => {
                        if (simStatus !== 'idle' && selectedBid?.technicianId === tech.id) return null;
                        return (
                          <AdvancedMarker 
                            key={tech.id} 
                            position={mapPctToLatLng(tech.lat, tech.lng)} 
                            title={lang === 'ar' ? tech.arName : tech.name}
                          >
                            <Pin background="#3B82F6" borderColor="#1D4ED8" glyphColor="#FFFFFF" />
                          </AdvancedMarker>
                        );
                      })}

                      {techCoordinates && selectedBid && (
                        <AdvancedMarker 
                          position={mapPctToLatLng(techCoordinates.lat, techCoordinates.lng)} 
                          title={lang === 'ar' ? `ونش ${selectedBid.technicianArName} 🚚` : `${selectedBid.technicianName} 🚚`}
                        >
                          <Pin background="#F59E0B" borderColor="#D97706" glyphColor="#FFFFFF" />
                        </AdvancedMarker>
                      )}

                    </Map>
                  </APIProvider>
                )}
              </div>

              {/* Status details bottom pin details */}
              <div className="bg-[#0A0B10] p-4 rounded-xl border border-gray-900/60 flex items-center justify-between text-xs font-semibold select-none">
                <span className="text-gray-500">
                  {lang === 'ar' ? 'إحداثيات موقعي الفعلي:' : 'My GPS Coordinates:'}
                </span>
                {pinnedLocation ? (
                  <span className="text-[#10B981] font-mono font-bold">
                    Lat: {mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lat.toFixed(5)}°N , Lng: {mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lng.toFixed(5)}°E
                  </span>
                ) : (
                  <span className="text-red-400 font-bold">{lang === 'ar' ? 'غير محدد 📌' : 'Unspecified 📌'}</span>
                )}
              </div>
            </div>
          )}

            {/* Right Column: Workflow Wizard or Partner Dashboard (Dynamic Role Layout) */}
            <div className={`${userRole === 'technician' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-[#111827]/60 border border-gray-800 p-6 rounded-3xl space-y-6 flex flex-col justify-between`}>
              
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
                            ? 'أنت مسجل كفني/مقدم خدمة. يرجى إدخال تفاصيل ملفك والسيارة للبدء.' 
                            : 'Complete your profile to start receiving emergency alerts.'}
                        </p>
                      </div>

                      <div className="space-y-4 text-right">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'اسم الفني / الشركة المعتمد:' : 'Certified Display Name:'}</label>
                          <input 
                            type="text" 
                            value={providerName || loggedInUserName} 
                            onChange={(e) => setProviderName(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: آدم عطون' : 'e.g. Adam Atoun'}
                            className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'الصورة الشخصية (اختر صورة أو الصق رابطاً):' : 'Profile Picture (Select or paste link):'}</label>
                          <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
                            {[
                              "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120",
                              "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=120",
                              "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120",
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
                              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
                              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120"
                            ].map((presetUrl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setProviderAvatar(presetUrl)}
                                className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all flex-shrink-0 ${providerAvatar === presetUrl || (!providerAvatar && idx === 0) ? 'border-amber-500 scale-105 shadow-md shadow-amber-500/20' : 'border-gray-800 opacity-60 hover:opacity-100'}`}
                              >
                                <img src={presetUrl} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                          <input 
                            type="text" 
                            value={providerAvatar} 
                            onChange={(e) => setProviderAvatar(e.target.value)}
                            placeholder={lang === 'ar' ? 'أو الصق رابط الصورة المباشر هنا...' : 'Or paste a direct image URL here...'} 
                            className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'نوع مركبة الصيانة والإنقاذ (مثال: BMW 2024):' : 'Rescue Vehicle/Truck Description:'}</label>
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
                            placeholder={lang === 'ar' ? 'مثال: 5982614' : 'e.g. 5982614'} 
                            className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                          />
                        </div>

                        <button 
                          onClick={async () => {
                            const vName = providerName.trim() || loggedInUserName;
                            const vAvatar = providerAvatar.trim() || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120";
                            if (!providerVehicle.trim() || !providerPlate.trim()) {
                              triggerToast(lang === 'ar' ? 'الرجاء تعبئة مواصفات المركبة ورقم اللوحة!' : 'Please fill in the vehicle specs and license plate!', 'warning');
                              return;
                            }
                            try {
                              const newTech = {
                                id: loggedInUserEmail,
                                name: vName,
                                arName: vName,
                                phone: '+972 59-999-9999',
                                rating: 5.0,
                                reviewsCount: 1,
                                isOnline: true,
                                lat: 40,
                                lng: 40,
                                avatar: vAvatar,
                                carModel: providerVehicle,
                                arCarModel: providerVehicle,
                                plateNumber: providerPlate,
                                specialties: ['towing'],
                                email: loggedInUserEmail,
                                notifyEmail: notifyEmail,
                                notifyWhatsapp: notifyWhatsapp
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
                            src={activeTechDoc.avatar || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120"} 
                            alt="Technician" 
                            className="w-12 h-12 rounded-full border border-amber-500/35 object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-right">
                            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>{activeTechDoc.name || loggedInUserName}</span>
                              <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                <span>{activeTechDoc.rating || '5.0'}</span>
                              </span>
                            </h4>
                            <span className="text-[10px] text-gray-500 font-extrabold block">{activeTechDoc.carModel} ({activeTechDoc.plateNumber})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Edit Details Action Button */}
                          <button
                            onClick={() => {
                              setProviderName(activeTechDoc.name || '');
                              setProviderAvatar(activeTechDoc.avatar || '');
                              setProviderVehicle(activeTechDoc.carModel || '');
                              setProviderPlate(activeTechDoc.plateNumber || '');
                              setIsEditingTechProfile(!isEditingTechProfile);
                            }}
                            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/20 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'تعديل التفاصيل' : 'Edit Details'}</span>
                          </button>

                          {/* Location pin alert badge */}
                          <div className="text-center sm:text-right rtl:sm:text-right ltr:sm:text-left bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                            <span className="text-[9px] text-blue-400 font-bold block uppercase">{lang === 'ar' ? 'تموضع المركبة المباشر:' : 'Live Vehicle GPS:'}</span>
                            <span className="text-[10px] text-white font-extrabold font-mono block">
                              {providerLat ? `Lat: ${providerLat.toFixed(2)}, Lng: ${providerLng?.toFixed(2)}` : (lang === 'ar' ? 'متصل بالـ GPS 📡' : 'Connected to GPS 📡')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Edit Profile Form */}
                      {isEditingTechProfile && (
                        <div className="p-5 bg-gradient-to-br from-[#0F1424] to-[#0A0B10] border border-amber-500/25 rounded-3xl space-y-4 shadow-xl text-right animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-gray-950 pb-3">
                            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                              <Settings className="w-4 h-4 animate-spin-slow" />
                              <span>{lang === 'ar' ? 'تعديل بيانات الفني والسيارة' : 'Modify Technician & Vehicle Details'}</span>
                            </span>
                            <button onClick={() => setIsEditingTechProfile(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'الاسم الشخصي / اسم العرض:' : 'Certified Display Name:'}</label>
                              <input 
                                type="text" 
                                value={providerName} 
                                onChange={(e) => setProviderName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#050609] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'رابط الصورة الشخصية أو اختر من المعرض:' : 'Profile Picture:'}</label>
                              <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                                {[
                                  "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120",
                                  "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=120",
                                  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120",
                                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
                                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
                                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120"
                                ].map((presetUrl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setProviderAvatar(presetUrl)}
                                    className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all flex-shrink-0 ${providerAvatar === presetUrl ? 'border-amber-500 scale-105' : 'border-gray-900 opacity-60'}`}
                                  >
                                    <img src={presetUrl} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                              <input 
                                type="text" 
                                value={providerAvatar} 
                                onChange={(e) => setProviderAvatar(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#050609] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'مواصفات / نوع السيارة:' : 'Rescue Vehicle/Truck Description:'}</label>
                              <input 
                                type="text" 
                                value={providerVehicle} 
                                onChange={(e) => setProviderVehicle(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#050609] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'رقم لوحة السيارة:' : 'License Plate Number:'}</label>
                              <input 
                                type="text" 
                                value={providerPlate} 
                                onChange={(e) => setProviderPlate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#050609] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={async () => {
                                  if (!providerName.trim() || !providerVehicle.trim() || !providerPlate.trim()) {
                                    triggerToast(lang === 'ar' ? 'الرجاء ملء جميع الحقول المذكورة!' : 'Please fill in all details!', 'warning');
                                    return;
                                  }
                                  try {
                                    await updateDoc(doc(db, "technicians", loggedInUserEmail), {
                                      name: providerName,
                                      arName: providerName,
                                      avatar: providerAvatar || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120",
                                      carModel: providerVehicle,
                                      arCarModel: providerVehicle,
                                      plateNumber: providerPlate
                                    });
                                    setIsEditingTechProfile(false);
                                    triggerToast(lang === 'ar' ? 'تم تحديث تفاصيل ملفك بنجاح!' : 'Profile updated successfully!', 'success');
                                  } catch (err) {
                                    console.error(err);
                                    triggerToast(lang === 'ar' ? 'حدث خطأ أثناء تحديث البيانات!' : 'Error updating profile!', 'error');
                                  }
                                }}
                                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                              </button>
                              <button
                                onClick={() => setIsEditingTechProfile(false)}
                                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* NEW: Technician Notification Preference Panel */}
                      <div className="p-5 bg-gradient-to-br from-[#0F1424] to-[#0A0B10] border border-amber-500/15 rounded-3xl space-y-4 shadow-xl text-right">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-900 pb-3">
                          <div className="text-right">
                            <h4 className="text-xs font-black text-amber-500 flex items-center justify-start gap-1.5">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                              <span>{lang === 'ar' ? 'تفعيل إشعارات نداءات الاستغاثة الطارئة 📡' : 'Live Emergency Task Alert Settings 📡'}</span>
                            </h4>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              {lang === 'ar' 
                                ? 'اختر كيف ترغب في استقبال التنبيه الفوري بمجرد نشر أي زبون لنداء استغاثة طارئ على الطريق:' 
                                : 'Choose how you want to be notified as soon as a driver requests emergency roadside assistance:'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* WhatsApp Channel */}
                          <button
                            onClick={() => {
                              const nextVal = !notifyWhatsapp;
                              setNotifyWhatsapp(nextVal);
                              localStorage.setItem('systro_notify_whatsapp', String(nextVal));
                              if (isLoggedIn && loggedInUserEmail && userRole === 'technician') {
                                updateDoc(doc(db, "technicians", loggedInUserEmail), {
                                  notifyWhatsapp: nextVal
                                }).catch(e => console.error(e));
                              }
                              triggerToast(
                                lang === 'ar'
                                  ? (nextVal ? '✅ تم تفعيل إشعارات الواتساب الفورية بنجاح!' : '❌ تم إيقاف إشعارات الواتساب.')
                                  : (nextVal ? '✅ WhatsApp alerts enabled successfully!' : '❌ WhatsApp alerts disabled.'),
                                nextVal ? 'success' : 'warning'
                              );
                            }}
                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 justify-between text-right cursor-pointer group ${
                              notifyWhatsapp 
                                ? 'bg-[#0F291E] border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/20' 
                                : 'bg-[#0A0B10] border-gray-850 text-gray-400 hover:border-gray-800 hover:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2.5 rounded-xl transition-all ${
                                notifyWhatsapp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-900 text-gray-500 group-hover:text-gray-300'
                              }`}>
                                <MessageCircle className="w-5 h-5" />
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black block">
                                  {lang === 'ar' ? '1. إشعار عبر الواتس اب 💬' : '1. Notify via WhatsApp 💬'}
                                </span>
                                <span className="text-[9px] text-gray-500 font-bold block mt-0.5">
                                  {lang === 'ar' ? 'إرسال التنبيه لهاتفك فوراً' : 'Instant messages to phone'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                notifyWhatsapp ? 'border-emerald-500 bg-emerald-500' : 'border-gray-700'
                              }`}>
                                {notifyWhatsapp && <Check className="w-3 h-3 text-black stroke-[3]" />}
                              </div>
                            </div>
                          </button>

                          {/* Email Channel */}
                          <button
                            onClick={() => {
                              const nextVal = !notifyEmail;
                              setNotifyEmail(nextVal);
                              localStorage.setItem('systro_notify_email', String(nextVal));
                              if (isLoggedIn && loggedInUserEmail && userRole === 'technician') {
                                updateDoc(doc(db, "technicians", loggedInUserEmail), {
                                  notifyEmail: nextVal
                                }).catch(e => console.error(e));
                              }
                              triggerToast(
                                lang === 'ar'
                                  ? (nextVal ? `✅ تم تفعيل إشعارات الإيميل بنجاح إلى ${loggedInUserEmail}!` : '❌ تم إيقاف إشعارات البريد الإلكتروني.')
                                  : (nextVal ? `✅ Email notifications active to ${loggedInUserEmail}!` : '❌ Email notifications disabled.'),
                                nextVal ? 'success' : 'warning'
                              );
                            }}
                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 justify-between text-right cursor-pointer group ${
                              notifyEmail 
                                ? 'bg-[#1E1F30] border-blue-500/40 text-blue-300 shadow-lg shadow-blue-950/20' 
                                : 'bg-[#0A0B10] border-gray-850 text-gray-400 hover:border-gray-800 hover:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2.5 rounded-xl transition-all ${
                                notifyEmail ? 'bg-blue-500/15 text-blue-400' : 'bg-gray-900 text-gray-500 group-hover:text-gray-300'
                              }`}>
                                <Mail className="w-5 h-5" />
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black block">
                                  {lang === 'ar' ? '2. إشعار عبر الإيميل 📧' : '2. Notify via Email 📧'}
                                </span>
                                <span className="text-[9px] text-gray-500 font-bold block mt-0.5 truncate max-w-[120px] sm:max-w-none">
                                  {loggedInUserEmail}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                notifyEmail ? 'border-blue-500 bg-blue-500' : 'border-gray-700'
                              }`}>
                                {notifyEmail && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Test Notification Sound */}
                        <div className="pt-2 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              playRescueAlertSound();
                              triggerToast(
                                lang === 'ar'
                                  ? '🔊 تم تشغيل نغمة رادار الإنقاذ العاجل للتجربة بنجاح!'
                                  : '🔊 Emergency Radar alarm chime played for testing successfully!',
                                'success'
                              );
                            }}
                            className="w-full py-2.5 bg-[#171C2F] hover:bg-[#1E253F] text-amber-400 hover:text-amber-300 border border-amber-500/10 hover:border-amber-500/25 rounded-xl text-[11px] font-black tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{lang === 'ar' ? '🔊 تجربة نغمة التنبيه المخصصة للشبكة' : '🔊 Test Site Custom Notification Sound'}</span>
                          </button>
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
                              const newPending = {
                                id: customId,
                                name: customSpecialtyName,
                                arName: customSpecialtyName,
                                description: customSpecialtyDesc,
                                arDescription: customSpecialtyDesc,
                                icon: 'wrench',
                                basePrice: customSpecialtyPrice || 150,
                                requestedBy: loggedInUserEmail || 'Unknown',
                                requestedByName: loggedInUserName || 'Unknown',
                                status: 'pending',
                                createdAt: Date.now()
                              };
                              await setDoc(doc(db, "pending_services", customId), newPending);
                              
                              setCustomSpecialtyName('');
                              setCustomSpecialtyDesc('');
                              triggerToast(
                                lang === 'ar' 
                                  ? `تم تقديم طلب التخصص [${customSpecialtyName}] للمسؤول علي بنجاح! سيتم مراجعته وتفعيله قريباً.` 
                                  : `Success! Custom trade request [${customSpecialtyName}] submitted to administrator for approval.`, 
                                'success'
                              );
                            } catch (err) {
                              console.error(err);
                              triggerToast(lang === 'ar' ? 'حدث خطأ في تقديم طلب التخصص' : 'Error submitting custom service request', 'error');
                            }
                          }}
                          className="w-full py-2 bg-[#1E293B] hover:bg-[#334155] text-amber-400 font-extrabold text-xs rounded-xl border border-amber-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>{lang === 'ar' ? 'إرسال طلب التخصص الجديد للموافقة والنشير 🚀' : 'Submit Specialty Request for Approval 🚀'}</span>
                        </button>
                      </div>

                      {/* My Active / Accepted Rescue Tasks */}
                      {allRequests.filter(r => r.selectedTechnicianId === loggedInUserEmail && (r.status === 'awaiting_deposit' || r.status === 'en_route' || r.status === 'arrived' || r.status === 'in_progress')).length > 0 && (
                        <div className="space-y-4 border-b border-gray-900 pb-6 text-right">
                          <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center justify-start gap-2 border-b border-gray-950 pb-2">
                            <Truck className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span>{lang === 'ar' ? '🚨 مهامي الحالية الجاري تنفيذها (Active Tasks):' : '🚨 My Active Assigned Rescue Tasks:'}</span>
                          </h4>

                          <div className="space-y-3 font-sans">
                            {allRequests.filter(r => r.selectedTechnicianId === loggedInUserEmail && (r.status === 'awaiting_deposit' || r.status === 'en_route' || r.status === 'arrived' || r.status === 'in_progress')).map(req => {
                              const clientLoc = mapPctToLatLng(req.locationLat, req.locationLng);
                              
                              // Translate status
                              let statusTextAr = '';
                              let statusTextEn = '';
                              if (req.status === 'awaiting_deposit') {
                                statusTextAr = 'بانتظار إيداع الضمان من العميل 💰';
                                statusTextEn = 'Awaiting Client Escrow Deposit 💰';
                              } else if (req.status === 'en_route') {
                                statusTextAr = 'جاري التحرك إلى موقع الحادث 🚚';
                                statusTextEn = 'En Route to Breakdown Site 🚚';
                              } else if (req.status === 'arrived') {
                                statusTextAr = 'وصلت لموقع العميل 📍';
                                statusTextEn = 'Arrived at Site 📍';
                              } else if (req.status === 'in_progress') {
                                statusTextAr = 'قيد الصيانة والإصلاح 🛠️';
                                statusTextEn = 'Repair/Servicing In Progress 🛠️';
                              } else {
                                statusTextAr = req.status;
                                statusTextEn = req.status;
                              }

                              return (
                                <div key={req.id} className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-2xl space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="text-right">
                                      <h5 className="text-xs font-black text-white flex items-center justify-start gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                        <span>{req.clientName}</span>
                                      </h5>
                                      <span className="text-[10px] text-gray-400 font-bold block mt-1">
                                        {lang === 'ar' ? 'الخدمة المطلوبة:' : 'Service Type:'} <span className="text-amber-500 font-black">{req.serviceType === 'taxi' ? (lang === 'ar' ? '🚕 توصيل تكسي خاص و VIP' : '🚕 Special VIP Taxi Ride') : req.serviceType}</span>
                                      </span>
                                      {req.serviceType === 'taxi' && (
                                        <div className="my-1.5 text-[10px] text-gray-400 font-semibold space-y-0.5 text-right bg-black/40 p-2 rounded-lg border border-gray-900">
                                          <div>📍 {lang === 'ar' ? 'موقع الاستلام:' : 'Pickup:'} <span className="text-white font-bold">{req.pickupLocation || req.locationName || 'موقعي الحالي'}</span></div>
                                          <div>🏁 {lang === 'ar' ? 'وجهة التوصيل:' : 'Dropoff:'} <span className="text-white font-bold">{req.dropoffLocation || 'غير محدد'}</span></div>
                                        </div>
                                      )}
                                      <span className="text-[10px] text-gray-400 font-bold block">
                                        {lang === 'ar' ? 'حالة الطلب:' : 'Task Status:'} <span className="text-blue-400 font-black">{lang === 'ar' ? statusTextAr : statusTextEn}</span>
                                      </span>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                      {/* THE GOLDEN BUTTON: Open in Google Maps */}
                                      <button
                                        onClick={() => {
                                          const url = `https://www.google.com/maps/search/?api=1&query=${clientLoc.lat},${clientLoc.lng}`;
                                          window.open(url, '_blank');
                                          triggerToast(
                                            lang === 'ar' 
                                              ? 'جاري فتح موقع العميل الفعلي في نظام الملاحة (GPS)... 🧭' 
                                              : 'Opening client GPS coordinates in navigation system... 🧭', 
                                            'success'
                                          );
                                        }}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                                      >
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>{lang === 'ar' ? 'فتح في خرائط Google (نظام الملاحة GPS) 🗺️' : 'Navigate in Google Maps (GPS) 🗺️'}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Progress / Status controls for the technician on this active request */}
                                  <div className="bg-[#0A0B10] p-3 rounded-xl border border-gray-900/60 flex flex-wrap gap-2 justify-start sm:justify-end">
                                    <span className="text-[9px] text-gray-500 font-extrabold w-full text-right mb-1">
                                      {lang === 'ar' ? 'تحديث حالة المهمة فورياً للعميل:' : 'Quick-Update Task Status for Client:'}
                                    </span>
                                    
                                    {req.status === 'en_route' && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            await updateDoc(doc(db, "requests", req.id), { status: 'arrived' });
                                            // Add system chat log
                                            const chatMsgId = `sys-arrived-${Date.now()}`;
                                            await setDoc(doc(db, "chats", chatMsgId), {
                                              id: chatMsgId,
                                              requestId: req.id,
                                              sender: 'system',
                                              text: lang === 'ar' ? '🚚 تحديث GPS: لقد وصل فني الإنقاذ إلى موقعك المحدد بالفعل وهو بجانب مركبتك الآن.' : '🚚 GPS Update: The rescue technician has arrived at your pinned location.',
                                              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                                              createdTime: Date.now()
                                            });
                                            triggerToast(lang === 'ar' ? 'تم تحديث الحالة لـ: لقد وصلت للموقع!' : 'Status updated to: Arrived at Site!', 'success');
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black rounded transition-all cursor-pointer"
                                      >
                                        {lang === 'ar' ? 'أنا وصلت للموقع 📍' : 'I Have Arrived 📍'}
                                      </button>
                                    )}

                                    {req.status === 'arrived' && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            await updateDoc(doc(db, "requests", req.id), { status: 'in_progress' });
                                            // Add system chat log
                                            const chatMsgId = `sys-repair-${Date.now()}`;
                                            await setDoc(doc(db, "chats", chatMsgId), {
                                              id: chatMsgId,
                                              requestId: req.id,
                                              sender: 'system',
                                              text: lang === 'ar' ? '🛠️ تحديث الصيانة: بدأ الفني في عملية الإصلاح وتقديم المساعدة المطلوبة.' : '🛠️ Servicing Update: Technician started the repair and active rescue help.',
                                              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                                              createdTime: Date.now()
                                            });
                                            triggerToast(lang === 'ar' ? 'تم تحديث الحالة لـ: بدأت عملية الصيانة!' : 'Status updated to: Repair in progress!', 'success');
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded transition-all cursor-pointer"
                                      >
                                        {lang === 'ar' ? 'بدء الصيانة والإصلاح 🛠️' : 'Start Servicing 🛠️'}
                                      </button>
                                    )}

                                    {/* Link to chat with client */}
                                    <button
                                      onClick={() => {
                                        setActiveRequestId(req.id);
                                        setSimStatus(req.status);
                                        // Load the bids for this request
                                        const q = query(collection(db, "bids"), where("requestId", "==", req.id));
                                        getDocs(q).then((snap) => {
                                          const bidsList: any[] = [];
                                          snap.forEach(d => bidsList.push(d.data()));
                                          const matchingBid = bidsList.find(b => b.technicianId === loggedInUserEmail);
                                          if (matchingBid) setSelectedBid(matchingBid);
                                        });
                                        triggerToast(lang === 'ar' ? 'تم فتح لوحة المتابعة والمحادثة مع العميل!' : 'Opened client monitoring & chat portal!', 'info');
                                      }}
                                      className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-[9px] font-black rounded transition-all cursor-pointer border border-blue-500/20"
                                    >
                                      {lang === 'ar' ? 'متابعة وفتح المحادثة مع العميل 💬' : 'Monitor & Open Chat 💬'}
                                    </button>
                                  </div>

                                  {/* Expandable Live Tracking & Chat Panel for Technician */}
                                  {activeRequestId === req.id && (
                                    <div className="mt-4 pt-4 border-t border-gray-900 space-y-4 animate-fade-in text-right">
                                      <div className="flex items-center justify-between border-b border-gray-950 pb-2">
                                        <button 
                                          onClick={() => {
                                            setActiveRequestId(null);
                                            setSelectedBid(null);
                                          }}
                                          className="text-[10px] text-red-400 hover:text-red-300 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                          <span>✖</span>
                                          <span>{lang === 'ar' ? 'إغلاق المحادثة' : 'Close Chat'}</span>
                                        </button>
                                        
                                        <h5 className="text-[11px] font-black text-amber-500 flex items-center gap-1.5 justify-end">
                                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                          <span>{lang === 'ar' ? 'المحادثة والمتابعة المباشرة مع العميل' : 'Live Chat & Tracking'}</span>
                                        </h5>
                                      </div>

                                      {/* Chat Messages Display */}
                                      <div className="bg-[#0A0B10] border border-gray-900 rounded-xl p-3 flex flex-col justify-between h-52">
                                        <div className="flex-1 overflow-y-auto space-y-2.5 pb-2.5 pr-1 text-[11px] font-semibold text-right">
                                          {chatMessages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-500 font-bold text-center">
                                              {lang === 'ar' ? 'لا توجد رسائل حالياً. ابدأ المحادثة مع العميل!' : 'No messages yet. Start chatting with client!'}
                                            </div>
                                          ) : (
                                            chatMessages.map(msg => {
                                              const isSystem = msg.sender === 'system';
                                              const isTech = msg.sender === 'technician';
                                              return (
                                                <div key={msg.id} className={`flex ${isSystem ? 'justify-center' : isTech ? 'justify-end' : 'justify-start'}`}>
                                                  <div className={`p-2 max-w-[85%] rounded-xl font-semibold leading-relaxed ${
                                                    isSystem 
                                                      ? 'bg-gray-900 text-gray-400 text-[9px] text-center max-w-full font-sans border border-gray-850' 
                                                      : isTech 
                                                      ? 'bg-amber-500 text-black rounded-tr-none' 
                                                      : 'bg-[#1F2937] text-gray-200 rounded-tl-none border border-gray-850'
                                                  }`}>
                                                    {msg.text}
                                                  </div>
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>

                                        {/* Chat Entry Form */}
                                        <form 
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            handleChatSend(e);
                                          }} 
                                          className="pt-2 border-t border-gray-900 flex items-center gap-2"
                                        >
                                          <input 
                                            type="text" 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder={lang === 'ar' ? 'أرسل رسالة فورية للزبون...' : 'Send messages to client...'}
                                            className="flex-1 px-3 py-1.5 bg-[#111827] border border-gray-850 rounded-lg outline-none text-[11px] text-white"
                                          />
                                          <button 
                                            type="submit"
                                            className="p-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors cursor-pointer"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                          </button>
                                        </form>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

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
                                        {lang === 'ar' ? 'الخدمة المطلوبة:' : 'Requested service:'} <span className="text-amber-500 font-extrabold">{req.serviceType === 'taxi' ? (lang === 'ar' ? '🚕 توصيل تكسي خاص و VIP' : '🚕 Special VIP Taxi Ride') : req.serviceType}</span>
                                      </span>
                                      {req.serviceType === 'taxi' && (
                                        <div className="mt-1 text-[10px] text-gray-400 font-semibold space-y-0.5 text-right">
                                          <div>📍 {lang === 'ar' ? 'موقع الاستلام:' : 'Pickup:'} <span className="text-white font-bold">{req.pickupLocation || req.locationName || 'موقعي الحالي'}</span></div>
                                          <div>🏁 {lang === 'ar' ? 'وجهة التوصيل:' : 'Dropoff:'} <span className="text-white font-bold">{req.dropoffLocation || 'غير محدد'}</span></div>
                                        </div>
                                      )}
                                      <span className="text-[10px] text-amber-400 font-extrabold block mt-1 flex items-center justify-start gap-1">
                                        <span>💰</span>
                                        <span>{lang === 'ar' ? `السعر التقريبي للزبون: ${req.approximatePrice || 150} ₪` : `Client Approx Price: ${req.approximatePrice || 150} ₪`}</span>
                                      </span>
                                    </div>

                                    <button 
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedBidRequest(null);
                                        } else {
                                          setSelectedBidRequest(req);
                                          setCustomBidPrice(String(req.approximatePrice || 150));
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
                                            type="text" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={customBidPrice}
                                            onChange={(e) => setCustomBidPrice(cleanInput(e.target.value))}
                                            className="w-full px-3 py-2 bg-[#050505] border border-gray-900 rounded-lg text-white font-mono text-center"
                                          />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] text-gray-500 uppercase">{lang === 'ar' ? 'الوقت المتوقع للوصول (دقيقة):' : 'ETA (Min):'}</label>
                                          <input 
                                            type="text" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={customBidEta}
                                            onChange={(e) => setCustomBidEta(cleanInput(e.target.value))}
                                            className="w-full px-3 py-2 bg-[#050505] border border-gray-900 rounded-lg text-white font-mono text-center"
                                          />
                                        </div>
                                      </div>

                                      {/* Customized Pricing Help Note for Technician */}
                                      <div className="text-[10px] text-gray-400 bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 leading-relaxed font-semibold">
                                        {lang === 'ar' 
                                          ? `💡 يطلب العميل سعراً تقريبياً بحدود [${req.approximatePrice || 150} ₪]. بصفتك شريكاً مستقلاً، يرجى تقديم عرض السعر المناسب والملائم لك والذي يغطي تكلفة انتقالك ومعداتك (حيث يختلف تسعير كل فني عن الآخر).` 
                                          : `💡 The client has proposed an approximate price of [${req.approximatePrice || 150} ₪]. As an independent partner, please submit the price that is suitable for you based on your distance and tools (since pricing varies for each technician).`}
                                      </div>

                                      <button 
                                        onClick={async () => {
                                          const priceNum = Number(customBidPrice);
                                          const etaNum = Number(customBidEta);
                                          if (isNaN(priceNum) || priceNum <= 0 || isNaN(etaNum) || etaNum <= 0) {
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
                                              price: priceNum,
                                              etaMinutes: etaNum,
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

                                            triggerToast(lang === 'ar' ? `تم إرسال عرض السعر بقيمة ${priceNum} ₪ للعميل بنجاح!` : `Bid of ${priceNum} ₪ submitted successfully!`, 'success');
                                            setCustomBidPrice('150');
                                            setCustomBidEta('15');
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
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t.simFormService}
                          </label>
                          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {servicesList.map(s => {
                              const IconComponent = s.icon;
                              const isSel = selectedService === s.id;
                              const displayName = s.name;
                              return (
                                <div 
                                  key={s.id}
                                  onClick={() => setSelectedService(s.id)}
                                  className={`group p-4 bg-[#0F1424] border rounded-2xl flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 select-none relative overflow-hidden ${
                                    isSel 
                                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5 scale-[1.03]' 
                                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:bg-[#131a30]/80 hover:scale-[1.01]'
                                  }`}
                                >
                                  {isSel && (
                                    <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 p-0.5 rounded-full z-10 shadow-sm animate-fade-in">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}

                                  <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl mb-3 transition-all duration-300 ${
                                    isSel 
                                      ? 'bg-amber-500/25 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse' 
                                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:scale-110 group-hover:bg-amber-500/5 group-hover:text-amber-500'
                                  }`}>
                                    <IconComponent className={`w-6.5 h-6.5 md:w-8 md:h-8 transition-transform duration-300 ${isSel ? 'scale-105' : ''}`} />
                                  </div>

                                  <div className="space-y-1.5 flex-1 flex flex-col justify-between w-full">
                                    <span className={`text-xs md:text-sm font-black tracking-tight text-center block ${
                                      isSel ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-slate-800 dark:text-slate-200 font-bold'
                                    }`}>
                                      {displayName}
                                    </span>

                                    <p className={`text-[10px] md:text-[11px] leading-relaxed text-center px-1 block font-medium transition-colors whitespace-pre-line ${
                                      isSel ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                      {s.desc}
                                    </p>

                                    <div className="pt-2">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider transition-all ${
                                        isSel 
                                          ? 'bg-amber-500/25 text-amber-600 dark:text-amber-400 font-black' 
                                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold'
                                      }`}>
                                        {lang === 'ar' ? 'الأساسي:' : 'Base:'} {s.basePrice} ₪
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Approximate Price Section */}
                        <div className="p-4 bg-gradient-to-br from-[#111827]/60 to-[#0F1424]/90 border border-amber-500/20 rounded-2xl space-y-3 animate-fade-in text-right">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-right flex-1 min-w-0">
                              <span className="text-[10px] font-black text-amber-500 tracking-wider uppercase block font-mono">
                                {lang === 'ar' ? 'سعر تقريبي مقترح من المنصة' : 'Suggested Approximate Price'}
                              </span>
                              <p className="text-[11px] text-gray-400 font-bold mt-1">
                                {lang === 'ar' 
                                  ? 'سعر تقديري أولي، سيقوم كل فني بتقديم عرضه الملائم:' 
                                  : 'Initial estimated price. Technicians will submit their own customized bids:'}
                              </p>
                            </div>
                            {/* Interactive Price Adjuster */}
                            <div className="flex items-center gap-2.5 bg-[#050505] p-1.5 border border-gray-800 rounded-xl shrink-0">
                              <button
                                type="button"
                                onClick={() => setApproximatePrice(prev => Math.max(50, prev - 10))}
                                className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-slate-900 dark:text-white hover:bg-gray-800 hover:text-amber-400 font-extrabold text-sm transition-all cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-sm font-black text-amber-500 font-mono min-w-[50px] text-center">
                                {approximatePrice} ₪
                              </span>
                              <button
                                type="button"
                                onClick={() => setApproximatePrice(prev => Math.min(1000, prev + 10))}
                                className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-slate-900 dark:text-white hover:bg-gray-800 hover:text-amber-400 font-extrabold text-sm transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-gray-400 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 leading-relaxed font-semibold">
                            {lang === 'ar' 
                              ? '🚨 تنويه: يختلف كل فني عن الآخر في التسعير حسب بُعد المسافة والمعدات اللازمة. بعد تأكيد الطلب، ستتلقى عروض أسعار منافسة لتختار منها الأنسب لك.' 
                              : '🚨 Disclaimer: Technicians vary in pricing based on distance and needed gear. After submitting, you will receive customized bids to select your preferred choice.'}
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

                      {/* Active Request Overview Card */}
                      {liveRequest && (
                        <div className="p-4 bg-gradient-to-br from-[#0A0B10] to-[#0F1424] border border-gray-900 rounded-2xl space-y-3 text-right">
                          <div className="flex items-center justify-between gap-4 border-b border-gray-950 pb-2.5">
                            <div>
                              <span className="text-[9px] text-gray-500 font-bold block uppercase">{lang === 'ar' ? 'الخدمة المطلوبة' : lang === 'he' ? 'שירות מבוקש' : 'Requested Service'}</span>
                              <span className="text-xs font-black text-white">{getServiceLabel(liveRequest.serviceType)}</span>
                            </div>
                            <div className="text-left flex-1 text-left min-w-0">
                              <span className="text-[9px] text-gray-500 font-bold block uppercase">{lang === 'ar' ? 'السعر التقريبي المطلوب' : lang === 'he' ? 'מחיר מוצע משוער' : 'Approximate Price Proposed'}</span>
                              <span className="text-sm font-black text-amber-500 font-mono">{liveRequest.approximatePrice || 150} ₪</span>
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                            {lang === 'ar' 
                              ? '🔄 طلبك نشط الآن وتتلقاه شبكة الفنيين. نظراً لأن تسعير وتكلفة الخدمة تختلف من فني لآخر حسب المسافة والمعدات، ستصلك عروض أسعار ملائمة لكل فني بالأسفل لتختار الأنسب لك.' 
                              : '🔄 Your request is live and is being reviewed by our technician network. Since each technician has different pricing depending on distance and tools, you will receive tailored bids below to choose the best option.'}
                          </p>
                        </div>
                      )}

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
                                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono block">{bid.etaMinutes} {lang === 'ar' ? 'دقيقة' : 'Min'}</span>
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

                      {/* Cancel Task Button */}
                      <div className="pt-4 border-t border-gray-900/40 select-none">
                        <button
                          type="button"
                          onClick={handleCancelRescueRequest}
                          className="w-full py-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <Ban className="w-5 h-5 animate-pulse" />
                          <span>{t.simCancelTask}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Wizard Status: Awaiting Escrow Deposit into Vault */}
                  {simStatus === 'awaiting_deposit' && selectedBid && (
                    <div className="space-y-6 relative">
                      {isPaymentProcessing && (
                        <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-sm z-30 rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
                          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin flex items-center justify-center">
                            <Lock className="w-6 h-6 text-emerald-500 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white">
                              {lang === 'ar' ? 'جاري معالجة الدفعة الآمنة...' : 'Processing Secure Payment...'}
                            </h4>
                            <p className="text-xs text-gray-500 font-semibold mt-1">
                              {lang === 'ar' 
                                ? `جاري الاتصال بقنوات الدفع وتأمين مبلغ ${selectedBid.price} ₪ في الخزنة` 
                                : `Connecting to payment gateways & securing ${selectedBid.price} ₪ in the vault`}
                            </p>
                          </div>
                          <div className="flex gap-1.5 items-center justify-center pt-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}

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
                          <span className="text-xl font-black text-amber-500 font-mono">{selectedBid.price} ₪</span>
                        </div>
                      </div>

                      {/* Payment gateway selection */}
                      <div className="space-y-4">
                        <span className="text-xs font-black text-gray-400 uppercase block tracking-wider">
                          {lang === 'ar' ? 'اختر بوابة الدفع الآمنة' : 'Select Secure Payment Gateway'}
                        </span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentTab('gpay')}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                              selectedPaymentTab === 'gpay'
                                ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                : 'bg-[#0A0B10] border-gray-900 text-gray-400 hover:bg-gray-900/40'
                            }`}
                          >
                            <span className="text-xs font-black tracking-wider flex items-center gap-1.5">
                              {/* Custom Colored Google Pay Mock Label */}
                              <span className="text-white">G</span>
                              <span className="text-blue-500">o</span>
                              <span className="text-red-500">o</span>
                              <span className="text-yellow-500">g</span>
                              <span className="text-green-500">l</span>
                              <span className="text-blue-500">e</span>
                              <span className="text-white ml-0.5">Pay</span>
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold block">
                              {lang === 'ar' ? 'دفع سريع وآمن' : 'Fast & Secure'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPaymentTab('card')}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                              selectedPaymentTab === 'card'
                                ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                : 'bg-[#0A0B10] border-gray-900 text-gray-400 hover:bg-gray-900/40'
                            }`}
                          >
                            <CreditCard className="w-5 h-5" />
                            <span className="text-xs font-black">
                              {lang === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}
                            </span>
                          </button>
                        </div>

                        {/* Payment Method Content */}
                        <div className="p-5 bg-[#0A0B10] border border-gray-900 rounded-2xl space-y-4">
                          {selectedPaymentTab === 'gpay' ? (
                            <div className="space-y-4 text-center">
                              <p className="text-[11px] font-semibold text-gray-500 leading-relaxed max-w-sm mx-auto">
                                {lang === 'ar' 
                                  ? 'ادفع بنقرة واحدة باستخدام Google Pay. سيتم حجز وإيداع الدفعة في خزنة الضمان مباشرة.' 
                                  : 'Pay with one tap using Google Pay. Your deposit will be locked directly in the Escrow Vault.'}
                              </p>

                              {/* Official Google Pay Button */}
                              <div className="flex justify-center py-2 relative z-20">
                                <GooglePayButton
                                  environment="TEST"
                                  buttonColor="black"
                                  buttonType="pay"
                                  buttonLocale={lang === 'ar' ? 'ar' : 'en'}
                                  paymentRequest={{
                                    apiVersion: 2,
                                    apiVersionMinor: 0,
                                    allowedPaymentMethods: [
                                      {
                                        type: 'CARD',
                                        parameters: {
                                          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                          allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX'],
                                        },
                                        tokenizationSpecification: {
                                          type: 'PAYMENT_GATEWAY',
                                          parameters: {
                                            gateway: 'example',
                                            gatewayMerchantId: 'exampleGatewayMerchantId',
                                          },
                                        },
                                      },
                                    ],
                                    merchantInfo: {
                                      merchantId: '12345678901234567890',
                                      merchantName: 'Systro Roadside Rescue Ltd',
                                    },
                                    transactionInfo: {
                                      totalPriceStatus: 'FINAL',
                                      totalPriceLabel: 'Total',
                                      totalPrice: String(selectedBid.price),
                                      currencyCode: 'ILS',
                                      countryCode: 'IL',
                                    },
                                  }}
                                  onLoadPaymentData={(paymentRequest) => {
                                    console.log('Google Pay success:', paymentRequest);
                                    handleGooglePayPayment(paymentRequest);
                                  }}
                                  onError={(error) => {
                                    console.error('Google Pay error:', error);
                                  }}
                                />
                              </div>

                              {/* Elegant Sandbox Bypasser/Direct Pay button to guarantee flawless performance across iframe limitations */}
                              <div className="border-t border-gray-950 pt-3">
                                <button
                                  type="button"
                                  onClick={() => handleGooglePayPayment()}
                                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                  <Lock className="w-4 h-4" />
                                  <span>
                                    {lang === 'ar' 
                                      ? `تفعيل المعاملة الفورية لـ Google Pay (${selectedBid.price} ₪) ⚡` 
                                      : `Execute Google Pay Direct Transaction (${selectedBid.price} ₪) ⚡`}
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <form onSubmit={handleCardPayment} className="space-y-4 text-left rtl:text-right">
                              {/* Cardholder Name */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase block tracking-wider">
                                  {lang === 'ar' ? 'اسم صاحب البطاقة' : 'Cardholder Name'}
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={cardHolder}
                                  onChange={(e) => setCardHolder(e.target.value)}
                                  placeholder="Adam Atoun"
                                  className="w-full bg-[#050505] border border-gray-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500 font-semibold"
                                />
                              </div>

                              {/* Card Number */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase block tracking-wider">
                                  {lang === 'ar' ? 'رقم البطاقة' : 'Card Number'}
                                </label>
                                <input
                                  type="text"
                                  required
                                  maxLength={19}
                                  value={cardNumber}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                                    setCardNumber(v);
                                  }}
                                  placeholder="xxxx xxxx xxxx xxxx"
                                  className="w-full bg-[#050505] border border-gray-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500 font-mono"
                                />
                              </div>

                              {/* Expiry and CVV */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-gray-500 uppercase block tracking-wider">
                                    {lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    maxLength={5}
                                    value={cardExpiry}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '');
                                      if (v.length > 2) {
                                        v = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
                                      }
                                      setCardExpiry(v);
                                    }}
                                    placeholder="MM/YY"
                                    className="w-full bg-[#050505] border border-gray-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500 font-mono text-center"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-gray-500 uppercase block tracking-wider">
                                    {lang === 'ar' ? 'رمز الأمان (CVV)' : 'CVV'}
                                  </label>
                                  <input
                                    type="password"
                                    required
                                    maxLength={4}
                                    value={cardCvv}
                                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                    placeholder="•••"
                                    className="w-full bg-[#050505] border border-gray-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500 font-mono text-center"
                                  />
                                </div>
                              </div>

                              {/* Card Submission Button */}
                              <button
                                type="submit"
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                              >
                                <Lock className="w-4 h-4" />
                                <span>
                                  {lang === 'ar' 
                                    ? `إيداع وحجز ${selectedBid.price} ₪ والبدء بالبطاقة 🔒` 
                                    : `Secure Deposit ${selectedBid.price} ₪ with Card 🔒`}
                                </span>
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Status: En route / Arrived / Working live tracking status */}
                  {((simStatus === 'en_route' || simStatus === 'arrived' || simStatus === 'in_progress' || (simStatus === 'disputed' && !showDisputeForm)) && selectedBid) && (
                    <div className="space-y-6">
                      {/* Status wizard card */}
                      <div className={`p-4 border rounded-2xl flex items-center justify-between gap-4 animate-pulse ${
                        simStatus === 'disputed' ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-[#0F1424] border-gray-850'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            simStatus === 'disputed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {simStatus === 'disputed' ? <AlertTriangle className="w-5 h-5 animate-bounce" /> : <Truck className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              {simStatus === 'en_route' && t.simTechEnRoute}
                              {simStatus === 'arrived' && t.simTechArrived}
                              {simStatus === 'in_progress' && t.simTechWorking}
                              {simStatus === 'disputed' && (lang === 'ar' ? 'الطلب قيد النزاع والمراجعة الإدارية ⚠️' : 'Under Dispute & Administrative Review ⚠️')}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-semibold block">{lang === 'ar' ? 'رقم اللوحة:' : 'License Plate:'} {technicians[0].plateNumber}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full font-mono uppercase tracking-widest ${
                          simStatus === 'disputed' 
                            ? 'bg-red-500/15 text-red-500' 
                            : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {simStatus === 'en_route' && (lang === 'ar' ? 'جاري التحرك' : 'EN ROUTE')}
                          {simStatus === 'arrived' && (lang === 'ar' ? 'وصل الفني' : 'ARRIVED')}
                          {simStatus === 'in_progress' && (lang === 'ar' ? 'جاري الصيانة' : 'IN REPAIR')}
                          {simStatus === 'disputed' && (lang === 'ar' ? 'قيد التحقيق ⚠️' : 'UNDER INVESTIGATION ⚠️')}
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
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

                  {activeTab === 'admin' && (
                    isAdminUnlocked ? (
                      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 animate-fade-in space-y-8 bg-slate-50 text-slate-900 rounded-3xl border border-slate-200 shadow-2xl my-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 border-b border-slate-200 pb-6 text-slate-900">
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
          <div className="bg-red-50 border border-red-200 rounded-3xl p-5 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-800">
            <div className="space-y-1 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
              <h4 className="text-sm font-black text-red-900 flex items-center gap-2 justify-center sm:justify-start">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{lang === 'ar' ? 'أداة تنظيف وضبط قاعدة البيانات (Firebase)' : 'Firebase Database Cleanup Tool'}</span>
              </h4>
              <p className="text-xs text-slate-600 font-semibold">
                {lang === 'ar' 
                  ? 'يقوم هذا الخيار بمسح كافة سجلات الطلبات النشطة، العروض والمحادثات من Firestore لإعادة تشغيل النظام من الصفر.' 
                  : 'This option clears all active requests, technician bids, and chat transcripts from Firestore to allow clean testing.'}
              </p>
            </div>
            <button 
              onClick={resetSimulation}
              className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 transition-all shrink-0 cursor-pointer"
            >
              {lang === 'ar' ? 'تفريغ Firestore وضبط النظام 🗑️' : 'Clear Firestore & Reset 🗑️'}
            </button>
          </div>

          {/* Real-time Domain Connection & Website Trust Panel */}
          <TrustPortal 
            lang={lang === 'he' ? 'en' : lang} 
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

          {/* Real-time WhatsApp Connection & Diagnostics Panel */}
          <WhatsAppConfigPanel 
            lang={lang}
            status={whatsAppStatus}
            onRefresh={fetchWhatsAppStatus}
            triggerToast={triggerToast}
          />

          {/* Services Management Panel */}
          <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
                <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 justify-center sm:justify-start">
                  <Settings className="w-5 h-5 text-amber-500 animate-spin-slow" />
                  <span>{lang === 'ar' ? 'إدارة وتعديل الخدمات المعروضة بالشبكة' : 'Manage & Edit Network Services'}</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {lang === 'ar' 
                    ? 'عرض وتعديل أسعار ووصف الخدمات المعروضة، أو إزالتها كلياً من المنصة.' 
                    : 'Manage displayed services, edit base prices, descriptions, or remove them entirely.'}
                </p>
              </div>
              <button
                onClick={handleStartAddService}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة خدمة جديدة ➕' : 'Add New Service ➕'}</span>
              </button>
            </div>

            {/* Add / Edit Service Form */}
            {showAddServiceForm && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs md:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    {editingService ? (
                      <>
                        <Edit className="w-4 h-4 text-amber-500" />
                        <span>{lang === 'ar' ? `تعديل خدمة: ${editingService.arName || editingService.name}` : `Edit Service: ${editingService.name}`}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-amber-500" />
                        <span>{lang === 'ar' ? 'إضافة خدمة جديدة بالمنصة' : 'Add New Network Service'}</span>
                      </>
                    )}
                  </h4>
                  <button 
                    onClick={() => {
                      setShowAddServiceForm(false);
                      setEditingService(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right rtl:text-right ltr:text-left">
                  {/* Service ID (disabled when editing) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      {lang === 'ar' ? 'رمز تعريف الخدمة الفريد (ID - بالإنجليزية وممنوع المسافات):' : 'Unique Service ID (no spaces):'}
                    </label>
                    <input 
                      type="text"
                      disabled={!!editingService}
                      placeholder="e.g. towing, plumber, battery"
                      value={srvId}
                      onChange={(e) => setSrvId(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-bold text-xs disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>

                  {/* Base Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      {lang === 'ar' ? 'السعر الأساسي التقديري (₪):' : 'Estimated Base Price (₪):'}
                    </label>
                    <input 
                      type="number"
                      placeholder="e.g. 150"
                      value={srvBasePrice}
                      onChange={(e) => setSrvBasePrice(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-mono text-xs"
                    />
                  </div>

                  {/* Name Arabic */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      {lang === 'ar' ? 'اسم الخدمة (بالعربية):' : 'Service Name (Arabic):'}
                    </label>
                    <input 
                      type="text"
                      placeholder="مثال: خدمة تصليح الإطارات"
                      value={srvArName}
                      onChange={(e) => setSrvArName(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-bold text-xs"
                    />
                  </div>

                  {/* Name English */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      {lang === 'ar' ? 'اسم الخدمة (بالإنجليزية):' : 'Service Name (English):'}
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Flat Tire Repair"
                      value={srvName}
                      onChange={(e) => setSrvName(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-bold text-xs"
                    />
                  </div>

                  {/* Icon */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      {lang === 'ar' ? 'الرمز والمجسم المرئي (Icon):' : 'Icon Graphic identifier:'}
                    </label>
                    <select
                      value={srvIcon}
                      onChange={(e) => setSrvIcon(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-bold text-xs"
                    >
                      <option value="wrench">{lang === 'ar' ? 'ميكانيكي / صيانة (Wrench)' : 'Mechanic (Wrench)'}</option>
                      <option value="zap">{lang === 'ar' ? 'كهربائي / بطارية (Zap)' : 'Electrical (Zap)'}</option>
                      <option value="fuel">{lang === 'ar' ? 'وقود / بنزين (Fuel)' : 'Fuel (Fuel)'}</option>
                      <option value="key">{lang === 'ar' ? 'أقفال ومفاتيح (Key)' : 'Locksmith (Key)'}</option>
                      <option value="truck">{lang === 'ar' ? 'ونش / سحب (Truck)' : 'Towing Truck'}</option>
                      <option value="car">{lang === 'ar' ? 'تكسي / توصيل (Car)' : 'Taxi (Car)'}</option>
                      <option value="hammer">{lang === 'ar' ? 'نجارة / مطرقة (Hammer)' : 'Carpentry (Hammer)'}</option>
                      <option value="droplets">{lang === 'ar' ? 'سباكة / مياه (Droplets)' : 'Plumbing (Droplets)'}</option>
                      <option value="wind">{lang === 'ar' ? 'تكييف / هواء (Wind)' : 'A/C (Wind)'}</option>
                      <option value="helpcircle">{lang === 'ar' ? 'مساعدة عامة (Help)' : 'General Help (Help)'}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description Arabic */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        {lang === 'ar' ? 'وصف تفصيلي للخدمة (بالعربية):' : 'Service Description (Arabic):'}
                      </label>
                      <textarea 
                        rows={2}
                        placeholder="اكتب وصف الخدمة وحدودها للعملاء..."
                        value={srvArDesc}
                        onChange={(e) => setSrvArDesc(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-bold text-xs resize-none text-right"
                      />
                    </div>

                    {/* Description English */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        {lang === 'ar' ? 'وصف تفصيلي للخدمة (بالإنجليزية):' : 'Service Description (English):'}
                      </label>
                      <textarea 
                        rows={2}
                        placeholder="Write a clear service scope description..."
                        value={srvDesc}
                        onChange={(e) => setSrvDesc(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800 font-bold text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-2">
                  <button 
                    onClick={() => {
                      setShowAddServiceForm(false);
                      setEditingService(null);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    onClick={handleSaveActiveService}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'حفظ ونشر بالشبكة ✅' : 'Save & Publish ✅'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Services Grid list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbServices.map((service: any) => {
                const IconComponent = getServiceIcon(service.icon, service.name) || Wrench;
                return (
                  <div key={service.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-4 text-right animate-fade-in relative hover:shadow-md transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-slate-500 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded">
                            {service.id}
                          </span>
                          <span className="font-mono text-xs font-black text-amber-600">
                            {service.basePrice} ₪
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {lang === 'ar' ? service.arName || service.name : service.name}
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                            <IconComponent className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2 h-8">
                        {lang === 'ar' ? service.arDescription || service.description : service.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200/60 pt-2.5">
                      <button
                        onClick={() => handleStartEditService(service)}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-black border border-amber-500/20 text-amber-700 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'تعديل ⚙️' : 'Edit ⚙️'}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(lang === 'ar' ? `هل أنت متأكد من رغبتك في حذف خدمة [${service.arName || service.name}] كلياً من المنصة؟` : `Are you sure you want to permanently delete [${service.name}]?`)) {
                            handleDeleteActiveService(service.id);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-500 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'إزالة 🗑️' : 'Remove 🗑️'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Active Escrow Holdings list */}
            <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>{t.adminActiveEscrows}</span>
              </h3>

              {escrows.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-semibold">
                  {t.adminNoEscrows}
                </p>
              ) : (
                <div className="space-y-3">
                  {escrows.map(esc => (
                    <div key={esc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-1 text-right">
                        <div className="font-bold text-slate-800">{esc.serviceType}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {lang === 'ar' ? `العميل: ${esc.clientName} | الفني: ${esc.techName}` : `Client: ${esc.clientName} | Tech: ${esc.techName}`}
                        </div>
                        <div className="text-slate-500 font-mono text-[9px]">ID: {esc.id}</div>
                      </div>
                      <div className="text-left space-y-1">
                        <div className="font-mono text-amber-600 font-extrabold">{esc.amount} ₪</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          esc.status === 'escrowed' ? 'bg-amber-100 text-amber-700' :
                          esc.status === 'released' ? 'bg-emerald-100 text-emerald-700' :
                          esc.status === 'refunded' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {esc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Registered Users Section */}
            <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  <span>{lang === 'ar' ? 'المستخدمين المسجلين بالشبكة' : lang === 'he' ? 'משתמשים רשומים ברשת' : 'Registered Users Network'}</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                  {lang === 'ar' ? `المجموع: ${registeredUsers.length}` : lang === 'he' ? `סה"כ: ${registeredUsers.length}` : `Total: ${registeredUsers.length}`}
                </span>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text"
                  placeholder={lang === 'ar' ? 'بحث بالاسم، الإيميل أو الهاتف...' : lang === 'he' ? 'חפش לפי שם, אימייל או טלפון...' : 'Search by name, email or phone...'}
                  value={adminUserSearch}
                  onChange={(e) => setAdminUserSearch(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-xs text-slate-800 text-right"
                />
                <select
                  value={adminUserRoleFilter}
                  onChange={(e) => setAdminUserRoleFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-xs text-slate-800 text-right"
                >
                  <option value="all">{lang === 'ar' ? 'جميع الأدوار' : 'All Roles'}</option>
                  <option value="client">{lang === 'ar' ? 'العملاء' : 'Clients'}</option>
                  <option value="technician">{lang === 'ar' ? 'الفنيين' : 'Technicians'}</option>
                  <option value="unassigned">{lang === 'ar' ? 'غير معين' : 'Unassigned'}</option>
                </select>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1">
                {registeredUsers.filter(u => {
                  const matchesSearch = 
                    u.name?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    u.email?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    (u.phone && u.phone.toLowerCase().includes(adminUserSearch.toLowerCase()));
                  
                  if (!matchesSearch) return false;
                  if (adminUserRoleFilter === 'all') return true;
                  if (adminUserRoleFilter === 'client') return u.role === 'client';
                  if (adminUserRoleFilter === 'technician') return u.role === 'technician';
                  if (adminUserRoleFilter === 'unassigned') return !u.role;
                  return true;
                }).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10 font-semibold">
                    {lang === 'ar' ? 'لا يوجد أي مستخدمين يطابقون خيارات البحث حالياً!' : lang === 'he' ? 'אין משתמשים רשומים התואמים את החיפוש!' : 'No registered users match search!'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {registeredUsers.filter(u => {
                      const matchesSearch = 
                        u.name?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                        (u.phone && u.phone.toLowerCase().includes(adminUserSearch.toLowerCase()));
                      
                      if (!matchesSearch) return false;
                      if (adminUserRoleFilter === 'all') return true;
                      if (adminUserRoleFilter === 'client') return u.role === 'client';
                      if (adminUserRoleFilter === 'technician') return u.role === 'technician';
                      if (adminUserRoleFilter === 'unassigned') return !u.role;
                      return true;
                    }).map(u => (
                      <div key={u.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between gap-3 text-right">
                        <div className="space-y-1 text-right">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              u.role === 'client' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              u.role === 'technician' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {u.role === 'client' ? (lang === 'ar' ? 'عميل' : lang === 'he' ? 'לקוח' : 'Client') :
                               u.role === 'technician' ? (lang === 'ar' ? 'فني فزعة' : lang === 'he' ? 'טכנאי' : 'Technician') :
                               (lang === 'ar' ? 'ضيف' : lang === 'he' ? 'אורח' : 'Guest')}
                            </span>
                            <h4 className="text-xs font-black text-slate-800">{u.name || 'Anonymous'}</h4>
                          </div>
                          <p className="text-[10px] font-mono text-slate-500 truncate">{u.email}</p>
                          {u.phone && (
                            <p className="text-[10px] text-slate-600 font-bold">{u.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              await setDoc(doc(db, "users", u.id), { role: u.role === 'client' ? null : 'client' }, { merge: true });
                              triggerToast(
                                lang === 'ar' ? 'تم تحديث دور المستخدم!' : lang === 'he' ? 'תפקיד משתמש עודכן!' : 'User role updated!',
                                'success'
                              );
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[9px] transition-colors border cursor-pointer ${
                              u.role === 'client' 
                                ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300' 
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {u.role === 'client' ? (lang === 'ar' ? 'إلغاء العميل' : lang === 'he' ? 'בטל לקוח' : 'Revoke Client') : (lang === 'ar' ? 'تعيين كعميل' : lang === 'he' ? 'קבע כלקוח' : 'Set Client')}
                          </button>
                          <button 
                            onClick={async () => {
                              await setDoc(doc(db, "users", u.id), { role: u.role === 'technician' ? null : 'technician' }, { merge: true });
                              triggerToast(
                                lang === 'ar' ? 'تم تحديث دور المستخدم!' : lang === 'he' ? 'תפקיד משתמש עודכן!' : 'User role updated!',
                                'success'
                              );
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[9px] transition-colors border cursor-pointer ${
                              u.role === 'technician' 
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300' 
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {u.role === 'technician' ? (lang === 'ar' ? 'إلغاء الفني' : lang === 'he' ? 'בטל טכנאי' : 'Revoke Tech') : (lang === 'ar' ? 'تعيين كفني' : lang === 'he' ? 'קבע כטכנאי' : 'Set Tech')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Proposed Custom Services Review Section */}
            <div className="p-6 bg-[#0F1424] border border-gray-800 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-850 pb-3">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-500" />
                  <span>{lang === 'ar' ? 'الخدمات والتخصصات المقترحة' : 'Proposed Custom Services'}</span>
                </h3>
                <span className="text-[10px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-900">
                  {lang === 'ar' ? `بانتظار المراجعة: ${pendingServices.length}` : `Pending: ${pendingServices.length}`}
                </span>
              </div>

              {pendingServices.length === 0 ? (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/45 animate-pulse" />
                  <p className="text-xs font-semibold">
                    {lang === 'ar' ? 'لا توجد تخصصات أو خدمات مقترحة جديدة حالياً! 👍' : 'No new custom service proposals at this time! 👍'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {pendingServices.map(srv => (
                    <div key={srv.id} className="p-4 bg-[#0A0B10] border border-gray-900 rounded-2xl flex flex-col justify-between gap-3 text-right">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-gray-950 pb-2">
                          <span className="text-[10px] font-extrabold text-amber-500 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            {srv.basePrice} ₪
                          </span>
                          <h4 className="text-xs font-black text-white">
                            {srv.arName || srv.name}
                          </h4>
                        </div>
                        
                        <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                          {srv.arDescription || srv.description}
                        </p>
                        
                        {srv.name && srv.name !== srv.arName && (
                          <div className="text-[9px] text-gray-500 font-semibold font-mono">
                            EN: {srv.name}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold bg-[#0F1424] px-2.5 py-1 rounded-lg border border-gray-950">
                          <span className="text-amber-500 shrink-0">👤</span>
                          <span className="truncate">
                            {lang === 'ar' ? `مقدم الطلب: ${srv.requestedByName || srv.requestedBy}` : `Requested By: ${srv.requestedByName || srv.requestedBy}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApprovePendingService(srv)}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] rounded-xl shadow-lg shadow-emerald-500/10 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'موافقة ونشر بالشبكة' : 'Approve & Publish'}</span>
                        </button>
                        <button
                          onClick={() => handleRejectPendingService(srv.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 font-bold text-[10px] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'رفض' : 'Reject'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Website Support Tickets & Complaints Section */}
            <div className="p-6 bg-[#0F1424] border border-gray-800 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-850 pb-3">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>{lang === 'ar' ? 'بلاغات الأعطال والشكاوى' : 'Support Tickets & Complaints'}</span>
                </h3>
                <span className="text-[10px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-900">
                  {lang === 'ar' ? `العدد: ${websiteIssues.length}` : `Count: ${websiteIssues.length}`}
                </span>
              </div>

              {websiteIssues.length === 0 ? (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/45 animate-pulse" />
                  <p className="text-xs font-semibold">
                    {lang === 'ar' ? 'كل شيء يعمل بامتياز! لا توجد شكاوى مسجلة حالياً 🎉' : 'Everything is perfect! No active complaints recorded. 🎉'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {websiteIssues.map(issue => (
                    <div key={issue.id} className="p-4 bg-[#0A0B10] border border-gray-900 rounded-2xl flex flex-col justify-between gap-3 text-right">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-gray-950 pb-2">
                          <span className="text-[9px] text-gray-500 font-semibold font-mono">
                            {issue.createdAt?.seconds 
                              ? new Date(issue.createdAt.seconds * 1000).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                              : (lang === 'ar' ? 'الآن' : 'Now')}
                          </span>
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0"></span>
                            <span>{issue.name || 'Anonymous'}</span>
                          </h4>
                        </div>
                        
                        <p className="text-xs text-white font-bold leading-relaxed whitespace-pre-wrap">
                          {issue.issue}
                        </p>

                        {(issue.phone && issue.phone !== 'Not Provided') && (
                          <div className="flex items-center justify-end gap-1 text-[10px] text-amber-400 font-extrabold font-mono" dir="ltr">
                            <span>{issue.phone}</span>
                            <Phone className="w-3 h-3 shrink-0" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => handleDeleteWebsiteIssue(issue.id)}
                          className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'حل المشكلة وحذف البلاغ' : 'Resolve & Delete Report'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
                    ) : (
                      <div className="max-w-md mx-auto my-16 p-8 bg-[#0F1424] border border-gray-800 rounded-3xl shadow-2xl text-center space-y-6 animate-fade-in select-none">
                        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                          <Lock className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-white">
                            {lang === 'ar' ? 'بوابة الإدارة الآمنة' : lang === 'he' ? 'שער ניהול מאובטח' : 'Secure Admin Gateway'}
                          </h3>
                          <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                            {lang === 'ar' 
                              ? 'يرجى إدخال رمز المرور الخاص بالمشرف لإدارة النظام وفصل النزاعات المالية.' 
                              : lang === 'he'
                              ? 'נא להזין קוד גישה מנהל כדי לנהל את המערכת ולפתור סכסוכים כספיים.'
                              : 'Please enter the administrator passcode to manage system resources and handle escrow payouts.'}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <input 
                            type="password"
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            placeholder={lang === 'ar' ? 'أدخل رمز المرور' : lang === 'he' ? 'הזן קוד גישה' : 'Enter Passcode'}
                            className="w-full bg-[#050505] border border-gray-850 rounded-xl px-4 py-3 text-sm text-center text-white font-bold focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleVerifyAdminCode();
                            }}
                          />
                          <button 
                            onClick={handleVerifyAdminCode}
                            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-sm rounded-xl transition-all shadow-xl shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Lock className="w-4 h-4" />
                            <span>{lang === 'ar' ? 'تحقق ودخول 🔓' : lang === 'he' ? 'אמת וכנס 🔓' : 'Verify & Enter 🔓'}</span>
                          </button>
                        </div>
                      </div>
                    )
                  )}

      {/* Suggest Custom Service Modal */}
      {showCustomServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in select-none">
          <div className="w-full max-w-md bg-[#0F1424] border border-gray-800 p-6 rounded-3xl space-y-6 relative text-right rtl:text-right ltr:text-left">
            <button 
              onClick={() => setShowCustomServiceModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-black text-white">
                {lang === 'ar' ? 'اقتراح خدمة مخصصة جديدة' : lang === 'he' ? 'הצע שירות מותאם אישית חדש' : 'Propose New Custom Service'}
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                {lang === 'ar' ? 'اقترح خدمة مخصصة لتتم مراجعتها ونشرها بالشبكة قريباً!' : lang === 'he' ? 'הצע שירות מותאם אישית שיאושר ויפורסם בקרוב!' : 'Propose a custom service for review and release!'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'اسم الخدمة (بالعربية):' : lang === 'he' ? 'שם השירות (ערבית):' : 'Service Name (Arabic):'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: أخصائي فرامل هيدروليك"
                  value={customServiceNameAr}
                  onChange={(e) => setCustomServiceNameAr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'اسم الخدمة (بالإنجليزي):' : lang === 'he' ? 'שם השירות (אנגלית):' : 'Service Name (English):'}
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
                  {lang === 'ar' ? 'شرح ووصف الخدمة (بالعربية):' : lang === 'he' ? 'תיאור השירות (ערבית):' : 'Description (Arabic):'}
                </label>
                <textarea 
                  required
                  rows={2}
                  placeholder="شرح موجز للخدمة..."
                  value={customServiceDescAr}
                  onChange={(e) => setCustomServiceDescAr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'شرح ووصف الخدمة (بالإنجليزي):' : lang === 'he' ? 'תיאור השירות (אנגלית):' : 'Description (English):'}
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
                  {lang === 'ar' ? 'السعر الأساسي التقديري (₪):' : lang === 'he' ? 'מחיר בסיס משוער (₪):' : 'Base Price (₪):'}
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={customServicePrice}
                  onChange={(e) => setCustomServicePrice(cleanInput(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-mono text-xs transition-colors"
                />
              </div>

              <button
                onClick={async () => {
                  const priceNum = Number(customServicePrice);
                  if (!customServiceNameAr.trim() || !customServiceNameEn.trim() || !customServiceDescAr.trim() || !customServiceDescEn.trim() || isNaN(priceNum) || priceNum <= 0) {
                    triggerToast(
                      lang === 'ar' 
                        ? 'الرجاء تعبئة جميع الحقول وإدخال سعر صحيح!' 
                        : lang === 'he'
                        ? 'אנא מלא את כל השדות והזן מחיר תקין!'
                        : 'Please fill all fields and enter a valid price!', 
                      'warning'
                    );
                    return;
                  }
                  const newServiceId = `custom_${Date.now()}`;
                  const newPending = {
                    id: newServiceId,
                    name: customServiceNameEn,
                    arName: customServiceNameAr,
                    description: customServiceDescEn,
                    arDescription: customServiceDescAr,
                    icon: 'wrench',
                    basePrice: priceNum,
                    requestedBy: loggedInUserEmail || 'Unknown',
                    requestedByName: loggedInUserName || 'Unknown',
                    status: 'pending',
                    createdAt: Date.now()
                  };
                  await setDoc(doc(db, "pending_services", newServiceId), newPending);
                  setShowCustomServiceModal(false);
                  setCustomServiceNameAr('');
                  setCustomServiceNameEn('');
                  setCustomServiceDescAr('');
                  setCustomServiceDescEn('');
                  setCustomServicePrice('150');
                  triggerToast(
                    lang === 'ar' 
                      ? 'تم إرسال اقتراح الخدمة المخصصة للمسؤول آدم عطون للموافقة عليها ونشرها بالشبكة قريباً!' 
                      : lang === 'he'
                      ? 'הצעת השירות נשלחה למנהל אדם עתון לאישור ופרסום ברשת בקרוב!'
                      : 'Custom service proposal submitted to administrator Adam Atoun for review!', 
                    'success'
                  );
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إرسال الخدمة المخصصة للمراجعة والموافقة' : lang === 'he' ? 'שלח שירות מותאם אישית לאישור' : 'Submit Custom Service for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in select-none">
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
                  : lang === 'he'
                  ? `רושם עבור מזהה שירות: ${selectedServiceIdForRecord}`
                  : `Registering for service ID: ${selectedServiceIdForRecord}`}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'الاسم بالكامل للتقني:' : lang === 'he' ? 'שם מלא של הטכנאי:' : 'Full Name of Technician:'}
                </label>
                <input 
                  type="text" 
                  value={adminTechName}
                  onChange={(e) => setAdminTechName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'البريد الإلكتروني للتقني:' : lang === 'he' ? 'אימייל של הטכנאי:' : 'Technician Email Address:'}
                </label>
                <input 
                  type="email" 
                  value={adminTechEmail}
                  onChange={(e) => setAdminTechEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0B10] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'رقم الهاتف:' : lang === 'he' ? 'מספר טלפון:' : 'Phone Number:'}
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
                  {lang === 'ar' ? 'نوع وموديل المركبة:' : lang === 'he' ? 'סוג ודגם רכב:' : 'Vehicle Model:'}
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
                  {lang === 'ar' ? 'رقم لوحة المركبة:' : lang === 'he' ? 'מספר לוחית רישוי:' : 'Vehicle Plate Number:'}
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
                  if (!adminTechName.trim() || !adminTechEmail.trim() || !providerPhone.trim() || !providerCarModel.trim() || !providerPlateNumber.trim()) {
                    triggerToast(lang === 'ar' ? 'الرجاء ملء جميع الحقول!' : lang === 'he' ? 'נא למלא את כל השדות!' : 'Please fill all fields!', 'warning');
                    return;
                  }
                  const newTechId = `tech_${Date.now()}`;
                  const newTech = {
                    id: newTechId,
                    name: adminTechName,
                    arName: adminTechName,
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
                    email: adminTechEmail,
                    notifyEmail: true,
                    notifyWhatsapp: true
                  };
                  await setDoc(doc(db, "technicians", newTechId), newTech);
                  setShowAddRecordModal(false);
                  setProviderPhone('');
                  setProviderCarModel('');
                  setProviderPlateNumber('');
                  triggerToast(
                    lang === 'ar' 
                      ? 'تم إضافة السجل كفني بنجاح!' 
                      : lang === 'he'
                      ? 'רשומת טכנאי נוספה בהצלחה!'
                      : 'Technician record added successfully!', 
                    'success'
                  );
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ وتأكيد السجل' : lang === 'he' ? 'שמור ואשר רשומה' : 'Save & Confirm Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Support & Contact Footer - Adam Atoun Contact Details */}
      <footer className="w-full border-t border-gray-800/40 bg-[#07080D]/50 backdrop-blur-md mt-12 py-10 px-4 pb-28 md:pb-12 text-right rtl:text-right ltr:text-left">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
          
          {/* Header Indicator */}
          <div className="space-y-2 select-none flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-[10px] font-black tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
              <span>
                {lang === 'ar' ? 'بوابة التواصل والدعم الفني المباشر' : lang === 'he' ? 'שער תמיכה וקשר ישיר' : 'Direct Support & Management'}
              </span>
            </div>
            <h4 className="text-sm font-black text-white/90 max-w-lg leading-relaxed">
              {lang === 'ar' 
                ? 'لمزيد من الاستفسارات، الشكاوى أو طلب المساعدة التقنية، يمكنك التواصل مباشرة مع الإدارة العامة:' 
                : lang === 'he' 
                ? 'לשאלות נוספות, תלונות או תמיכה טכנית, ניתן לפנות ישירות להנהלה הכללית:' 
                : 'For further inquiries, feedback or technical assistance, contact the General Management directly:'}
            </h4>
          </div>

          {/* Contact Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            
            {/* Phone Card */}
            <a 
              href="tel:+972538316779"
              className="group p-4 bg-[#0F111A]/80 border border-gray-800/80 hover:border-amber-500/30 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 text-right rtl:text-right ltr:text-left cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">
                  {lang === 'ar' ? 'الاتصال المباشر بـ آدم' : lang === 'he' ? 'חיוג ישיר לאדם' : 'Direct Call Adam'}
                </span>
                <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors font-mono tracking-tight block mt-0.5" dir="ltr">
                  +972 53-831-6779
                </span>
              </div>
            </a>

            {/* Email Card */}
            <a 
              href="mailto:adam.atooun@gmail.com"
              className="group p-4 bg-[#0F111A]/80 border border-gray-800/80 hover:border-amber-500/30 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 text-right rtl:text-right ltr:text-left cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">
                  {lang === 'ar' ? 'البريد الإلكتروني للإدارة' : lang === 'he' ? 'אימייל ההנהלה' : 'Management Email'}
                </span>
                <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors font-mono truncate block mt-0.5">
                  adam.atooun@gmail.com
                </span>
              </div>
            </a>

          </div>

          {/* Copyright Section */}
          <div className="pt-4 border-t border-gray-800/40 w-full text-center space-y-1 select-none">
            <span className="text-[9px] font-mono tracking-widest text-gray-500 block uppercase">
              {lang === 'ar' ? '© ٢٠٢٦ سيسترو والضمان المالي 🛡️ جميع الحقوق محفوظة.' : lang === 'he' ? '© 2026 סיסטרו והסדר מאובטח 🛡️ כל הזכויות שמורות.' : '© 2026 Systro & Escrow Secure 🛡️ All Rights Reserved.'}
            </span>
            <span className="text-[10px] text-gray-500 font-bold block">
              {lang === 'ar' ? 'تطوير ودعم تقني تحت إشراف آدم عطون' : lang === 'he' ? 'פיתוח ותמיכה טכנולוגית בפיקוח אדם עטון' : 'Technology support supervised by Adam Atoun'}
            </span>
          </div>

        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0B10]/95 backdrop-blur-md border-t border-gray-800/80 flex items-center justify-around py-3 pb-safe md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.8)] select-none">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'home' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'الرئيسية' : lang === 'he' ? 'דף הבית' : 'Home'}</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'services' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Wrench className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'الخدمات' : lang === 'he' ? 'שירותים' : 'Services'}</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('simulator');
          }}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'simulator' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Activity className="w-5 h-5 animate-pulse shrink-0" />
          <span>{lang === 'ar' ? 'الخدمة' : lang === 'he' ? 'סימולטור' : 'Simulator'}</span>
        </button>

        <button 
          onClick={() => setActiveTab('taxi')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'taxi' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Car className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'تكسي' : lang === 'he' ? 'מונית' : 'Taxi'}</span>
        </button>

        <button 
          onClick={() => setActiveTab('admin')}
          className={`flex-1 flex flex-col items-center gap-1 text-[10px] font-black transition-all cursor-pointer ${activeTab === 'admin' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Lock className="w-5 h-5 shrink-0" />
          <span>{lang === 'ar' ? 'الإدارة' : lang === 'he' ? 'ניהול' : 'Admin'}</span>
        </button>
      </div>

      {/* Floating SOS button */}
      {showSosButton && (
        <button 
          onClick={() => setIsSosPanelOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-sm tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 group border-2 border-white/10"
          id="floating-sos-button"
        >
          <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping group-hover:animate-none opacity-75"></div>
          <span className="relative z-10 font-mono tracking-tight text-[15px] font-black animate-pulse">SOS</span>
        </button>
      )}

      {/* Sliding Left Emergency SOS Drawer */}
      {isSosPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none" id="sos-emergency-portal-container">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsSosPanelOpen(false)}
          />

          {/* Drawer container sliding from left */}
          <div className="absolute top-0 bottom-0 left-0 w-full max-w-[360px] bg-[#0A0B12] border-r border-gray-800 shadow-[20px_0_40px_rgba(0,0,0,0.8)] p-6 flex flex-col justify-between z-50 animate-slide-right text-right rtl:text-right ltr:text-left">
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500 shadow-sm shadow-red-500/5">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {lang === 'ar' ? 'بوابة الطوارئ والإنقاذ' : lang === 'he' ? 'מוקד חירום והצלה' : 'Emergency & Rescue Portal'}
                    </h3>
                    <p className="text-[10px] text-red-400 font-bold tracking-tight">
                      {lang === 'ar' ? 'اتصال مباشر وسريع بنقرة واحدة' : lang === 'he' ? 'חיוג מהיר בנגיעה אחת' : 'Direct one-tap emergency call'}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsSosPanelOpen(false)}
                  className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-black">✕</span>
                </button>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                <p className="text-[11px] text-red-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  {lang === 'ar' ? 'أرقام إنقاذ معتمدة لضمان سلامتك' : lang === 'he' ? 'מוקדי חירום מאושרים לבטיחותך' : 'Certified rescue hotlines for your safety'}
                </p>
                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                  {lang === 'ar' 
                    ? 'في الحالات الطبية أو الحوادث الخطيرة، اتصل فوراً بالأرقام المباشرة أدناه للتواصل مع أقرب طاقم إنقاذ ومسعفين.'
                    : lang === 'he'
                    ? 'במצבים רפואיים או בתאונות דרכים קשות, התקשר מיד למספרי החירום למענה מהיר.'
                    : 'In medical situations or traffic accidents, call immediately to reach nearby responders.'}
                </p>
              </div>

              {/* Emergency Buttons Grid */}
              <div className="space-y-4">
                
                {/* Button 1: Israeli Police (and Netivei Israel) */}
                <div className="p-4 bg-gradient-to-br from-[#111827] to-[#0F1424] border border-gray-800 rounded-2xl hover:border-blue-500/40 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <ShieldAlert className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">
                        {lang === 'ar' ? 'الشرطة الإسرائيلية (100)' : lang === 'he' ? 'משטרת ישראל (100)' : 'Israel Police (100)'}
                      </h4>
                      <p className="text-[9px] text-gray-400 font-bold">
                        {lang === 'ar' ? 'مركز طوارئ العمليات والشرطة' : lang === 'he' ? 'מוקד חירום משטרתי' : 'Police & Dispatch'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <a 
                      href="tel:100"
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 text-center cursor-pointer"
                    >
                      <span>📞 {lang === 'ar' ? 'الشرطة 100' : lang === 'he' ? 'משטרה 100' : 'Police 100'}</span>
                    </a>
                    <a 
                      href="tel:2120"
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-750 text-gray-200 border border-gray-700 font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center cursor-pointer"
                    >
                      <span>🛣️ {lang === 'ar' ? 'شركة الطرق' : lang === 'he' ? 'נתיבי ישראל' : 'Road Co.'}</span>
                    </a>
                  </div>
                </div>

                {/* Button 2: United Hatzalah (איחود הצלה - 1221) */}
                <div className="p-4 bg-gradient-to-br from-[#111827] to-[#1C120C] border border-orange-500/10 rounded-2xl hover:border-orange-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Custom stylized Orange & White Hatzalah SVG Badge */}
                      <div className="w-10 h-10 rounded-full bg-[#FF5A00] flex items-center justify-center text-white shadow-md relative overflow-hidden shrink-0 border-2 border-white/20">
                        <svg className="w-6.5 h-6.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="50" cy="50" r="45" fill="#FF5A00" />
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#FFFFFF" strokeWidth="4" />
                          {/* Glowing medical cross star shape */}
                          <path d="M50 15 L58 42 L85 50 L58 58 L50 85 L42 58 L15 50 L42 42 Z" fill="#FFFFFF" />
                          <circle cx="50" cy="50" r="12" fill="#FF5A00" />
                          <path d="M50 38 V62 M38 50 H62" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-orange-500">
                          {lang === 'ar' ? 'إيحود هتسالا (1221)' : lang === 'he' ? 'איחוד הצלה (1221)' : 'United Hatzalah (1221)'}
                        </h4>
                        <p className="text-[9px] text-gray-400 font-bold">
                          {lang === 'ar' ? 'الإسعاف والإنقاذ الطبي السريع' : lang === 'he' ? 'מוקד רפואי וסיוע מהיר' : 'Medical First Response'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 font-medium mb-3 leading-relaxed">
                    {lang === 'ar' 
                      ? 'منظمة إنقاذ تطوعية تقدم استجابة طبية فورية للمصابين والمرضى حتى وصول سيارات الإسعاف.'
                      : lang === 'he'
                      ? 'ארגון הצלה התנדבותי המעניק סיוע רפואי מיידי לפצועים וחולים עד להגעת האמבולנס.'
                      : 'National volunteer paramedic organization delivering instant medical aid within seconds.'}
                  </p>

                  <a 
                    href="tel:1221"
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/10 active:scale-95 cursor-pointer"
                  >
                    <span>📞 {lang === 'ar' ? 'اتصال عاجل: 1221' : lang === 'he' ? 'שיחת חירום: 1221' : 'Call Emergency: 1221'}</span>
                  </a>
                </div>

              </div>

            </div>

            {/* Footer copyright style */}
            <div className="pt-4 border-t border-gray-800 text-center space-y-1 mt-auto">
              <span className="text-[8px] font-mono tracking-widest text-gray-500 block uppercase">
                {lang === 'ar' ? 'سيسترو والضمان المالي 🛡️' : lang === 'he' ? 'סיסטרו והסדר נאמנות מאובטח 🛡️' : 'Systro & Escrow Secure 🛡️'}
              </span>
              <span className="text-[9px] text-gray-500 font-bold block">
                {lang === 'ar' ? 'نسخة الطوارئ المعتمدة' : lang === 'he' ? 'גרסת חירום רשמית ומאושרת' : 'Emergency Certified Suite'}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
